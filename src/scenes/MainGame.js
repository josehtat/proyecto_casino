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


    // creación del chat
    this.chatVisible = true;
    this.isTyping = false;

    // Chat box UI

    // this.chatBox = this.add.rectangle(0, 300, 380, 120, 0x000000, 0.5).setOrigin(0).setScrollFactor(0);
    // this.chatInput = this.add.dom(0, 420).createFromHTML('<input type="text" placeholder="Pulsa T para chatear" maxlength="100">').setScrollFactor(0);
    // this.chatInput.node.parentNode.style.position = 'absolute';
    // this.chatInput.node.parentNode.style.zIndex = '1000'; // el contenedor del input ha de estar por encima de otros elementos
    // this.chatInput.node.firstChild.style.width = '374px';
    // this.chatInput.node.firstChild.style.height = '20px';
    // this.chatInput.node.firstChild.style.background = 'white';
    // this.chatInput.node.firstChild.style.border = '1px solid black';
    // this.chatInput.node.firstChild.style.opacity = '1';
    // this.chatInput.node.firstChild.style.zIndex = '1000'; 

    // this.chatInput.setOrigin(0);
    // this.chatInput.setVisible(true);

    // // Activar chat con la tecla T
    // this.input.keyboard.on('keydown-T', () => {
    //     console.log('Tecla T presionada');
    //     this.chatVisible = true;
    //     // pasar el foco al input
    //     this.chatInput.setVisible(this.chatVisible);

    //     if (this.chatVisible) {
    //         this.chatInput.node.firstChild.focus();
    //         this.isTyping = true;
    //     } else {
    //         this.isTyping = false;
    //     }
    // });

    // // Manejar el envío de mensajes con Enter y cerrar chat con Escape
    // this.chatInput.node.addEventListener('keydown', (event) => {
    //     if (event.key === 'Enter') {
    //         const message = this.chatInput.node.value;
    //         this.socket.emit('chatMessageToServer', { roomCode: this.roomCode, nickname: this.session.nickname, message });
    //         this.chatInput.node.value = '';
    //         this.isTyping = false;
    //     } else if (event.key === 'Escape') {
    //         this.chatVisible = false;
    //         this.chatInput.setVisible(this.chatVisible);
    //         this.chatInput.node.blur();
    //         this.isTyping = false;
    //     }
    // });

    // Fondo del chat
    this.chatBox = this.add.rectangle(0, 300, 380, 120, 0x000000, 0.5)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1000);

    // Caja de entrada del chat
    this.chatInput = this.add.dom(0, 420).createFromHTML('<input type="text" placeholder="Pulsa T para chatear" maxlength="100">')
      .setScrollFactor(0).setOrigin(0).setDepth(1001);

    // Contenedor DOM para mensajes
    this.chatMessagesContainer = this.add.dom(0, 300).createFromHTML(`
  <div id="chatMessages" style="
    width: 374px;
    height: 100px;
    overflow-y: auto;
    font-size: 12px;
    color: white;
    font-family: monospace;
    padding: 4px;
    box-sizing: border-box;
  "></div>
`).setOrigin(0).setScrollFactor(0).setDepth(1001);
    this.chatMessagesContainer.node.parentNode.style.position = 'absolute';
    this.chatMessagesContainer.node.parentNode.style.zIndex = '1001';
    this.chatMessagesContainer.setVisible(true);

    // Array para almacenar mensajes
    this.chatMessages = [];

    const input = this.chatInput.node.firstChild;
    this.chatInput.node.parentNode.style.position = 'absolute';
    this.chatInput.node.parentNode.style.zIndex = '1001';
    input.style.width = '374px';
    input.style.height = '20px';
    input.style.background = 'white';
    input.style.border = '1px solid black';
    input.style.opacity = '1';
    input.style.zIndex = '1001';

    this.chatInput.setVisible(false);
    this.chatBox.setVisible(false);
    this.chatVisible = false;
    this.isTyping = false;

    // Evento para mostrar el chat
    this.input.keyboard.on('keydown-T', () => {
      if (!this.chatVisible) {
        this.chatVisible = true;
        this.chatInput.setVisible(true);
        this.chatBox.setVisible(true);
        this.chatMessagesContainer.setVisible(this.chatVisible);
        this.chatMessagesContainer.node.firstElementChild.style.overflowY = 'auto'; // Habilitar scroll
        setTimeout(() => {
          input.focus(); // Llama a focus() después de un breve retraso
        }, 10);
        this.isTyping = true;

        this.input.keyboard.removeCapture(['W', 'A', 'S', 'D']); // Libera las teclas WASD

      }
    });

    // Evento para ocultarlo con ESC
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.chatVisible) {
        this.chatVisible = false;
        this.chatInput.setVisible(false);
        this.chatBox.setVisible(false);
        this.chatMessagesContainer.node.firstElementChild.style.overflowY = 'hidden';
        input.blur();
        this.isTyping = false;

        // this.input.keyboard.addCapture(['W', 'A', 'S', 'D']); // Vuelve a capturar las teclas WASD
        // por lo visto no es necesario? bueno, mientras funcione no lo tocamos
      }
    });

    // Evento para enviar mensaje con ENTER
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.chatVisible && input.value.trim() !== '') {
        const message = input.value.trim();

        // Enviar mensaje al servidor
        this.socket.emit('chatMessageToServer', {
          roomCode: this.roomCode,
          nickname: this.session.nickname,
          text: message
        });

        // Mostrar mensaje sobre la cabeza del jugador (temporal)
        if (this.chatBubble) this.chatBubble.destroy();
        this.chatBubble = this.add.text(this.player.x, this.player.y - 48, message, {
          fontSize: '12px',
          fill: '#000',
          backgroundColor: '#fff',
          borderRadius: 5,
          border: '1px solid #000',
          padding: { x: 6, y: 2 }
        }).setOrigin(0.5);

        this.time.delayedCall(5000, () => {
          if (this.chatBubble) this.chatBubble.destroy();
        });

        input.value = '';
        input.blur();
        this.chatVisible = false;
        this.chatInput.setVisible(false);
        this.chatBox.setVisible(false);
        this.chatMessagesContainer.node.firstElementChild.style.overflowY = 'hidden';
        this.isTyping = false;
      }
    });

    this.socket.on('chatMessageToRoom', ({ id, nickname, text }) => {
      console.log(`${nickname}: ${text}`);
      // Mostrar mensaje en el chat
      // const chatMessage = this.add.text(10, 10, `${nickname}: ${text}`, {
      //   fontSize: '14px',
      //   fill: '#fff',
      //   backgroundColor: '#00000099',
      //   padding: { x: 4, y: 2 }
      // }).setOrigin(0, 0).setScrollFactor(0);
      // chatMessage.setDepth(1000); // Asegurarse de que el mensaje esté por encima del fondo del chat
      // // añadirlo a la array de mensajes
      // this.chatMessages.push(chatMessage);
      // // Eliminar mensajes antiguos
      // if (this.chatMessages.length > 5) {
      //   const oldMessage = this.chatMessages.shift();
      //   oldMessage.destroy();
      // }
      const message = `<div><strong>${nickname}</strong>: ${text}</div>`;

      // Añadir mensaje al array y limitar a 100
      this.chatMessages.push(message);
      if (this.chatMessages.length > 100) {
        this.chatMessages.shift(); // elimina el más antiguo
      }

      const chatDiv = this.chatMessagesContainer.node.firstElementChild;
      chatDiv.innerHTML = this.chatMessages.join('');
      chatDiv.scrollTop = chatDiv.scrollHeight; // autoscroll al final

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

}