const mysql = require('mysql2');


// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'admin123',
    password: 'Superlocal777',
    port: 3300,
    database: 'restaurante'
});

// Conexión a la base de datos
connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos: ', err);
        return;
    }
    console.log('Conexión exitosa a la base de datos');
});

module.exports = connection;