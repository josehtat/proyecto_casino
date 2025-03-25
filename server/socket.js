const socketHandler = (io) => {
    io.on("connection", (socket) => {
        console.log("Nuevo jugador conectado:", socket.id);

        socket.on("movimiento", (data) => {
            console.log("Movimiento recibido:", data);
            socket.broadcast.emit("actualizar", data);
        });

        socket.on("disconnect", () => {
            console.log("Jugador desconectado:", socket.id);
        });
    });
};

export default socketHandler;