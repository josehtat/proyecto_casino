const socketHandler = (io) => {

    const rooms = {}; // Almacena las salas activas
    const chatMessages = {}; // Almacena los mensajes de chat por sala

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
        // //lógica de gestion de salas

        // --- Crear una nueva sala (pública o privada) ---
        socket.on("createRoom", (nickname, isPrivate) => {
            const roomCode = Math.random().toString(36).substring(2, 7);
            rooms[roomCode] = { players: [], maxPlayers: 8, private: isPrivate };
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
                nickname: nickname || "Jugador",
                // nombre: socket.session?.user?.nombre || "Jugador"
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
        })

        // --- Enviar lista de salas públicas ---
        socket.on("getRooms", () => {
            broadcastRoomList();
        });

        // --- Desconexión: eliminar jugador de todas las salas y limpiar vacías ---
        socket.on("disconnect", () => {
            for (const roomCode in rooms) {
                const room = rooms[roomCode];
                // Verificar si el jugador estaba en esta sala
                const wasInRoom = room.players.some(player => player.id === socket.id);
                // Notificar al resto de la sala
                if (wasInRoom) {
                    socket.to(roomCode).emit("playerDisconnected", socket.id);
                }
                // Eliminar sala si está vacía
                room.players = room.players.filter(player => player.id !== socket.id);
                if (room.players.length === 0) {
                    console.log(`Sala ${roomCode} eliminada por estar vacía`);
                    delete rooms[roomCode];
                    // Limpiar mensajes de chat
                    delete chatMessages[roomCode];
                }
            }
            broadcastRoomList();
        });

        // lógica del chat

        // Escuchar mensajes del chat
        socket.on("chatMessageToServer", ({ roomCode, nickname, text }) => {
            const room = rooms[roomCode];
            // Verificar si el mensaje no está vacío
            console.log("Mensaje recibido:", text);
            const trimmedText = text.trim();
            if (!room) return;
            // almacenar los mensajes en la sala
            chatMessages[roomCode] = chatMessages[roomCode] || [];
            chatMessages[roomCode].push({
                id: socket.id,
                nickname: nickname || "Jugador",
                text: trimmedText
            });
            // Limitar el número de mensajes almacenados
            if (chatMessages[roomCode].length > 100) {
                chatMessages[roomCode].shift(); // Eliminar el mensaje más antiguo
            }
            // Emitir el mensaje a todos en la sala (incluido el emisor)
            io.to(roomCode).emit("chatMessageToRoom", {
            id: socket.id,
            nickname: nickname || "Jugador",
            text: trimmedText
            });
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