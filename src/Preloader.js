import Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
    constructor() {
        super({
            key: 'Preloader'
        });
    }

    preload() {
        this.load.setPath("assets/");

        this.load.spritesheet("character1idle", "Char_001_Idle.png", { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet("character2idle", "Char_002_Idle.png", { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet("character3idle", "Char_003_Idle.png", { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet("character4idle", "Char_004_Idle.png", { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet("character5idle", "Char_005_Idle.png", { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet("character6idle", "Char_006_Idle.png", { frameWidth: 48, frameHeight: 48 });

        this.load.spritesheet("character1walk", "Char_001.png", { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet("character2walk", "Char_002.png", { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet("character3walk", "Char_003.png", { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet("character4walk", "Char_004.png", { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet("character5walk", "Char_005.png", { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet("character6walk", "Char_006.png", { frameWidth: 48, frameHeight: 48 });

    }

    create() {
        this.scene.start("Play");
    }
}
