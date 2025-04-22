export class Title extends Phaser.Scene {
    constructor() {
        super({ key: "Title" });
    }

    create() {
        this.add.text(400, 200, "Casino X", { fontSize: "32px", color: "#fff" }).setOrigin(0.5);
        const playButton = this.add.text(400, 350, "> Lista de salas <", { fontSize: "24px", color: "#ff0" })
            .setOrigin(0.5)
            .setInteractive();

        playButton.on("pointerdown", () => {
            this.scene.start("Rooms");
        });

        // Crear socket y guardarlo en registry
        // this.registry.set("socket", io());
    }
}