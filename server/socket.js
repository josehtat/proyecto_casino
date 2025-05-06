const socketHandler = (io) => {

    const rooms = {}; // Almacena las salas activas

    io.on("connection", (socket) => {
        console.log("Nuevo jugador conectado:", socket.id);

        socket.on("movement", ({ roomCode, x, y, direction, isMoving }) => {
            const room = rooms[roomCode];
            if (!room) return;

            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.x = x;
                player.y = y;
                player.direction = direction;
                player.isMoving = isMoving;
            }

            // Enviar solo a los demás jugadores
            socket.to(roomCode).emit("movementUpdate", {
                id: socket.id,
                x,
                y,
                direction,
                isMoving
            });
        });

        // --- Crear una nueva sala (pública o privada) ---
        socket.on("createRoom", (nickname, isPrivate) => {
            const roomCode = Math.random().toString(36).substring(2, 7);
            rooms[roomCode] = {
                players: [],
                maxPlayers: 8,
                private: isPrivate,
                chatMessages: [], // Mover chatMessages dentro de la sala
                tables: {
                    Blackjack1: {
                        players: [],
                        readyStatus: {},
                        inGame: false
                    },
                    Blackjack2: {
                        players: [],
                        readyStatus: {},
                        inGame: false
                    }
                }
            };
            console.log("Sala creada:", roomCode, rooms[roomCode]);

            // Unirse automáticamente tras crearla
            const player = { id: socket.id, x: 400, y: 400, nickname: nickname || "Jugador" };
            rooms[roomCode].players.push(player);
            socket.join(roomCode);

            socket.emit("roomJoined", roomCode);
            broadcastRoomList();
        });

        // --- Unirse a una sala existente ---
        socket.on("joinRoom", (roomCode, nickname) => {
            if (!rooms[roomCode]) {
                return socket.emit("roomError", "Sala no encontrada");
            }
            if (rooms[roomCode].players.length >= rooms[roomCode].maxPlayers) {
                return socket.emit("roomError", "Sala llena");
            }

            const player = {
                id: socket.id,
                x: 400,
                y: 400,
                nickname: nickname || "Jugador"
            };

            rooms[roomCode].players.push(player);
            socket.join(roomCode);
            console.log(`Jugador ${socket.id} unido a sala ${roomCode}`);

            // Notificar a los demás
            socket.to(roomCode).emit("newPlayer", player);

            socket.emit("roomJoined", roomCode);
            broadcastRoomList();
        });

        // Enviar todos los jugadores de la sala
        socket.on("getPlayers", (roomCode) => {
            const room = rooms[roomCode];
            if (!room) {
                return socket.emit("roomError", "Sala no encontrada");
            }
            socket.emit("playersList", room.players);
        });

        // Enviar lista inicial de salas disponibles
        socket.on("getRooms", () => {
            broadcastRoomList();
        }
        );

        // --- Desconexión: eliminar jugador de todas las salas y limpiar vacías ---
        socket.on("disconnect", () => {
            for (const roomCode in rooms) {
                const room = rooms[roomCode];

                // Verificar si el jugador estaba en una mesa
                for (const tableName in room.tables) {
                    const table = room.tables[tableName];

                    // Verificar si el jugador está en esta mesa
                    const wasInTable = table.players.some(player => player.id === socket.id);
                    if (wasInTable) {
                        // Eliminar al jugador de la mesa
                        table.players = table.players.filter(player => player.id !== socket.id);
                        delete table.readyStatus[socket.id];

                        console.log(`Jugador ${socket.id} eliminado de la mesa ${tableName} en sala ${roomCode}`);
                        console.log(`Jugadores restantes en la mesa ${tableName}:`, table.players);

                        // Notificar a todos en la sala que el jugador se ha desconectado de esta mesa
                        io.to(roomCode).emit('blackjackPlayerLeft', { tableName, playerId: socket.id });

                        // Verificar si todos los jugadores restantes están listos
                        const allReady = table.players.every(player => table.readyStatus[player.id]);
                        if (allReady && table.players.length > 0) {
                            console.log(`Todos los jugadores restantes en la mesa ${tableName} están listos. Comenzando la partida.`);
                            io.to(roomCode).emit('blackjackGameStart', { tableName });
                            table.inGame = true; // Marcar la mesa como en juego
                        }
                    }
                }

                // Verificar si el jugador estaba en esta sala
                const wasInRoom = room.players.some(player => player.id === socket.id);
                if (wasInRoom) {
                    // Notificar al resto de la sala
                    socket.to(roomCode).emit("playerDisconnected", socket.id);
                }

                // Eliminar al jugador de la sala general
                room.players = room.players.filter(player => player.id !== socket.id);

                // Eliminar la sala si está vacía
                if (room.players.length === 0) {
                    console.log(`Sala ${roomCode} eliminada por estar vacía`);
                    delete rooms[roomCode];
                }
            }

            // Actualizar la lista de salas
            broadcastRoomList();
        });

        // --- Lógica del chat ---
        socket.on("chatMessageToServer", ({ roomCode, nickname, text }) => {
            const room = rooms[roomCode];
            if (!room) return;

            const trimmedText = text.trim();
            if (!trimmedText) return;

            // Almacenar el mensaje en la sala
            room.chatMessages.push({
                id: socket.id,
                nickname: nickname || "Jugador",
                text: trimmedText
            });

            // Limitar el número de mensajes almacenados
            if (room.chatMessages.length > 100) {
                room.chatMessages.shift(); // Eliminar el mensaje más antiguo
            }

            // Emitir el mensaje a todos en la sala (incluido el emisor)
            io.to(roomCode).emit("chatMessageToRoom", {
                id: socket.id,
                nickname: nickname || "Jugador",
                text: trimmedText
            });
        });

        // Enviar lista de mensajes al unirse a la sala
        socket.on("getChatMessages", (roomCode) => {
            const room = rooms[roomCode];
            if (!room) return;

            socket.emit("chatMessagesList", room.chatMessages);
        }
        );

        // --- Eventos de la mesa de Blackjack ---
        // max 4 jugadores por mesa
        socket.on('blackjackJoinTable', (roomCode, tableName, nickname) => {
            const room = rooms[roomCode];
            if (!room) return socket.emit('blackjackTableError', 'Sala no encontrada');

            const table = room.tables[tableName];
            if (!table) return socket.emit('blackjackTableError', 'Mesa no encontrada');

            // Verificar si el jugador ya está en la mesa
            const alreadyJoined = table.players.find((p) => p.id === socket.id);
            if (alreadyJoined) {
                console.log(`El jugador ${socket.id} ya está en la mesa ${tableName}`);
                return socket.emit('blackjackTableJoined', tableName, table.players, table.readyStatus);
            }

            // Verificar si la mesa está llena
            if (table.players.length >= 4) {
                return socket.emit('blackjackTableError', 'Mesa llena');
            }

            // Agregar al jugador a la mesa
            const player = { id: socket.id, nickname };
            table.players.push(player);
            table.readyStatus[socket.id] = false; // Estado inicial: no listo

            console.log(`El jugador ${socket.id} se unió a la mesa ${tableName}`);
            console.log(`Jugadores en la mesa ${tableName}:`, table.players);

            // Notificar a todos en la sala que un jugador se unió a la mesa
            io.to(roomCode).emit('blackjackPlayerJoined', { tableName, player });

            // Enviar la lista actualizada de jugadores y su estado al jugador que se unió
            socket.emit('blackjackTableJoined', tableName, table.players, table.readyStatus);
        });

        socket.on('blackjackLeaveTable', (roomCode, tableName) => {
            const room = rooms[roomCode];
            if (!room) {
                return socket.emit('blackjackTableError', 'Sala no encontrada');
            }

            const table = room.tables[tableName];
            if (!table) {
                return socket.emit('blackjackTableError', 'Mesa no encontrada');
            }

            // Eliminar al jugador de la mesa
            table.players = table.players.filter((player) => player.id !== socket.id);
            delete table.readyStatus[socket.id];

            console.log(`El jugador ${socket.id} salió de la mesa ${tableName}`);
            console.log(`Jugadores restantes en la mesa ${tableName}:`, table.players);

            // Notificar al resto de los jugadores en la sala que un jugador salió
            io.to(roomCode).emit('blackjackPlayerLeft', { tableName: tableName, playerId: socket.id });

            // Verificar si todos los jugadores restantes están listos
            const allReady = table.players.every(player => table.readyStatus[player.id]);
            if (allReady && table.players.length > 0) {
                console.log(`Todos los jugadores restantes en la mesa ${tableName} están listos. Comenzando la partida.`);
                io.to(roomCode).emit('blackjackGameStart', { tableName });
                table.inGame = true; // Marcar la mesa como en juego
            }

            // Enviar confirmación al jugador que salió
            socket.emit('blackjackTableLeft', tableName);
        });

        socket.on('blackjackSetReady', (roomCode, tableName, isReady) => {
            const room = rooms[roomCode];
            if (!room) return socket.emit('blackjackTableError', 'Sala no encontrada');

            const table = room.tables[tableName];
            if (!table) return socket.emit('blackjackTableError', 'Mesa no encontrada');

            // Actualizar el estado de preparación del jugador
            table.readyStatus[socket.id] = isReady;

            console.log(`Jugador ${socket.id} en la mesa ${tableName} está ${isReady ? 'Listo' : 'No Listo'}`);

            // Notificar a todos los jugadores de la mesa el estado actualizado
            io.to(roomCode).emit('blackjackPlayerReadyStatus', { tableName, playerId: socket.id, isReady });

            // Verificar si todos los jugadores están listos
            const allReady = table.players.every(player => table.readyStatus[player.id]);
            if (allReady && table.players.length > 0) {
                console.log(`Todos los jugadores en la mesa ${tableName} están listos. Comenzando la partida.`);
                io.to(roomCode).emit('blackjackGameStart', { tableName });
                // Iniciar el juego
                startBlackjackGame(roomCode, tableName);
                table.inGame = true; // Marcar la mesa como en juego
            }
        });

        function startBlackjackGame(roomCode, tableName) {
            console.log(`Iniciando juego de Blackjack en la mesa ${tableName}...`);
            const room = rooms[roomCode];
            if (!room) return;

            const table = room.tables[tableName];
            if (!table) return;

            // Crear el estado del juego
            table.gameState = {
            deck: createDeck(), // Crear y barajar el mazo
            players: {}, // Cartas de los jugadores
            dealer: [], // Cartas de la banca
            standStatus: {} // Estado de "Plantado" de los jugadores
            };

            // Repartir dos cartas a cada jugador y a la banca
            table.players.forEach(player => {
            table.gameState.players[player.id] = [table.gameState.deck.pop(), table.gameState.deck.pop()];
            table.gameState.standStatus[player.id] = false; // Inicializar como "No plantado"
            });
            table.gameState.dealer = [table.gameState.deck.pop(), table.gameState.deck.pop()];

            console.log(`Juego iniciado en la mesa ${tableName}`);
            console.log('Estado inicial del juego:', table.gameState);

            // Notificar a los jugadores el estado inicial del juego
            io.to(roomCode).emit('blackjackGameState', {
            tableName: tableName,
            players: table.gameState.players,
            dealer: [table.gameState.dealer[0]], // Mostrar solo la primera carta de la banca
            standStatus: table.gameState.standStatus
        });
        }

        function resolveGameBlackjack(roomCode, tableName) {
            const room = rooms[roomCode];
            const table = room.tables[tableName];
            const gameState = table.gameState;
        
            // Jugar la mano de la banca
            while (calculateHandValueBlackjack(gameState.dealer) < 17) {
                gameState.dealer.push(gameState.deck.pop());
            }
        
            const dealerValue = calculateHandValueBlackjack(gameState.dealer);
            console.log(`Valor de la banca: ${dealerValue}`);
        
            // Determinar el resultado para cada jugador
            const results = {};
            table.players.forEach(player => {
                const playerValue = calculateHandValueBlackjack(gameState.players[player.id]);
                if (playerValue > 21 || (dealerValue <= 21 && dealerValue >= playerValue)) {
                    results[player.id] = 'Perdió';
                } else if (playerValue === dealerValue) {
                    results[player.id] = 'Empate';
                } else {
                    results[player.id] = 'Ganó';
                }
            });
        
            console.log('Resultados:', results);
        
            // Notificar a los jugadores los resultados
            io.to(roomCode).emit('blackjackGameResults', {
                tableName: tableName,
                dealer: gameState.dealer,
                results
            });
        
            // Reiniciar el estado de la mesa
            table.readyStatus = {}; // Reiniciar el estado de preparación de los jugadores
            table.inGame = false; // Marcar la mesa como no en juego
        
            // Limpiar el estado del juego
            delete table.gameState;
        
            console.log(`Mesa ${tableName} reiniciada. Lista para una nueva partida.`);
        }

        socket.on('blackjackHit', ({ roomCode, tableName }) => {
            const room = rooms[roomCode];
            if (!room) return;

            const table = room.tables[tableName];
            if (!table || !table.gameState) return;

            const playerCards = table.gameState.players[socket.id];
            if (!playerCards) return;

            // Dar una carta al jugador
            const card = table.gameState.deck.pop();
            playerCards.push(card);

            console.log(`Jugador ${socket.id} pidió carta:`, card);

            // Verificar si el jugador se pasó de 21
            const playerValue = calculateHandValueBlackjack(playerCards);
            if (playerValue > 21) {
                console.log(`Jugador ${socket.id} se pasó de 21`);
                table.gameState.standStatus[socket.id] = true; // Marcar como plantado automáticamente
            }

            // Notificar a todos los jugadores el estado actualizado
            io.to(roomCode).emit('blackjackGameState', {
                tableName: tableName,
                players: table.gameState.players,
                dealer: [table.gameState.dealer[0]], // Mostrar solo la primera carta de la banca
                standStatus: table.gameState.standStatus
            });

            // Verificar si todos los jugadores están plantados
            const allPlayersStand = table.players.every(player => table.gameState.standStatus[player.id]);
            if (allPlayersStand) {
                resolveGameBlackjack(roomCode, tableName);
            }
        });

        socket.on('blackjackStand', ({ roomCode, tableName }) => {
            const room = rooms[roomCode];
            if (!room) return;

            const table = room.tables[tableName];
            if (!table || !table.gameState) return;

            console.log(`Jugador ${socket.id} se plantó`);

            // Marcar al jugador como plantado
            table.gameState.standStatus[socket.id] = true;

            // Verificar si todos los jugadores están plantados
            const allPlayersStand = table.players.every(player => table.gameState.standStatus[player.id]);
            if (allPlayersStand) {
                resolveGameBlackjack(roomCode, tableName);
            }
        });
    });

    // --- Actualizar la lista de salas de forma dinámica ---
    function broadcastRoomList() {
        const publicRooms = Object.entries(rooms)
            .filter(([code, room]) => !room.private)
            .map(([code, room]) => ({
                code,
                players: room.players.length
            }));

        io.emit("roomListUpdated", publicRooms);
    }
};

// --- Crear un mazo de cartas ---
function createDeck() {
    const suits = ['C', 'D', 'H', 'P']; // Clubs, Diamonds, Hearts, Spades
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];

    suits.forEach(suit => {
        ranks.forEach(rank => {
            deck.push({ rank, suit });
        });
    });

    // Barajar el mazo
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

function calculateHandValueBlackjack(hand) {
    let value = 0;
    let aces = 0;

    hand.forEach(card => {
        if (['J', 'Q', 'K'].includes(card.rank)) {
            value += 10;
        } else if (card.rank === 'A') {
            value += 11;
            aces++;
        } else {
            value += parseInt(card.rank);
        }
    });

    // Ajustar el valor de los ases si es necesario
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}



export default socketHandler;