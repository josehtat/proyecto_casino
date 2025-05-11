import Phaser from 'phaser';

export class Poker extends Phaser.Scene {
    constructor() {
        super({ key: 'Poker' });
    }

    init(data) {
        this.roomCode = data.roomCode; // Recibir el código de la sala
        this.table = data.table; // Recibir la mesa desde la escena principal
    }

    create() {
        this.socket = this.game.socket;
        this.session = this.game.session;

        this.tablePlayers = [];

        // console.log('Escena de Poker creada');
        this.events.emit('blockPlayerMovement', true);

        // Crear el fondo de la mesa
        this.add.rectangle(400, 150, 750, 300, 0x000000, 0.5);
        this.add.text(400, 20, `Mesa de Poker: ${this.table}`, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

        // Botón para cerrar la escena
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

        // Unir jugador a la mesa
        this.socket.emit('pokerJoinTable', this.roomCode, this.table, this.session.nickname);

        // Escuchar eventos del servidor
        this.socket.on('pokerTableJoined', (tableName, players, readyStatus) => {
            if (tableName !== this.table) return;

            // console.log(`Unido a la mesa ${tableName}`);
            this.tablePlayers = players.map(player => ({
                ...player,
                isReady: readyStatus[player.id] || false // Asignar el estado "Listo" o "No Listo"
            }));
            this.showPlayers(this.tablePlayers);
        });

        // Escuchar el evento de error al unirse a la mesa
        this.socket.on('pokerTableError', (error) => {
            // console.log(`Error al unirse a la mesa: ${error}`);
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


        this.socket.on('pokerPlayerReadyStatus', ({ tableName, playerId, isReady }) => {
            if (tableName !== this.table) return;

            // console.log(`Jugador ${playerId} está ${isReady ? 'Listo' : 'No Listo'}`);
            const player = this.tablePlayers.find(p => p.id === playerId);
            if (player) {
                player.isReady = isReady;
                this.showPlayers(this.tablePlayers);
            }
        });

        this.socket.on('pokerGameStart', ({ tableName }) => {
            if (tableName !== this.table) return;

            // console.log(`La partida en la mesa ${tableName} ha comenzado.`);
            this.startGame();
        });

        this.socket.on('pokerGameState', (gameState) => {
            if (gameState.tableName !== this.table) return;

            // console.log('Estado del juego recibido:', gameState);

            // Guardar el último estado del juego
            this.latestGameState = gameState;

            // Limpiar las cartas comunitarias anteriores
            if (this.communityCardSprites) {
                this.communityCardSprites.forEach(card => card.destroy());
            }
            this.communityCardSprites = [];

            // Mostrar las cartas comunitarias actualizadas
            const communityPosition = { x: 280, y: 100 };
            gameState.communityCards.forEach((card, i) => {
                const cardSprite = this.add.image(communityPosition.x + i * 60, communityPosition.y, `${card.rank}-${card.suit}`).setScale(0.3);
                this.communityCardSprites.push(cardSprite);
            });

            // Mostrar la ronda actual
            if (this.roundText) this.roundText.destroy();
            this.roundText = this.add.text(120, 50, `Ronda: ${gameState.currentRound}`, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

            this.showPlayers(this.tablePlayers, gameState);

            // Actualizar el estado de los botones según si el jugador ya completó su acción
            const playerState = gameState.players[this.socket.id];
            if (playerState && playerState.actionCompleted) {
                if (this.actionButtons) {
                    this.actionButtons.forEach(button => button.disable());
                }
            } else {
                if (this.actionButtons) {
                    this.actionButtons.forEach(button => button.enable());
                }
            }

            // Mostrar la apuesta actual y el bote
            if (this.currentBetText) this.currentBetText.destroy();
            if (this.potText) this.potText.destroy();

            this.currentBetText = this.add.text(120, 100, `Apuesta actual: ${gameState.currentBet}`, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
            this.potText = this.add.text(120, 130, `Bote: ${gameState.pot}`, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        });

        this.socket.on('pokerGameResults', ({ tableName, winners, handValues, communityCards }) => {
            if (tableName !== this.table) return;

            // console.log(`Ganadores: ${winners.join(', ')}`);

            this.resultTexts = [];

            // Mostrar los ganadores
            winners.forEach((winner, index) => {
                const hand = handValues[winner];
                const player = this.tablePlayers.find(p => p.id === winner); // Buscar el jugador por su socket ID
                const nickname = player ? player.nickname : winner; // Usar el nickname si existe, de lo contrario usar el ID
                const resultText = this.add.text(400, 300 + index * 20, `Ganador: ${nickname} (${hand.rankName})`, { fontSize: '18px', color: '#0f0' }).setOrigin(0.5);
                this.resultTexts.push(resultText);
            });

            // Actualizar las cartas de todos los jugadores para mostrar sus manos reales
            this.tablePlayers.forEach(player => {
                const playerCards = this.playerCardSprites[player.id];
                const playerState = this.latestGameState.players[player.id]; // Usar el estado más reciente del juego
                if (playerCards && playerState) {
                    playerCards.forEach((cardSprite, i) => {
                        const card = playerState.hand[i];
                        if (card) {
                            cardSprite.setTexture(`${card.rank}-${card.suit}`);
                        }
                    });
                }
            });

            setTimeout(() => {
                this.resetGame();
            }, 5000);
        });

        // Escuchar cuando un jugador se une a la mesa
        this.socket.on('pokerPlayerJoined', ({ tableName, player }) => {
            if (tableName !== this.table) return;

            // console.log(`Jugador unido a la mesa ${tableName}: ${player.nickname}`);
            const alreadyJoined = this.tablePlayers.find(p => p.id === player.id);
            if (alreadyJoined) return;

            this.tablePlayers.push({ ...player, isReady: false });
            this.showPlayers(this.tablePlayers);
        });

        // Escuchar cuando un jugador sale de la mesa
        this.socket.on('pokerPlayerLeft', ({ tableName, playerId }) => {
            if (tableName !== this.table) return;

            // console.log(`Jugador salió de la mesa ${tableName}: ${playerId}`);
            this.tablePlayers = this.tablePlayers.filter(p => p.id !== playerId);
            this.showPlayers(this.tablePlayers);
        });

        // Botón "Listo" para el jugador local
        this.readyButton = this.add.text(650, 100, 'Listo', {
            fontSize: '18px',
            color: '#fff',
            backgroundColor: '#00f',
            padding: { x: 10, y: 30 }
        })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.socket.emit('pokerSetReady', this.roomCode, this.table, true);
                this.readyButton.setText('Esperando...');
                this.readyButton.disableInteractive();
            })
            .on('pointerover', () => {
                this.readyButton.setStyle({ backgroundColor: '#0f0' });
            })
            .on('pointerout', () => {
                this.readyButton.setStyle({ backgroundColor: '#00f' });
            });
    }

    showPlayers(players, gameState = null) {
        // Limpiar textos de jugadores (pero no las cartas)
        if (this.playerTexts) {
            this.playerTexts.forEach(text => text.destroy());
        }
        this.playerTexts = [];

        // Crear posiciones para los jugadores
        const positions = [
            { x: 150, y: 250 },
            { x: 300, y: 250 },
            { x: 450, y: 250 },
            { x: 600, y: 250 }
        ];

        // Si no existe un registro de cartas, inicializarlo
        if (!this.playerCardSprites) {
            this.playerCardSprites = {};
        }

        // Mostrar jugadores y sus estados
        players.forEach((player, index) => {
            const position = positions[index];
            const nameText = this.add.text(position.x, position.y, player.nickname, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

            // Mostrar fichas o estado "Listo/No Listo"
            if (gameState) {
                const playerState = gameState.players[player.id];
                const chipsText = this.add.text(position.x, position.y + 20, `Fichas: ${playerState.chips}`, { fontSize: '14px', color: '#fff' }).setOrigin(0.5);

                // Mostrar cartas del jugador
                if (!this.playerCardSprites[player.id]) {
                    this.playerCardSprites[player.id] = [];
                    const cards = playerState.hand || [];
                    cards.forEach((card, i) => {
                        const cardSprite = this.add.image(
                            (position.x - 20) + i * 30,
                            position.y - 60,
                            gameState.currentRound === 4 || player.id === this.socket.id // Mostrar cartas solo en Showdown o para el jugador actual
                                ? `${card.rank}-${card.suit}` // Mostrar la carta real
                                : 'back' // Mostrar el reverso de la carta
                        ).setScale(0.2);
                        this.playerCardSprites[player.id].push(cardSprite);
                    });
                }

                this.playerTexts.push(nameText, chipsText);
            } else {
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
    }

    showResults(results) {
        const positions = [
            { x: 150, y: 250 },
            { x: 300, y: 250 },
            { x: 450, y: 250 },
            { x: 600, y: 250 }
        ];

        Object.entries(results).forEach(([playerId, result], index) => {
            const position = positions[index];
            this.add.text(position.x, position.y + 50, result, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        });
    }

    resetGame() {
        // console.log('Reiniciando el juego...');

        // Limpiar los textos de los jugadores
        if (this.playerTexts) {
            this.playerTexts.forEach(text => text.destroy());
        }
        this.playerTexts = [];

        // Limpiar las cartas comunitarias
        if (this.communityCardSprites) {
            this.communityCardSprites.forEach(card => card.destroy());
        }
        this.communityCardSprites = [];

        // Limpiar las cartas de los jugadores
        if (this.playerCardSprites) {
            Object.values(this.playerCardSprites).forEach(cards => {
                cards.forEach(card => card.destroy());
            });
        }
        this.playerCardSprites = {};

        // Limpiar los textos de ronda, apuesta y bote
        if (this.roundText) this.roundText.destroy();
        if (this.currentBetText) this.currentBetText.destroy();
        if (this.potText) this.potText.destroy();

        // Limpiar los botones de acción
        if (this.actionButtons) {
            this.actionButtons.forEach(button => button.destroy());
        }
        this.actionButtons = [];

        // Limpiar textos de ganadores
        if (this.resultTexts) {
            this.resultTexts.forEach(text => text.destroy());
        }
        this.resultTexts = [];

        // Reiniciar la lista de jugadores
        this.showPlayers(this.tablePlayers);

        // Volver a mostrar el botón "Listo"
        this.readyButton = this.add.text(650, 100, 'Listo', {
            fontSize: '18px',
            color: '#fff',
            backgroundColor: '#00f',
            padding: { x: 10, y: 30 }
        })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.socket.emit('pokerSetReady', this.roomCode, this.table, true);
                this.readyButton.setText('Esperando...');
                this.readyButton.disableInteractive();
            })
            .on('pointerover', () => {
                this.readyButton.setStyle({ backgroundColor: '#0f0' });
            })
            .on('pointerout', () => {
                this.readyButton.setStyle({ backgroundColor: '#00f' });
            });
    }

    closeScene() {
         // Limpiar los textos de los jugadores
         if (this.playerTexts) {
            this.playerTexts.forEach(text => text.destroy());
        }
        this.playerTexts = [];

        // Limpiar las cartas comunitarias
        if (this.communityCardSprites) {
            this.communityCardSprites.forEach(card => card.destroy());
        }
        this.communityCardSprites = [];

        // Limpiar las cartas de los jugadores
        if (this.playerCardSprites) {
            Object.values(this.playerCardSprites).forEach(cards => {
                cards.forEach(card => card.destroy());
            });
        }
        this.playerCardSprites = {};

        // Limpiar los textos de ronda, apuesta y bote
        if (this.roundText) this.roundText.destroy();
        if (this.currentBetText) this.currentBetText.destroy();
        if (this.potText) this.potText.destroy();

        // Limpiar los botones de acción
        if (this.actionButtons) {
            this.actionButtons.forEach(button => button.destroy());
        }
        this.actionButtons = [];

        // Limpiar textos de ganadores
        if (this.resultTexts) {
            this.resultTexts.forEach(text => text.destroy());
        }
        this.resultTexts = [];

        this.events.emit('blockPlayerMovement', false);
        this.socket.emit('pokerLeaveTable', this.roomCode, this.table);
        this.socket.off('pokerTableJoined');
        this.socket.off('pokerTableError');
        this.socket.off('pokerPlayerReadyStatus');
        this.socket.off('pokerGameStart');
        this.socket.off('pokerGameState');
        this.socket.off('pokerGameResults');
        this.socket.off('pokerPlayerJoined');
        this.socket.off('pokerPlayerLeft');
        this.scene.stop();
    }

    startGame() {
        // console.log('La partida ha comenzado.');

        this.readyButton.destroy();

        const actions = [
            { label: 'Igualar', action: 'call' },
            { label: 'Pasar', action: 'check' },
            { label: 'Subir', action: 'raise' },
            { label: 'Retirarse', action: 'fold' },
        ];

        this.actionButtons = actions.map((action, index) => {
            const button = this.add.text(700, 60 + index * 50, action.label, {
                fontSize: '18px',
                color: '#fff',
                backgroundColor: '#00f',
                padding: { x: 10, y: 5 }
            })
                .setOrigin(0.5)
                .setInteractive()
                .on('pointerdown', () => {
                    if (!button.disabled) {
                        let amount = 0;

                        // Calcular el amount dinámicamente para "raise"
                        if (action.action === 'raise') {
                            amount = (this.latestGameState?.currentBet || 10) + 10;
                        }

                        this.socket.emit('pokerAction', { roomCode: this.roomCode, tableName: this.table, action: action.action, amount });
                    }
                })
                .on('pointerover', function () {
                    if (!button.disabled) {
                        this.setStyle({ backgroundColor: '#0f0' });
                    }
                })
                .on('pointerout', function () {
                    if (!button.disabled) {
                        this.setStyle({ backgroundColor: '#00f' });
                    }
                });

            // Agregar una propiedad para manejar el estado deshabilitado
            button.disabled = false;
            button.disable = function () {
                this.disabled = true;
                this.setStyle({ backgroundColor: '#555', color: '#aaa' });
            };
            button.enable = function () {
                this.disabled = false;
                this.setStyle({ backgroundColor: '#00f', color: '#fff' });
            };

            return button;
        });
    }
}