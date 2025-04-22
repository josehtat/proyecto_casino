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
        console.log("Room parameter detected:", room);
    }


    fetch('/getSession')
    .then(response => response.json())
    .then(data => {
        if (data.loggedin) {
            if (room) {
                window.location.href = `game.html?room=${room}`;
            }else{
                window.location.href = 'game.html';
            }
        }
    });

     // Manejar el envío del formulario con fetch
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ username, password, room }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Redirigir si el login es exitoso
            if (data.room) {
                window.location.href = `game.html?room=${data.room}`;
            } else {
                window.location.href = 'game.html';
            }
        } else {
            // Mostrar mensaje de error si el login falla
            const errorElement = document.getElementById('errorMessage');
            errorElement.textContent = data.message || 'Login failed';
            errorElement.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al realizar el login:', error);
    }
});
});


