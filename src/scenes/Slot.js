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
}