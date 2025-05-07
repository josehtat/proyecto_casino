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

        //assets del fondo
        this.load.image("checkerboard", "checkerboard.png"); // Cargar la textura de cuadros
        this.load.image('tiles', '2D_TopDown_Tileset_Casino_1024x512.png');  // tileset
        this.load.tilemapTiledJSON('map', 'mapa_casino.json');  // Mapa de Tiled

        //assets de las teclas
        this.load.image('keyW', 'keys/W.png');
        this.load.image('keyA', 'keys/A.png');
        this.load.image('keyS', 'keys/S.png');
        this.load.image('keyD', 'keys/D.png');
        this.load.image('keyE', 'keys/E.png');
        this.load.image('keyT', 'keys/T.png');
        this.load.image('keyEsc', 'keys/ESC.png');

        //assets de cartas, están en assets/cards
        //las cartas tienen nombres como "2-C.png", "A-C.png" para los ases, "J-C.png" para las J, "Q-C.png" para las Q y "K-C.png" para las K
        //los palos de las cartas son C (Clubs), D (Diamonds), H (hearts) y P (spades)
        const suits = ['C', 'D', 'H', 'P'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        suits.forEach(suit => {
            ranks.forEach(rank => {
            this.load.image(`${rank}-${suit}`, `cards/${rank}-${suit}.png`);
            });
        });
        this.load.image('back', 'cards/BACK.png'); // Cargar la parte trasera de la carta

    }

    create() {
        this.scene.start("Play");
    }
}
