import { Preloader } from './Preloader';
import { Play } from './Play';
import { Title } from './scenes/Title'
import { Rooms } from './scenes/Rooms'
import { MainGame } from './scenes/MainGame'
import Phaser from 'phaser';

const config = {
    title: 'Casino X',
    type: Phaser.AUTO,
    width: 800,
    height: 450,
    parent: 'game-container',
    dom: {
        createContainer: true
    },
    backgroundColor: '#192a56',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        Preloader,
        Play,
        Title,
        Rooms,
        MainGame
    ]
};

new Phaser.Game(config);
