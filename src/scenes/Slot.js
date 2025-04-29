import Phaser from "phaser";

export class Slot extends Phaser.Scene {
    constructor() {
        super({
            key: "Slot"
        });
    }
    init(data) {
        this.roomCode = data.roomCode; // Recibir el código de la sala
        this.table = data.table; // Recibir la mesa desde la escena principal
    }

    create () {
        this.socket =  this.game.socket;
        this.session = this.game.session;

        this.tablePlayers = [];

        console.log('Escena de Slot creada');
        this.events.emit('blockPlayerMovement', true);
        // Crear el fondo de la mesa
        // no hay imagen de fondo, solo un rectángulo translucido gris
        this.add.rectangle(400, 150, 750, 300, 0x000000, 0.5);
        this.add.text(400, 20, `Mesa de Slot: ${this.table}`, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        // Cerrar esta escena con Esc y devolver el movimiento
        this.input.keyboard.on('keydown-ESC', () => {
            this.closeScene();
        });

    }
}