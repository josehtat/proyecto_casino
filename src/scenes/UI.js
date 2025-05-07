import Phaser from 'phaser';

export class UI extends Phaser.Scene {
    constructor() {
        super({ key: 'UI' });
    }

    create() {
        // Teclas WASD para movimiento (arriba a la izquierda)
        this.add.text(10, 32, '      para moverte', {
            fontSize: '16px',
            color: '#fff',
            backgroundColor: '#000',
            padding: { x: 5, y: 5 }
        }).setOrigin(0, 1);
        this.add.image(25, 28, 'keyS').setOrigin(0.5);
        this.add.image(10, 28, 'keyA').setOrigin(0.5);
        this.add.image(25, 13, 'keyW').setOrigin(0.5);
        this.add.image(40, 28, 'keyD').setOrigin(0.5);

        // Texto "T para abrir el chat" (abajo a la izquierda)
        
        this.chatText = this.add.text(10, this.scale.height - 30, '  para abrir el chat', {
            fontSize: '16px',
            color: '#fff',
            backgroundColor: '#000',
            padding: { x: 5, y: 5 }
        }).setOrigin(0, 1);
        this. chatIcon = this.add.image(15, this.scale.height - 43, 'keyT');

        this.scene.get('Chat').events.on('typing', (show) => {
            this.chatText.setVisible(!show);
            this.chatIcon.setVisible(!show);
        });
        
        // Texto "E para interactuar" (abajo a la derecha, dinámico)
        this.interactText = this.add.text(this.scale.width - 10, this.scale.height - 30, '  para interactuar', {
            fontSize: '16px',
            color: '#fff',
            backgroundColor: '#000',
            padding: { x: 5, y: 5 }
        }).setOrigin(1, 1).setVisible(false); // Oculto por defecto
        this.interactIcon = this.add.image(this.scale.width - 182, this.scale.height - 43, 'keyE').setVisible(false); // Oculto por defecto

        // Texto "Esc para salir" (arriba a la derecha)
        // this.add.text(this.scale.width - 10, 10, '  para salir', {
        //     fontSize: '16px',
        //     color: '#fff',
        //     backgroundColor: '#000',
        //     padding: { x: 5, y: 5 }
        // }).setOrigin(1, 0);
        // this.add.image(this.scale.width - 128, 23, 'keyEsc');

        // Escuchar eventos para mostrar/ocultar "E para interactuar"
        this.scene.get('MainGame').events.on('showInteract', (show) => {
            this.interactText.setVisible(show);
            this.interactIcon.setVisible(show);
        });
    }
}