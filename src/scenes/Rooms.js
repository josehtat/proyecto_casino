import Phaser from 'phaser';

export class Rooms extends Phaser.Scene {
    constructor() {
        super({
            key: 'Rooms'
        });
        this.roomsPerPage = 5;
        this.currentPage = 0;
    }

    create() {
               // Agregar el fondo animado
               this.background = this.add.tileSprite(400, 225, 800, 450, "checkerboard").setScale(4);
        this.add.text(400, 50, "Salas Disponibles", { fontSize: "24px", color: "#fff" }).setOrigin(0.5);

        // Obtener el socket - SUPER IMPORTANTE!! necesario para no crear un nuevo socket
        this.socket = this.game.socket;
        this.session = this.game.session;
        this.roomTexts = [];

        // Pedir las salas al servidor
        this.socket.emit("getRooms");

        // Socket listeners
        this.socket.on("roomListUpdated", this.handleRoomListUpdated);
        this.socket.on("roomJoined", this.handleRoomJoined);
        this.socket.on("roomError", this.handleRoomError);

        // Botón: Crear sala pública
        this.createRoomBtn = this.add.text(400, 380, "Crear Sala Pública", { fontSize: "20px", color: "#ff0" })
            .setOrigin(0.5)
            .setInteractive()
            .on("pointerdown", () => {
                this.socket.emit("createRoom", this.session.nickname, false);
            });
        this.createRoomBtn.on("pointerover", () => {
            this.createRoomBtn.setStyle({ color: "#0f0" });
        }
        );
        this.createRoomBtn.on("pointerout", () => {
            this.createRoomBtn.setStyle({ color: "#ff0" });
        }
        );
        // Botón: Crear sala privada
        this.createPrivateRoomBtn = this.add.text(400, 420, "Crear Sala Privada", { fontSize: "20px", color: "#ff0" })
            .setOrigin(0.5)
            .setInteractive()
            .on("pointerdown", () => {
                this.socket.emit("createRoom", this.session.nickname, true);
            });
        this.createPrivateRoomBtn.on("pointerover", () => {
            this.createPrivateRoomBtn.setStyle({ color: "#0f0" });
        }
        );
        this.createPrivateRoomBtn.on("pointerout", () => {
            this.createPrivateRoomBtn.setStyle({ color: "#ff0" });
        }
        );
        // Botones de paginación
        this.prevBtn = this.add.text(140, 300, "< Anterior", { fontSize: "18px", color: "#0ff" })
            .setInteractive()
            .on("pointerdown", () => {
                if (this.currentPage > 0) {
                    this.currentPage--;
                    this.renderRoomList();
                }
            });
        this.prevBtn.on("pointerover", () => {
            if (this.currentPage > 0) {
                this.prevBtn.setStyle({ color: "#0f0" });
            }
        }
        );
        this.prevBtn.on("pointerout", () => {
            if (this.currentPage > 0) {
                this.prevBtn.setStyle({ color: "#0ff" });
            }
        }
        );

        this.nextBtn = this.add.text(550, 300, "Siguiente >", { fontSize: "18px", color: "#0ff" })
            .setInteractive()
            .on("pointerdown", () => {
                if ((this.currentPage + 1) * this.roomsPerPage < this.rooms.length) {
                    this.currentPage++;
                    this.renderRoomList();
                }
            });

        this.nextBtn.on("pointerover", () => {
            if ((this.currentPage + 1) * this.roomsPerPage < this.rooms.length) {
                this.nextBtn.setStyle({ color: "#0f0" });
            }
        }
        );
        this.nextBtn.on("pointerout", () => {
            if ((this.currentPage + 1) * this.roomsPerPage < this.rooms.length) {
                this.nextBtn.setStyle({ color: "#0ff" });
            }
        }
        );

        this.pageIndicator = this.add.text(400, 310, "", {
            fontSize: "18px",
            color: "#fff"
        }).setOrigin(0.5);

        // Eliminar los listeners del socket al cerrar la escena (evita un error en la siguiente escena)
        this.events.on('shutdown', () => {
            this.socket.off("roomListUpdated", this.handleRoomListUpdated);
            this.socket.off("roomJoined", this.handleRoomJoined);
            this.socket.off("roomError", this.handleRoomError);
        });

    }

    update() {
        // Desplazar el fondo en diagonal
        this.background.tilePositionX -= 0.12; // Mover en el eje X
        this.background.tilePositionY -= 0.12; // Mover en el eje Y
    }

    handleRoomListUpdated = (rooms) => {
        this.rooms = rooms;
        this.currentPage = 0;
        this.renderRoomList();
    }
    handleRoomJoined = (roomCode) => {
        window.history.pushState({}, "", `?room=${roomCode}`);
        this.scene.start("MainGame", { roomCode });
    }
    handleRoomError = (mensaje) => {
        const msg = this.add.text(400, 340, mensaje, { fontSize: "24px", color: "#f00" }).setOrigin(0.5);
        this.time.delayedCall(2000, () => {
            msg.destroy();
            window.history.pushState({}, "", "/");
        });
    }
    renderRoomList() {
        // Limpiar textos anteriores
        this.roomTexts.forEach(text => text.destroy());
        this.roomTexts = [];

        const start = this.currentPage * this.roomsPerPage;
        const end = start + this.roomsPerPage;
        const currentRooms = this.rooms.slice(start, end);

        let y = 100;

        currentRooms.forEach(room => {
            const roomText = this.add.text(400, y, `Sala: ${room.code} (${room.players}/8)`, {
                fontSize: "18px",
                color: "#0f0"
            }).setOrigin(0.5).setInteractive();

            roomText.on("pointerdown", () => {
                // console.log(`Unirse a la sala ${room.code} como ${this.session.nickname}`);
                this.socket.emit("joinRoom", room.code, this.session.nickname);
            });
            roomText.on("pointerover", () => {
                roomText.setStyle({ color: "#ff0" });
            });
            roomText.on("pointerout", () => {
                roomText.setStyle({ color: "#0f0" });
            });

            this.roomTexts.push(roomText);
            y += 40;
        });

        // Total de páginas (mínimo 1)
        const totalPages = Math.ceil(this.rooms.length / this.roomsPerPage) || 1;

        // Actualizar indicador de página
        this.pageIndicator.setText(`Página ${this.currentPage + 1} de ${totalPages}`);

        // Activar o desactivar los botones de navegación
        this.prevBtn.setAlpha(this.currentPage === 0 ? 0.5 : 1).disableInteractive();
        if (this.currentPage > 0) this.prevBtn.setInteractive();

        this.nextBtn.setAlpha((this.currentPage + 1 === totalPages) ? 0.5 : 1).disableInteractive();
        if (this.currentPage + 1 < totalPages) this.nextBtn.setInteractive();
        

        this.nextBtn.setStyle({ color: "#0ff" });
        this.prevBtn.setStyle({ color: "#0ff" });

    }
}