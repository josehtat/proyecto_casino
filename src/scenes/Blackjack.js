import Phaser from 'phaser';

export class Blackjack extends Phaser.Scene {
    constructor() {
        super({
            key: 'Blackjack'
        });
    }
    init(data) {
        this.roomCode = data.roomCode; // Recibir el código de la sala
        this.table = data.table; // Recibir la mesa desde la escena principal
    }

    create() {
        this.socket = this.game.socket;
        this.session = this.game.session;

        this.tablePlayers = [];

        console.log('Escena de Blackjack creada');
        // decirle a la escena MainGame que bloquee el movimiento del jugador
        this.events.emit('blockPlayerMovement', true);

        // Crear el fondo de la mesa
        // no hay imagen de fondo, solo un rectángulo translucido gris
        this.add.rectangle(400, 150, 750, 300, 0x000000, 0.5);
        this.add.text(400, 20, `Mesa de Blackjack: ${this.table}`, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

        // Cerrar esta escena con Esc y devolver el movimiento
        this.input.keyboard.on('keydown-ESC', () => {
            this.closeScene();
        });


        // Unir jugador a la mesa (esto se hace en el servidor)
        this.socket.emit('blackjackJoinTable', this.roomCode, this.table, this.session.nickname);
        // Escuchar el evento de la mesa
        this.socket.on('blackjackTableJoined', (table, players) => {
            console.log(`Unido a la mesa ${table}`);
            // Mostrar los jugadores en la mesa
            this.tablePlayers = players;
            this.showPlayers(this.tablePlayers);
        });

        // Escuchar el evento de error al unirse a la mesa
        this.socket.on('blackjackTableError', (error) => {
            console.log(`Error al unirse a la mesa: ${error}`);
            // Mostrar mensaje de error
            this.add.text(400, 100, `Error: ${error}`, { fontSize: '18px', color: '#f00' }).setOrigin(0.5);
        });



        this.socket.on('blackjackPlayerJoined', ({ tableName, player }) => {
            if (tableName !== this.table) return; // Si la mesa no es la misma, no hacer nada

            console.log(`Jugador unido a la mesa ${tableName}: ${player.nickname}`);
            // Verificar si el jugador ya está en la lista
            const alreadyJoined = this.tablePlayers.find((p) => p.id === player.id);
            if (alreadyJoined) {
                console.log(`El jugador ${player.nickname} ya está en la mesa ${tableName}`);
                return; // Si el jugador ya está en la lista, no hacer nada
            }

            this.tablePlayers.push(player); // Agregar jugador a la lista
            this.showPlayers(this.tablePlayers); // Actualizar la lista visual
        });

        this.socket.on('blackjackPlayerLeft', (tableName, id) => {
            console.log(`Jugador salido de la mesa ${tableName}: ${id}`);
            console.log('jugadores antes del filtro:');
            console.log(this.tablePlayers);
            // Filtrar el jugador que salió
            if (tableName !== this.table) return; // Si la mesa no es la misma, no hacer nada
            this.tablePlayers = this.tablePlayers.filter(p => p.id !== id); // Eliminar jugador de la lista
            console.log('jugadores después del filtro ');
            console.log(this.tablePlayers);
            this.showPlayers(this.tablePlayers); // Actualizar la lista visual
        });
    }

    update(time, delta) {
    }

    showPlayers(players) {
        // Limpiar los textos anteriores
        if (this.player1) this.player1.destroy();
        if (this.player2) this.player2.destroy();
        if (this.player3) this.player3.destroy();
        if (this.player4) this.player4.destroy();
        // Posiciones predefinidas para los jugadores
        const positions = [
            { x: 150, y: 250 },
            { x: 300, y: 250 },
            { x: 450, y: 250 },
            { x: 600, y: 250 }
        ];
         this.player1 = this.add.text(positions[0].x, positions[0].y, players[0] ? players[0].nickname : 'Esperando...', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
         this.player2 = this.add.text(positions[1].x, positions[1].y, players[1] ? players[1].nickname : 'Esperando...', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
         this.player3 = this.add.text(positions[2].x, positions[2].y, players[2] ? players[2].nickname : 'Esperando...', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
         this.player4 = this.add.text(positions[3].x, positions[3].y, players[3] ? players[3].nickname : 'Esperando...', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
    };

    closeScene() {
        this.events.emit('blockPlayerMovement', false);
        this.socket.emit('blackjackLeaveTable', this.roomCode, this.table);
        // desuscribirse de los eventos
        this.socket.off('blackjackTableJoined');
        this.socket.off('blackjackTableError');
        this.socket.off('blackjackPlayerJoined');
        this.socket.off('blackjackPlayerLeft');
        this.scene.stop();
    }
}