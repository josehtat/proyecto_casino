import Phaser from 'phaser';

export class Blackjack extends Phaser.Scene {
    constructor() {
        super({
            key: 'Blackjack'
        });
    }

    preload() {
        // Cargar recursos aquí
    }

    create() {
        // Inicializar la escena aquí
        this.add.text(100, 100, 'Bienvenido a Blackjack', { fontSize: '32px', color: '#fff' });
        console.log('Escena de Blackjack creada');
    }

    update(time, delta) {
        // Lógica de actualización aquí
    }
}