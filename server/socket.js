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

                        // Notificar a todos en la sala que el jugador se ha desconectado de esta mesa
                        io.to(roomCode).emit('blackjackPlayerLeft', { tableName, playerId: socket.id });
                        console.log(`Jugador ${socket.id} eliminado de la mesa ${tableName} en sala ${roomCode}`);
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
                return socket.emit('blackjackTableJoined', tableName, table.players);
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

            // Enviar la lista actualizada de jugadores al jugador que se unió
            socket.emit('blackjackTableJoined', tableName, table.players);
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
            io.to(roomCode).emit('blackjackPlayerLeft', { tableName, playerId: socket.id });

            // Enviar confirmación al jugador que salió
            socket.emit('blackjackTableLeft', tableName);
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

export default socketHandler;