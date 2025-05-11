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

        lever.setName('lever');
        leverKnob.setName('leverKnob');

        // Hacer la palanca interactiva
        lever.setInteractive();
        leverKnob.setInteractive();

        // Acción al tirar de la palanca
        lever.on('pointerdown', () => {
            console.log('Palanca activada');
            this.pullLever(lever, leverKnob, symbols);
        });

        leverKnob.on('pointerdown', () => {
            console.log('Pomo de la palanca activado');
            this.pullLever(lever, leverKnob, symbols);
        });

        this.input.keyboard.on('keydown-ESC', () => {
            this.closeScene();
        });

        this.game.socket.on('scoreUpdated', (data) => {
            if (data.success) {
                console.log(`Puntuación actualizada en el servidor: nickname=${data.nickname}, score=${data.score}`);
            } else {
                console.error(`Error al actualizar la puntuación: ${data.error}`);
            }
        });
    }

    pullLever(lever, leverKnob, symbols) {
        console.log('Método pullLever ejecutado');

        // Desactivar interacción con la palanca
        lever.disableInteractive();
        leverKnob.disableInteractive();

        this.tweens.add({
            targets: [lever, leverKnob],
            y: '+=50',
            duration: 200,
            yoyo: true,
            onComplete: () => {
                console.log('Animación de la palanca completada');
                this.spinReels(symbols);
            }
        });
    }

    spinReels(symbols) {
        let completedColumns = 0;

        this.columns.forEach((column, index) => {
            const spinCount = 10 + index * 5;
            for (let i = 0; i < spinCount; i++) {
                this.time.delayedCall(50 * i, () => {
                    const sym = symbols[Math.floor(Math.random() * symbols.length)];
                    column.setText(sym);

                    if (i === spinCount - 1) {
                        completedColumns++;
                        if (completedColumns === this.columns.length) {
                            this.checkResult();

                            // Reactivar interacción con la palanca después de que las frutas terminen de moverse
                            const lever = this.children.getByName('lever');
                            const leverKnob = this.children.getByName('leverKnob');
                            lever.setInteractive();
                            leverKnob.setInteractive();
                        }
                    }
                }, [], this);
            }
        });
    }

    checkResult() {
        console.log('Método checkResult ejecutado');
        const result = this.columns.map(column => {
            console.log('Texto de columna:', column.text); // Verifica el texto de cada columna
            return column.text;
        });
        console.log('Resultado del slot:', result);

        const isWin = result.every(symbol => symbol === result[0]);
        console.log('¿Es victoria?', isWin);

        if (isWin) {
            this.disableLeverInteraction();
            this.showWinMessage();
        } else {
            console.log('No has ganado. Intenta de nuevo.');
        }
    }

    showWinMessage() {
        console.log('Método showWinMessage ejecutado'); // Verifica si se llama
        const winText = this.add.text(400, 200, '¡Has ganado!', { fontSize: '48px', color: '#00ff00' }).setOrigin(0.5);

        // Emitir evento al servidor para actualizar la puntuación
        this.game.socket.emit('updateScore', {
            nickname: this.game.session.nickname, // Nombre del jugador
            score: 100 // Puntos ganados
        });
        console.log(`Evento updateScore emitido: nickname=${this.game.session.nickname}, score=100`);

        this.time.delayedCall(3000, () => {
            this.closeScene();
        });
    }

    disableLeverInteraction() {
        console.log('Método disableLeverInteraction ejecutado');
        this.input.enabled = false;
    }

    closeScene() {
        console.log('Método closeScene ejecutado');
        this.scene.stop();
        this.events.emit('blockPlayerMovement', false);
    }
}