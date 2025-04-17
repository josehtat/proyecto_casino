import Phaser from "phaser";

// let keys;
// let player;

export class Play extends Phaser.Scene {

  constructor() {
    super({
      key: 'Play'
    });
  }

  init() {

  }

  create() {
    const scene = this;

    //creación del socket
    this.game.socket = io();
    this.game.session = {}; // Inicializar la sesión



    //recibir sesión
    this.fetchSession();
    
  }

  update() {

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
        this.game.session = data; // Almacenamiento de la sesión del jugador
        console.log('Sesión del jugador:', this.game.session);
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get("room");    
        if (roomCode) {
          this.game.socket.emit("joinRoom", roomCode, this.game.session.nickname);
          this.game.socket.on("roomJoined", () => {
            this.scene.start("MainGame", { roomCode });
          });
          this.game.socket.on("roomError", (mensaje) => {
            this.add.text(400, 200, mensaje, { fontSize: "24px", color: "#f00" }).setOrigin(0.5);
            this.time.delayedCall(2000, () => {
              window.history.pushState({}, "", "/");
              this.scene.start("Title");
            });
          });
        }else{
          this.scene.start("Title");
        }
    
        if (!data.loggedin) { // en el juego solo permitimos usuarios logueados, si no lo están, al login
          window.location.href = '/';
        }
      })
      .catch(error => console.error('Error al obtener la sesión:', error));
  }
}