document.addEventListener('DOMContentLoaded', (event) => {
    const form = document.getElementById("loginForm");

    // Detectar el parámetro ?room=XXXXX y añadirlo como campo oculto
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get("room");
    if (room) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "room";
        input.value = room;
        form.appendChild(input);
    }


    fetch('/getSession')
    .then(response => response.json())
    .then(data => {
        if (data.loggedin) {
            if (room) {
                window.location.href = `game.html?room=${room}`;
            }
            // Si el usuario está logueado, redirigir a la pantalla de juego
            window.location.href = 'game.html';
        }
    });
});

