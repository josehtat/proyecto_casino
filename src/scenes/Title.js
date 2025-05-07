export class Title extends Phaser.Scene {
    constructor() {
        super({ key: "Title" });
    }

    create() {
        // Agregar el fondo animado
        this.background = this.add.tileSprite(400, 225, 800, 450, "checkerboard").setScale(4);

        // Título del juego
        this.add.text(400, 200, "Casino X", { fontSize: "32px", color: "#fff" }).setOrigin(0.5);

        // Botón para ir a la lista de salas
        const playButton = this.add.text(400, 350, "> Lista de salas <", { fontSize: "24px", color: "#ff0" })
            .setOrigin(0.5)
            .setInteractive();

        playButton.on("pointerdown", () => {
            this.scene.start("Rooms");
        });
        playButton.on("pointerover", () => {
            playButton.setStyle({ color: "#0f0" });
        });
        playButton.on("pointerout", () => {
            playButton.setStyle({ color: "#ff0" });
        });
    }

    update() {
        // Desplazar el fondo en diagonal
        this.background.tilePositionX -= 0.12; // Mover en el eje X
        this.background.tilePositionY -= 0.12; // Mover en el eje Y
    }
}