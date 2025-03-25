// server.js (Usando ES Modules)
import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import connectDB from "./database.js";
import socketHandler from "./socket.js";

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

// Conectar DB y configurar sockets
await connectDB(); // Asegurar que la base de datos esté conectada antes de usarla
socketHandler(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
