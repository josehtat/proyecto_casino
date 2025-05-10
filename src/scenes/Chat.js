import Phaser from 'phaser';

export class Chat extends Phaser.Scene {
    constructor() {
        super({ key: 'Chat' });
    }

    init(data) {
        this.socket = data.socket; // Recibir el socket desde la escena principal
        this.session = data.session; // Recibir la sesión del jugador
        this.roomCode = data.roomCode; // Recibir el código de la sala
    }

    create() {
        // creación del chat
        this.chatVisible = true;
    
        // Fondo del chat
        this.chatBox = this.add.rectangle(0, 300, 380, 120, 0x000000, 0.5)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(1000);

        // Caja de entrada del chat
        this.chatInput = this.add.dom(0, 420).createFromHTML('<input type="text" placeholder="Pulsa Esc para cerrar el chat" maxlength="100">')
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
        this.chatMessages = [`<div><strong>Sistema</strong>: ¡Puedes compartir esta sala copiando la dirección de la barra del navegador!</div>`];

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
        // this.isTyping = false;

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
                // this.isTyping = true;
                // Emitir evento para bloquear el movimiento
                this.events.emit('typing', true);
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
                // this.isTyping = false;
                // Emitir evento para desbloquear el movimiento
                this.events.emit('typing', false);
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


                input.value = '';
                input.blur();
                this.chatVisible = false;
                this.chatInput.setVisible(false);
                this.chatBox.setVisible(false);
                this.chatMessagesContainer.node.firstElementChild.style.overflowY = 'hidden';
                // this.isTyping = false;

                // Emitir evento para desbloquear el movimiento
                this.events.emit('typing', false);
            }
        });

        // Recibir los mensajes previos a la conexión del jugador
        this.socket.emit('getChatMessages', this.roomCode);
        this.socket.on('chatMessagesList', (messages) => {
            messages.forEach(({ id, nickname, text }) => {
                const message = `<div><strong>${nickname}</strong>: ${text}</div>`;
                this.chatMessages.push(message);
            });

            // Limitar a 100 mensajes
            if (this.chatMessages.length > 100) {
                this.chatMessages.splice(0, this.chatMessages.length - 100);
            }

            const chatDiv = this.chatMessagesContainer.node.firstElementChild;
            chatDiv.innerHTML = this.chatMessages.join('');
            chatDiv.scrollTop = chatDiv.scrollHeight; // autoscroll al final
        }
        );

        // Recibir mensajes de otros jugadores
        this.socket.on('chatMessageToRoom', ({ id, nickname, text }) => {
            console.log(`${nickname}: ${text}`);

            const message = `<div><strong>${nickname}</strong>: ${text}</div>`;

            // Añadir mensaje al array y limitar a 100
            this.chatMessages.push(message);
            if (this.chatMessages.length > 100) {
                this.chatMessages.shift(); // elimina el más antiguo
            }

            const chatDiv = this.chatMessagesContainer.node.firstElementChild;
            chatDiv.innerHTML = this.chatMessages.join('');
            chatDiv.scrollTop = chatDiv.scrollHeight; // autoscroll al final

            // Emitir evento para mostrar la burbuja de chat
            this.events.emit('showChatBubble', { id, text });

        });

    }
}