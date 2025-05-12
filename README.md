# proyecto-casino# Casino X
Casino X es un proyecto plantilla para hacer juegos en lobbies multijugador de navegador, desarrollado con el motor Phaser 3 y el bundler Vite con recarga rápida de módulos, la librería de gestión de websockets Socket.io y el backend NodeJS-Express. Integra los métodos más esenciales y unos cuantos ejemplos de juegos de cartas con los cuales podrás adaptar casi cualquier necesidad de tu proyecto, incluyendo login, sesiones, gestión de bases de datos en MySQL y un chat.

El proyecto está diseñado para ejecutarse en un entorno de producción con un servidor Node.js detrás de un proxy inverso (Apache) y utiliza Vite para gestionar los recursos del cliente.

---

## **Características**

- **Autenticación de Usuarios**:
  - Registro e inicio de sesión con validación de credenciales.
  - Gestión de sesiones con `express-session`.

- **Multijugador en Tiempo Real**:
  - Comunicación en tiempo real entre jugadores utilizando **Socket.IO**.
  - Salas públicas y privadas con un máximo de 8 jugadores por sala.
  - Sincronización de movimientos y acciones de los jugadores.

- **Juegos Disponibles**:
  - **Blackjack**: Mesa con hasta 4 jugadores.
  - **Poker**: Mesa con hasta 4 jugadores.
  - **Tragamonedas**: Interacción individual.

- **Chat en Tiempo Real**:
  - Chat integrado en las salas para comunicación entre jugadores.

- **Interfaz Gráfica**:
  - Gráficos en 2D con **Phaser 3**.
  - Animaciones personalizadas para los personajes.
  - Mapas diseñados con **Tiled**.

- **Backend**:
  - Servidor Node.js con Express.
  - Base de datos MySQL para almacenar usuarios y puntuaciones.
  - Gestión de lógica de juego en el servidor.

---

## **Estructura del Proyecto**

### **1. Cliente**

El cliente está desarrollado con **Phaser 3** y utiliza **Vite** para gestionar los recursos.

- **Carpeta `src`**:
  - **`index.html`**: Página de inicio de sesión.
  - **`game.html`**: Página principal del juego.
  - **`js/`**: Contiene los scripts de lógica del cliente.
  - **`scenes/`**: Escenas del juego (e.g., `MainGame.js`, `Chat.js`, `Blackjack.js`, `Poker.js`).
  - **`assets/`**: Recursos gráficos como sprites, mapas y cartas.

- **Archivo Principal**:
  - **`main.js`**: Configuración de Phaser y carga de escenas.

---

### **2. Servidor**

El servidor está desarrollado con **Node.js** y utiliza **Socket.IO** para la comunicación en tiempo real.

- **Carpeta `server`**:
  - **`server.js`**: Archivo principal del servidor.
  - **`database.js`**: Configuración y conexión a la base de datos MySQL.
  - **`socket.js`**: Lógica de eventos de Socket.IO.

- **Características del Servidor**:
  - Gestión de sesiones con `express-session`.
  - Rutas para autenticación (`/auth`) y registro (`/register`).
  - Lógica de juego para Blackjack y Poker.

---

### **3. Base de Datos**

La base de datos está configurada en MySQL y contiene las siguientes tablas principales:

- **`users`**:
  - `id`: Identificador único.
  - `username`: Nombre de usuario.
  - `password`: Contraseña (almacenada en texto plano, se recomienda usar hashing en producción).
  - `nickname`: Apodo del jugador.
  - `score`: Puntuación inicial (por defecto, 100).

---

## **Requisitos del Sistema**

1. **Servidor**:
   - Node.js v23.2.0 o superior.
   - MySQL 8.0 o superior.
   - Apache2 configurado como proxy inverso.

2. **Cliente**:
   - Navegador moderno compatible con WebSocket y ES6.

---

## **Instalación**

### **1. Clonar el Repositorio**
```bash
git clone https://github.com/josehtat/proyecto_casino.git
cd proyecto_casino
```
### **2. Configurar el Servidor**
- Instalar dependencias:
```bash
npm install
```
- Crear un archivo .env en la raíz del proyecto con las siguientes variables:
```
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASS=tu_contraseña
DB_NAME=casino_x
SESSION_SECRET=tu_secreto
```
- Creación de la base de datos en MySQL
```
CREATE DATABASE casino_x;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(255) NOT NULL,
    score INT DEFAULT 100
);
```
### Levantar el proyecto en modo desarrollo:
```bash
npm run dev
```
## Puesta en producción
Para poner el proyecto en producción hemos utilizado un proxy inverso en Apache2. Hay muchas más maneras de hacerlo; nosotros explicaremos la que conocemos.

### **1. Hacer la build del cliente**
Este paso es esencial sea cual sea tu configuración de servidor: hay que decirle al Bundler Vite que compile los archivos estáticos para poderlos servir desde Express. 
```bash
npm run build
```
Esto copiará a la carpeta `public` los archivos html especificados en el fichero de configuración de Vite `vite.config.js` y sus scripts con el atributo `type=module` a la carpeta `assets`. Al hacerlo en una carpeta fuera de su ruta de trabajo `src\` no sobreescribirá los ficheros, así que para diferentes builds es preciso borrarlos antes.

### **2. Configuración de Apache2**
Para hacer un proxy reverso a NodeJS necesitamos tres mods de apache: `proxy`, `proxy_http` y `rewrite`. Este último es importante para que Socket.io pueda funcionar correctamente, de lo contrario no podrá realizar la conexión al servidor por websocket y se apoyará en conexiones polling, que aunque funcionen son infinitamente más lentas.
```bash
sudo a2enmod proxy proxy_http rewrite
```
Una vez habilitados los mods creamos el fichero con el sitio virtual en:
```bash
sudo nano /etc/apache2/sites-available/proyecto_casino.conf  
```
Y escribimos la siguiente configuración:
```
<VirtualHost *:80>
    ServerName casinox.ieti.site

    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    ProxyPass /socket.io/ ws://localhost:3000/socket.io/
    ProxyPassReverse /socket.io/ ws://localhost:3000/socket.io/

    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:3000/$1" [P,L]

    ProxyTimeout 3

    ErrorLog ${APACHE_LOG_DIR}/proyecto_casino_error.log
    CustomLog ${APACHE_LOG_DIR}/proyecto_casino_access.log combined
</VirtualHost>
```
Finalmente reiniciamos Apache2 para aplicar los cambios:
```bash
sudo systemctl restart apache2
```
### **3. Puesta en marcha del servidor con PM2**
PM2 nos servirá para poner en marcha el servidor de NodeJS-Express, con el cual manejamos tanto la parte del servidor de nuestra aplicación como los archivos estáticos del cliente. Para añadir una aplicación a PM2 realizamos el siguiente comando desde la ruta del proyecto:
```bash
pm2 start server/server.js --name "proyecto_casino"
```
Importante también instalar el script que arranca al inicio PM2 para no tener que levantar el servidor manualmente en caso de reinicio de la máquina:
```bash
pm2 startup
```
copiamos y ejecutamos el comando que nos muestre (varia entre distintas máquinas) y acabamos con:
```bash
pm2 save
```
También debemos instalar el mmod de PM2 pm2-dotenv para que pueda leer nuestro fichero de variables de entorno:
```bash
pm2 install pm2-dotenv
```
Reiniciamos PM2 para aplicar los cambios:
```bash
pm2 restart proyecto_casino
```
Y con esto ya habríamos puesto nuestro servidor correctamente en un entorno de producción. Si ahora quisiéramos realizar alguna actualización la forma más sencilla es, una vez los cambios aplicados estén en la rama de producción, borrar la build existente de la carpeta public, realizar una nueva build con ```npm run build```, subir la nueva build a la rama, descargarla en el entorno de producción con ```git pull``` y listo. 
