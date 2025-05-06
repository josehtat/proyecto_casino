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

    create() {
        console.log('Escena de Slot creada');
        this.events.emit('blockPlayerMovement', true);

        // Crear el fondo de la máquina
        this.add.rectangle(400, 300, 400, 500, 0x000000, 0.8); // Fondo centrado y ajustado
        this.add.text(400, 100, "Slot Machine", { fontSize: '32px', color: '#fff' }).setOrigin(0.5);

        // Símbolos del slot
        const symbols = ['🍒', '🍋', '🔔', '⭐', '🍇'];

        // Crear las columnas del slot
        this.columns = [];
        for (let i = 0; i < 3; i++) {
            const column = this.add.text(300 + i * 100, 300, '🍒', { fontSize: '64px', color: '#fff' }).setOrigin(0.5);
            this.columns.push(column);
        }

        // Crear la palanca
        const lever = this.add.rectangle(550, 300, 20, 120, 0x888888).setOrigin(0.5); // Palanca más grande y ajustada
        const leverKnob = this.add.circle(550, 360, 15, 0xaaaaaa).setOrigin(0.5); // Pomo de la palanca

        // Hacer la palanca interactiva
        lever.setInteractive();
        leverKnob.setInteractive();

        // Acción al tirar de la palanca
        lever.on('pointerdown', () => {
            this.pullLever(lever, leverKnob, symbols);
        });

        leverKnob.on('pointerdown', () => {
            this.pullLever(lever, leverKnob, symbols);
        });

        this.input.keyboard.on('keydown-ESC', () => {
            this.closeScene();
        });
    }

    pullLever(lever, leverKnob, symbols) {
        // Animar la palanca hacia abajo y luego hacia arriba
        this.tweens.add({
            targets: [lever, leverKnob],
            y: '+=50',
            duration: 200,
            yoyo: true,
            onComplete: () => {
                // Girar los rodillos después de la animación
                this.spinReels(symbols);
            }
        });
    }

    spinReels(symbols) {
        // Girar las columnas y detenerlas con un resultado aleatorio
        this.columns.forEach((column, index) => {
            this.time.delayedCall(index * 200, () => {
                const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                column.setText(randomSymbol);
            });
        });

        // Verificar el resultado después de que todas las columnas se detengan
        this.time.delayedCall(600, () => {
            const result = this.columns.map(column => column.text);
            console.log('Resultado del slot:', result);

            // Comprobar si todos los símbolos son iguales (victoria)
            const isWin = result.every(symbol => symbol === result[0]);

            if (isWin) {
                this.showWinMessage();
            } else {
                console.log('No has ganado. Intenta de nuevo.');
            }
        });
    }

    showWinMessage() {
        // Mostrar mensaje de victoria
        const winText = this.add.text(400, 200, '¡Has ganado!', { fontSize: '48px', color: '#00ff00' }).setOrigin(0.5);

        // Cerrar la escena después de 2 segundos
        this.time.delayedCall(2000, () => {
            this.closeScene();
        });
    }

    closeScene() {
        console.log('Cerrando escena de Slot');
        this.scene.stop();
        this.events.emit('blockPlayerMovement', false);
    }
}