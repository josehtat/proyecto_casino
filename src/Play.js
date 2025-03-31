import Phaser from "phaser";

// let keys;
// let player;

export class Play extends Phaser.Scene {

    constructor() {
        super({
            key: 'Play'
        });
    }

    init(){
        //recibir la sesión del jugador
        
    }

    create() {
        const scene = this;

        //creación del jugador
        this.player = this.physics.add.sprite(400, 400, 'character1idle');

        //creación de las teclas usables
        this.keys = this.input.keyboard.addKeys("W,A,S,D");

        //creación del socket
        this.socket = io();

        //recibir sesión
        this.fetchSession();
    }

    update() {
        //centrar cámara en el jugador
        this.scene.scene.cameras.main.centerOn(this.player.x, this.player.y);

        //movimiento del jugador
        this.player.setVelocity(0);
        if (this.keys.A.isDown) {
            this.player.setVelocityX(-150);
          } else if (this.keys.D.isDown) {
            this.player.setVelocityX(150);
          }
        
          if (this.keys.W.isDown) {
            this.player.setVelocityY(-150);
          } else if (this.keys.S.isDown) {
            this.player.setVelocityY(150);
          }
    }

    fetchSession() {
        fetch('/getSession')
        .then(response => {
            if (response.ok) {
            //   console.log('Respuesta de la sesión:', response.json());
              return response.json();
            } else {
              throw new Error(`Error al obtener la sesión: ${response.status} ${response.statusText}`);
            }
          })
          .then(data => {
            this.session = data; // Almacenamiento de la sesión del jugador
            console.log('Sesión del jugador:', this.session);
          })
          .catch(error => console.error('Error al obtener la sesión:', error));
    }
}