import Phaser from 'phaser';


export class MainGame extends Phaser.Scene {
  constructor() {
    super({
      key: 'MainGame'
    });
  }
  init(data) {
    this.roomCode = data.roomCode;
    this.otherPlayers = {};
  }

  create() {
    // Obtener el socket - SUPER IMPORTANTE!! necesario para no crear un nuevo socket
    this.socket = this.game.socket;

    this.session = this.game.session;

    // Quitar los listeners por si acaso volvemos a entrar en esta escena: evita duplicados
    this.socket.removeAllListeners("playersList");
    this.socket.removeAllListeners("newPlayer");
    this.socket.removeAllListeners("movementUpdate");
    this.socket.removeAllListeners("playerDisconnected");

    // declaración de variable de tiempo, usada para no mandar 60 peticiones por segundo al server!
    this.timeSinceLastUpdate = 0;

    //creación de las teclas usables
    this.keys = this.input.keyboard.addKeys("W,A,S,D");

    //creación del fondo
    // Crear el mapa de Tiled
    this.map = this.make.tilemap({ key: 'map' });
    // Cargar tileset
    this.tileset = this.map.addTilesetImage('2D_TopDown_Tileset_Casino_2', 'tiles');

    // Crear capas del mapa utilizando ambos tilesets
    this.floor = this.map.createLayer('Suelo', this.tileset);
    this.ceiling = this.map.createLayer('Parte_Superior', this.tileset);
    this.decorations = this.map.createLayer('objetos', this.tileset);
    this.chairs = this.map.createLayer('mesas_sillas', this.tileset);
    this.gameboards = this.map.createLayer('juegos', this.tileset);
    this.chairs2 = this.map.createLayer('sillas_porencima', this.tileset);
    this.slots1 = this.map.createLayer('tragaperras1', this.tileset);
    this.slots2 = this.map.createLayer('tragaperras2', this.tileset);
    this.slots3 = this.map.createLayer('tragaperras3', this.tileset);
    this.pillars = this.map.createLayer('pilar_oscuro', this.tileset);
    this.slotsDeco = this.map.createLayer('soporte_tragaperras_pegadoPared', this.tileset);

    //colisión del suelo (esto hay que arreglarlo, está al contrario de lo deseado)
    this.ceiling.setCollisionByExclusion([-1], true);

    //creación del jugador
    this.player = this.physics.add.sprite(400, 400, 'character1idle');

    //nombre del jugador
    this.nameText = this.add.text(0, 0, this.session.nickname, {
      font: "14px Arial",
      fill: "#fff",
      backgroundColor: "#00000099",
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5, 1.5);

    //sets de animaciones:
    if (!this.anims.exists('c1_idle_down')) {
      this.anims.create({
        key: 'c1_idle_down',
        frames: this.anims.generateFrameNumbers('character1idle', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!this.anims.exists('c1_idle_left')) {
      this.anims.create({
        key: 'c1_idle_left',
        frames: this.anims.generateFrameNumbers('character1idle', { start: 4, end: 7 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!this.anims.exists('c1_idle_right')) {
      this.anims.create({
        key: 'c1_idle_right',
        frames: this.anims.generateFrameNumbers('character1idle', { start: 8, end: 11 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!this.anims.exists('c1_idle_up')) {
      this.anims.create({
        key: 'c1_idle_up',
        frames: this.anims.generateFrameNumbers('character1idle', { start: 12, end: 15 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!this.anims.exists('c1_walk_down')) {
      this.anims.create({
        key: 'c1_walk_down',
        frames: this.anims.generateFrameNumbers('character1walk', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!this.anims.exists('c1_walk_left')) {
      this.anims.create({
        key: 'c1_walk_left',
        frames: this.anims.generateFrameNumbers('character1walk', { start: 4, end: 7 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!this.anims.exists('c1_walk_right')) {
      this.anims.create({
        key: 'c1_walk_right',
        frames: this.anims.generateFrameNumbers('character1walk', { start: 8, end: 11 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!this.anims.exists('c1_walk_up')) {
      this.anims.create({
        key: 'c1_walk_up',
        frames: this.anims.generateFrameNumbers('character1walk', { start: 12, end: 15 }),
        frameRate: 4,
        repeat: -1
      });
    }





    // establecer colisiones entre el jugador y el suelo
    this.physics.add.collider(this.player, this.ceiling, (player, ceiling) => {
      console.log('Colisión detectada!');
    });
    const debugGraphics = this.add.graphics().setAlpha(0.75);
    this.floor.renderDebug(debugGraphics);


    // --- Multijugador ---
    // Recibir lista de jugadores
    this.socket.emit("getPlayers", this.roomCode);
    this.socket.on("playersList", (players) => {
      players.forEach(p => {
        if (p.id !== this.socket.id) {
          this.addOtherPlayer(p);
        }
      });
    });

    this.socket.on("newPlayer", (player) => {
      this.addOtherPlayer(player);
    });

    // Recibir movimiento de otros jugadores
    // this.socket.on("movementUpdate", ({ id, x, y, direction }) => {
    //   // console.log("Movimiento de otro jugador:", id, x, y);
    //   if (this.otherPlayers[id]) {
    //     this.otherPlayers[id].setPosition(x, y);
    //     this.otherPlayers[id].direction = direction;
    //     const anim = this.otherPlayers[id].anims.isPlaying ? `c1_walk_${direction}` : `c1_idle_${direction}`;
    //     this.otherPlayers[id].anims.play(anim, true);
    //   }
    // });

    this.socket.on("movementUpdate", ({ id, x, y, direction, isMoving }) => {
      const otherPlayer = this.otherPlayers[id];
      if (!otherPlayer) return;

      // Actualizar la dirección y la posición objetivo
      otherPlayer.direction = direction;
      otherPlayer.targetX = x;
      otherPlayer.targetY = y;
      otherPlayer.isMoving = isMoving;

    });

    // Recibir desconexión de otros jugadores
    this.socket.on("playerDisconnected", (id) => {
      if (this.otherPlayers[id]) {
        // Eliminar el sprite del otro jugador
        this.otherPlayers[id].nameText.destroy(); // Eliminar el texto del nombre
        this.otherPlayers[id].destroy();
        delete this.otherPlayers[id];
      }
    });

    // Lanzar la escena del chat
    this.scene.launch('Chat', {
      socket: this.socket,
      session: this.session,
      roomCode: this.roomCode
    });

    // Escuchar eventos de la escena del chat
    const chatScene = this.scene.get('Chat');

    chatScene.events.on('typing', (isTyping) => {
      this.isTyping = isTyping; // Bloquear o desbloquear el movimiento
    });

    chatScene.events.on('showChatBubble', ({ id, text }) => {
      const player = id === this.socket.id ? this.player : this.otherPlayers[id];
      if (player) {
        this.showChatBubble(player, text);
      }
    });


  }

  update(time, delta) {

    //centrar cámara en el jugador
    this.scene.scene.cameras.main.centerOn(this.player.x, this.player.y);

    //actualizar posición del texto del nombre
    this.nameText.setPosition(this.player.x, this.player.y);

    //movimiento del jugador
    let moving = false;
    //última dirección
    if (!this.player.direction) this.player.direction = 'down';

    this.player.setVelocity(0);
    if (this.keys.A.isDown) {
      this.player.setVelocityX(-150);
      this.player.direction = 'left';
      moving = true;
    } else if (this.keys.D.isDown) {
      this.player.setVelocityX(150);
      this.player.direction = 'right';
      moving = true;
    }

    if (this.keys.W.isDown) {
      this.player.setVelocityY(-150);
      this.player.direction = 'up';
      moving = true;
    } else if (this.keys.S.isDown) {
      this.player.setVelocityY(150);
      this.player.direction = 'down';
      moving = true;
    }
    // bloquear movimiento mientras se escribe en el chat
    if (this.isTyping) {
      this.player.setVelocity(0);
      moving = false;
      return;
    }

    // animaciones del jugador
    const anim = moving ? `c1_walk_${this.player.direction}` : `c1_idle_${this.player.direction}`;
    this.player.anims.play(anim, true);


    // Acumular el tiempo transcurrido
    this.timeSinceLastUpdate += delta;
    if (this.timeSinceLastUpdate >= 20) { // cada 20ms, cambiar valor según performance
      this.socket.emit("movement", {
        roomCode: this.roomCode,
        x: this.player.x,
        y: this.player.y,
        direction: this.player.direction,
        isMoving: moving
      });
      this.timeSinceLastUpdate = 0;
    }

    // Actualizar la posición de otros jugadores
    Object.values(this.otherPlayers).forEach((otherPlayer) => {
      otherPlayer.nameText.setPosition(otherPlayer.x, otherPlayer.y);
      if (otherPlayer.targetX !== undefined && otherPlayer.targetY !== undefined) {
        const speed = 150; // Velocidad fija
        const step = (speed / 60); // Movimiento por frame (asumiendo 60 FPS)

        // Movimiento en el eje X
        if (Math.abs(otherPlayer.targetX - otherPlayer.x) > step) {
          otherPlayer.x += otherPlayer.targetX > otherPlayer.x ? step : -step;
        } else {
          otherPlayer.x = otherPlayer.targetX; // Ajustar posición exacta
        }

        // Movimiento en el eje Y
        if (Math.abs(otherPlayer.targetY - otherPlayer.y) > step) {
          otherPlayer.y += otherPlayer.targetY > otherPlayer.y ? step : -step;
        } else {
          otherPlayer.y = otherPlayer.targetY; // Ajustar posición exacta
        }

        // Cambiar animación según el movimiento
        if (otherPlayer.isMoving) {
          otherPlayer.anims.play(`c1_walk_${otherPlayer.direction}`, true);
        } else {
          otherPlayer.anims.play(`c1_idle_${otherPlayer.direction}`, true);
        }
      }
    });

    // Actualizar posición de las burbujas de chat
    if (this.player.chatBubble) {
      this.player.chatBubble.setPosition(this.player.x, this.player.y - 48);
    }

    Object.values(this.otherPlayers).forEach((otherPlayer) => {
      if (otherPlayer.chatBubble) {
        otherPlayer.chatBubble.setPosition(otherPlayer.x, otherPlayer.y - 48);
      }
    });

  }

  addOtherPlayer(playerInfo) {
    const other = this.physics.add.sprite(playerInfo.x, playerInfo.y, "character1idle");
    other.playerId = playerInfo.id;
    other.nickname = playerInfo.nickname;

    const nameText = this.add.text(0, 0, playerInfo.nickname, {
      font: "14px Arial",
      fill: "#fff",
      backgroundColor: "#00000099",
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5, 1.5);

    other.nameText = nameText;

    this.otherPlayers[playerInfo.id] = other; // Agrega el jugador al objeto
  }

  showChatBubble(player, text) {
    // Eliminar burbuja anterior si existe
    if (player.chatBubble) {
      player.chatBubble.destroy();
    }

    // Crear nueva burbuja de chat
    player.chatBubble = this.add.text(player.x, player.y - 48, text, {
      fontSize: '12px',
      fill: '#000',
      backgroundColor: '#fff',
      padding: { x: 6, y: 2 }
    }).setOrigin(0.5);

    // Destruir la burbuja después de 5 segundos
    this.time.delayedCall(5000, () => {
      if (player.chatBubble) {
        player.chatBubble.destroy();
        player.chatBubble = null;
      }
    });
  }

}

