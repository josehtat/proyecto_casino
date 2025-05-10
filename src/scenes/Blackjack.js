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

        // Cerrar esta escena y devolver el movimiento
        this.add.text(720, 20, 'Cerrar', { 
            fontSize: '18px', 
            color: '#fff', 
            backgroundColor: '#f00', 
            padding: { x: 10, y: 5 } 
        })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
            this.closeScene();
            })
            .on('pointerover', function () {
            this.setStyle({ backgroundColor: '#ff5555' });
            })
            .on('pointerout', function () {
            this.setStyle({ backgroundColor: '#f00' });
            });


        // Unir jugador a la mesa (esto se hace en el servidor)
        this.socket.emit('blackjackJoinTable', this.roomCode, this.table, this.session.nickname);
        // Escuchar el evento de la mesa
        this.socket.on('blackjackTableJoined', (tableName, players, readyStatus) => {
            if (tableName !== this.table) return; // Ignorar si no es la mesa actual

            console.log(`Unido a la mesa ${tableName}`);
            console.log('Estado inicial de los jugadores:', readyStatus);

            // Actualizar la lista de jugadores y sus estados
            this.tablePlayers = players.map(player => ({
                ...player,
                isReady: readyStatus[player.id] || false // Asignar el estado "Listo" o "No Listo"
            }));

            this.showPlayers(this.tablePlayers); // Mostrar los jugadores en la mesa
        });

        // Escuchar el evento de error al unirse a la mesa
        this.socket.on('blackjackTableError', (error) => {
            console.log(`Error al unirse a la mesa: ${error}`);
            // Mostrar mensaje de error
            this.add.text(400, 100, `Error: ${error}`, { fontSize: '18px', color: '#f00' }).setOrigin(0.5);
            // Destruir el botón "Listo" si existe
            if (this.readyButton) {
                this.readyButton.destroy();
            }
            // salir de la escena a los 3 segundos
            setTimeout(() => {
                this.closeScene();
            }, 3000);
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

        this.socket.on('blackjackPlayerLeft', (data) => {
            console.log(`Evento blackjackPlayerLeft recibido:`, data);

            const { tableName, playerId } = data;

            console.log(`Jugador salido de la mesa ${tableName}: ${playerId}`);
            console.log('jugadores antes del filtro:');
            console.log(this.tablePlayers);

            // Filtrar el jugador que salió
            console.log('mesa: ' + tableName);
            console.log('mesa actual: ' + this.table);
            if (tableName !== this.table) return; // Si la mesa no es la misma, no hacer nada
            this.tablePlayers = this.tablePlayers.filter(p => p.id !== playerId); // Eliminar jugador de la lista
            console.log('jugadores después del filtro ');
            console.log(this.tablePlayers);
            this.showPlayers(this.tablePlayers); // Actualizar la lista visual
        });

        // Botón "Listo" para el jugador local
        this.readyButton = this.add.text(650, 100, 'Listo', { 
            fontSize: '18px', 
            color: '#fff', 
            backgroundColor: '#00f', 
            padding: { x: 10, y: 30 } // Agregar relleno horizontal (x) y vertical (y)
        })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.socket.emit('blackjackSetReady', this.roomCode, this.table, true);
                this.readyButton.setText('Esperando...');
                this.readyButton.disableInteractive();
            })
            .on('pointerover', () => {
                this.readyButton.setStyle({ backgroundColor: '#0f0' }); // Cambiar color al pasar el ratón
            })
            .on('pointerout', () => {
                this.readyButton.setStyle({ backgroundColor: '#00f' }); // Restaurar color al salir el ratón
            });


        // Escuchar el estado de preparación de los jugadores
        this.socket.on('blackjackPlayerReadyStatus', ({ tableName, playerId, isReady }) => {
            if (tableName !== this.table) return; // Ignorar si no es la mesa actual

            console.log(`Jugador ${playerId} está ${isReady ? 'Listo' : 'No Listo'}`);
            const player = this.tablePlayers.find(p => p.id === playerId);
            if (player) {
                player.isReady = isReady;
                this.showPlayers(this.tablePlayers); // Actualizar la lista visual
            }
        });

        // Escuchar el inicio de la partida
        this.socket.on('blackjackGameStart', ({ tableName }) => {
            if (tableName !== this.table) return; // Ignorar si no es la mesa actual

            console.log(`La partida en la mesa ${tableName} ha comenzado.`);
            this.startGame(); // Lógica para iniciar la partida
        });

        this.showPlayers(this.tablePlayers);
    }

    update(time, delta) {
    }

    showPlayers(players, gameState = null) {
        // Limpiar los textos anteriores
        if (this.playerTexts) {
            this.playerTexts.forEach(text => text.destroy());
        }
        this.playerTexts = [];

        // Posiciones predefinidas para los jugadores
        const positions = [
            { x: 150, y: 250 },
            { x: 300, y: 250 },
            { x: 450, y: 250 },
            { x: 600, y: 250 }
        ];

        // Mostrar los jugadores y su estado o cartas
        players.forEach((player, index) => {
            const position = positions[index];
            const nameText = this.add.text(position.x, position.y, player.nickname, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

            if (gameState) {
                // Mostrar las cartas del jugador durante la partida
                const cards = gameState.players[player.id] || [];
                const cardSprites = cards.map((card, i) => 
                    this.add.image((position.x - 20) + i * 15, position.y - 60, `${card.rank}-${card.suit}`).setScale(0.2) // Reducir escala y ajustar posición
                );
                this.playerTexts.push(nameText, ...cardSprites);
            } else {
                // Mostrar el estado "Listo/No Listo" antes de la partida
                const statusText = this.add.text(position.x, position.y + 20, player.isReady ? 'Listo' : 'No Listo', { fontSize: '14px', color: player.isReady ? '#0f0' : '#f00' }).setOrigin(0.5);
                this.playerTexts.push(nameText, statusText);
            }
        });

        // Mostrar "Esperando..." para los asientos vacíos
        for (let i = players.length; i < 4; i++) {
            const position = positions[i];
            const waitingText = this.add.text(position.x, position.y, 'Esperando...', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
            this.playerTexts.push(waitingText);
        }

        // Mostrar las cartas de la banca durante la partida
        if (gameState) {
            const dealerPosition = { x: 400, y: 100 };
            const dealerCards = gameState.dealer || [];
            const dealerCardSprites = dealerCards.map((card, i) => 
                this.add.image(dealerPosition.x + i * 30, dealerPosition.y, `${card.rank}-${card.suit}`).setScale(0.3) // Reducir escala
            );
            this.playerTexts.push(...dealerCardSprites);
        }
    }

    closeScene() {
        this.events.emit('blockPlayerMovement', false);
        this.socket.emit('blackjackLeaveTable', this.roomCode, this.table);

        // Desuscribirse de los eventos específicos de la mesa
        this.socket.off('blackjackTableJoined');
        this.socket.off('blackjackTableError');
        this.socket.off('blackjackPlayerJoined');
        this.socket.off('blackjackPlayerLeft');
        this.socket.off('blackjackPlayerReadyStatus');
        this.socket.off('blackjackGameStart');
        this.socket.off('blackjackGameState');
        this.socket.off('blackjackGameResults');

        this.scene.stop();
    }

    startGame() {
        console.log('La partida ha comenzado.');

        // Mostrar un mensaje indicando que la partida ha comenzado
        this.readyButton.destroy(); // Destruir el botón "Listo"

        // Botón "Pedir Carta"
        this.hitButton = this.add.text(650, 75, 'Pedir Carta', { 
            fontSize: '18px', 
            color: '#fff', 
            backgroundColor: '#00f', 
            padding: { x: 10, y: 10 } // Agregar relleno horizontal (x) y vertical (y)
        })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.socket.emit('blackjackHit', { roomCode: this.roomCode, tableName: this.table });
            })
            .on('pointerover', () => {
                this.hitButton.setStyle({ backgroundColor: '#0f0' }); // Cambiar color al pasar el ratón
            })
            .on('pointerout', () => {
                this.hitButton.setStyle({ backgroundColor: this.hitButton.active ? '#00f' : '#888' }); // Restaurar color o gris si está desactivado
            });

    // Botón "Plantarse"
    this.standButton = this.add.text(650, 125, 'Plantarse', { 
        fontSize: '18px', 
        color: '#fff', 
        backgroundColor: '#f00', 
        padding: { x: 10, y: 10 } // Agregar relleno horizontal (x) y vertical (y)
    })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            this.socket.emit('blackjackStand', { roomCode: this.roomCode, tableName: this.table });

            // Deshabilitar los botones después de plantarse
            this.hitButton.disableInteractive();
            this.standButton.disableInteractive();
            this.hitButton.setStyle({ backgroundColor: '#888' }); // Cambiar a gris cuando esté desactivado
            this.standButton.setStyle({ backgroundColor: '#888' }); // Cambiar a gris cuando esté desactivado
        })
        .on('pointerover', () => {
            this.standButton.setStyle({ backgroundColor: '#0f0' }); // Cambiar color al pasar el ratón
        })
        .on('pointerout', () => {
            this.standButton.setStyle({ backgroundColor: this.standButton.active ? '#f00' : '#888' }); // Restaurar color o gris si está desactivado
        });

        // Escuchar el estado del juego actualizado desde el servidor
        this.socket.on('blackjackGameState', (gameState) => {
            if (gameState.tableName !== this.table) return; // Ignorar si no es la mesa actual

            console.log('Estado del juego recibido:', gameState);
            this.showPlayers(this.tablePlayers, gameState);

            // Verificar si el jugador local está en el estado del juego
            if (!gameState.players[this.socket.id]) {
                console.warn('El estado del jugador local no está definido en gameState.players.');
                return; // Salir del evento si el estado del jugador no está definido
            }

            const playerCards = gameState.players[this.socket.id];
            const playerValue = this.calculateHandValue(playerCards);

            // Verificar si el jugador local está plantado o se ha pasado de 21
            if (playerValue > 21 || gameState.standStatus[this.socket.id]) {
                console.log('El jugador local se ha pasado de 21 o está plantado.');
                this.hitButton.disableInteractive();
                this.standButton.disableInteractive();
                this.hitButton.setStyle({ backgroundColor: '#888' }); // Cambiar a gris cuando esté desactivado
                this.standButton.setStyle({ backgroundColor: '#888' }); // Cambiar a gris cuando esté desactivado
            }
        });

        // Escuchar los resultados del juego
        this.socket.on('blackjackGameResults', ({tableName, dealer, results }) => {
            if (tableName !== this.table) return; // Ignorar si no es la mesa actual
            console.log('Resultados del juego:', results);

            // Definir las posiciones de los jugadores
            const positions = [
                { x: 150, y: 250 },
                { x: 300, y: 250 },
                { x: 450, y: 250 },
                { x: 600, y: 250 }
            ];

            // Mostrar las cartas de la banca
            this.dealerCardSprites = dealer.map((card, i) => {
                return this.add.image(400 + i * 30, 100, `${card.rank}-${card.suit}`).setScale(0.3);
            });

            // Mostrar los resultados de los jugadores
            this.victoryText = Object.entries(results).map(([playerId, result], index) => {
                const position = positions[index];
                return this.add.text(position.x, position.y + 20, result, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
            });

            // Deshabilitar los botones después de que termine la partida
            this.hitButton.disableInteractive();
            this.standButton.disableInteractive();

            // Mostrar un mensaje indicando que la partida ha terminado
            // this.endGameText = this.add.text(400, 400, '¡La partida ha terminado!', { fontSize: '24px', color: '#f00' }).setOrigin(0.5);

            // Reiniciar el juego después de 3 segundos
            setTimeout(() => {
                this.resetGame();
            }, 3000);
            });
    }

    resetGame() {
        console.log('Reiniciando el juego...');

        // Limpiar los textos y botones
        if (this.playerTexts) {
            this.playerTexts.forEach(text => text.destroy());
        }
        if (this.hitButton) this.hitButton.destroy();
        if (this.standButton) this.standButton.destroy();

        // Limpiar las cartas de la banca
        if (this.dealerCardSprites) {
            this.dealerCardSprites.forEach(card => card.destroy());
        }

        // Limpiar textos adicionales (victoria, partida iniciada, partida terminada)
        if (this.victoryText) {
            this.victoryText.forEach(text => text.destroy());
            this.victoryText = null; // Limpiar la referencia
        }
        // if (this.startGameText) this.startGameText.destroy();
        // if (this.endGameText) this.endGameText.destroy();

        // Reiniciar el estado de los jugadores
        this.tablePlayers.forEach(player => {
            player.isReady = false;
        });

        // Mostrar el estado inicial de los jugadores
        this.showPlayers(this.tablePlayers);

        // Mostrar el botón "Listo" nuevamente
        this.readyButton = this.add.text(650, 100, 'Listo', { 
            fontSize: '18px', 
            color: '#fff', 
            backgroundColor: '#00f', 
            padding: { x: 10, y: 30 } // Agregar relleno horizontal (x) y vertical (y)
        })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.socket.emit('blackjackSetReady', this.roomCode, this.table, true);
                this.readyButton.setText('Esperando...');
                this.readyButton.disableInteractive();
            })
            .on('pointerover', () => {
                this.readyButton.setStyle({ backgroundColor: '#0f0' });
            })
            .on('pointerout', () => {
                this.readyButton.setStyle({ backgroundColor: '#00f' });
            });

            // desuscribirse de los eventos de la partida
            this.socket.off('blackjackGameState');
            this.socket.off('blackjackGameResults');
    }

    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;

        hand.forEach(card => {
            if (['J', 'Q', 'K'].includes(card.rank)) {
                value += 10;
            } else if (card.rank === 'A') {
                value += 11;
                aces++;
            } else {
                value += parseInt(card.rank);
            }
        });

        // Ajustar el valor de los ases si es necesario
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }
}