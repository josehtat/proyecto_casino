// server.js (Usando ES Modules)
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import connectDB from "./database.js";
import { sequelize } from "./database.js";
import socketHandler from "./socket.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import session from "express-session";
import ViteExpress from "vite-express";

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

//configuración de session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//servir ficheros estaticos
// app.get('/', (req, res) => {
//     res.sendFile(`${__dirname}/index.html`);
//   });

//recibir post de login
app.post('/auth', function (request, response) {
  // Si no es AJAX, denegar el acceso
  if (request.headers['x-requested-with'] !== 'XMLHttpRequest') {
    return response.status(403).send('Access denied');
  }
  let username = request.body.username;
  let password = request.body.password;
  let room = request.body.room;

  if (username && password) {
    sequelize.query('SELECT * FROM users WHERE username = :username AND password = :password', {
      replacements: { username, password }
    })
      .then(results => {
        if (results[0].length > 0) {
          console.log('usuario logueado: ', results[0]);
          request.session.loggedin = true;
          request.session.username = username;
          request.session.nickname = results[0][0].nickname;

          // Enviar respuesta JSON indicando éxito
          response.json({ success: true, room });
        } else {
          // Enviar respuesta JSON indicando error
          response.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
      })
      .catch(error => {
        console.error('Error authenticating user:', error);
        response.status(500).json({ success: false, message: 'Internal Server Error' });
      });
  } else {
    response.status(400).json({ success: false, message: 'Por favor, complete ambos campos' });
  }
});

app.post('/register', async (request, response) => {
  const { username, password } = request.body;
  const nickname = request.body.nickname || username;
  const score = request.body.score || 100;

  if (username && password) {
    try {
      // Verificar si el usuario ya existe
      const [existingUser] = await sequelize.query('SELECT * FROM users WHERE username = :username', {
        replacements: { username },
      });

      if (existingUser.length > 0) {
        return response.status(400).send('El usuario ya existe.');
      }

      // Insertar el nuevo usuario en la base de datos
      await sequelize.query('INSERT INTO users (username, password, nickname, score) VALUES (:username, :password, :nickname, :score)', {
        replacements: { username, password, nickname, score },
      });

      response.send('Usuario registrado exitosamente.');
    } catch (error) {
      console.error('Error registrando usuario:', error);
      response.status(500).send('Error interno del servidor.');
    }
  } else {
    response.status(400).send('Por favor, completa todos los campos.');
  }
});

// app.get('/', function(request, response) {
// 	// If the user is loggedin
// 	if (request.session.loggedin) {
//     response.redirect('index.html');
// 	} else {
// 		// Not logged in
//     response.redirect('login.html');
// 	}
// 	response.end();
// });

app.get('/getSession', function (request, response) {
  if (request.session.loggedin) {
    response.send({
      loggedin: true,
      username: request.session.username,
      nickname: request.session.nickname
    });
  } else {
    response.send({ loggedin: false });
  }
});

const vite = await createViteServer({
  server: {
    middlewareMode: true,
    hmr: {
      server
    }
  },
});
app.use(vite.middlewares);

// Servir index.html desde la raíz del proyecto
// app.get("/", async (req, res) => {
//   const htmlPath = fileURLToPath(new URL('../index.html', import.meta.url)); // Ruta absoluta a index.html en la raíz
//   const html = await vite.transformIndexHtml(req.url, await import('fs').promises.readFile(htmlPath, 'utf-8'));
//   res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
// });

// Escuchar el evento updateScore para actualizar la puntuación del jugador
io.on('connection', (socket) => {
  socket.on('updateScore', async ({ nickname, score }) => {
    console.log(`Evento updateScore recibido: nickname=${nickname}, score=${score}`);
    try {
      // Actualizar la puntuación del jugador en la base de datos
      await sequelize.query(
        'UPDATE users SET score = score + :score WHERE nickname = :nickname',
        {
          replacements: { score, nickname },
        }
      );
      console.log(`Puntuación actualizada para ${nickname}: +${score}`);
      socket.emit('scoreUpdated', { success: true, nickname, score });
    } catch (error) {
      console.error('Error al actualizar la puntuación:', error);
      socket.emit('scoreUpdated', { success: false, error: error.message });
    }
  });
});

// Conectar DB y configurar sockets
await connectDB(); // Asegurar que la base de datos esté conectada antes de usarla
socketHandler(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
