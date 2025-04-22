document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const formTitle = document.getElementById('formTitle');
    const toggleForm = document.getElementById('toggleForm');
    const showRegister = document.getElementById('showRegister');
    const errorMessage = document.getElementById('errorMessage');

    showRegister.addEventListener('click', (event) => {
        event.preventDefault();
        if (registerForm.style.display === 'none') {
            // Mostrar formulario de registro
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            formTitle.textContent = 'Registro';
            showRegister.textContent = '¿Ya tienes cuenta? Inicia sesión';
        } else {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            formTitle.textContent = 'Login';
            showRegister.textContent = '¿No tienes cuenta? Regístrate';
        }
        errorMessage.style.display = 'none';
    });

    loginForm.addEventListener('submit', async (event) => {
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
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                window.location.href = 'game.html';
            } else {
                errorMessage.textContent = data.message || 'Login fallido';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error al realizar el login:', error);
        }
    });

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                alert('Usuario registrado exitosamente. Ahora puedes iniciar sesión.');
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                formTitle.textContent = 'Login';
                showRegister.textContent = '¿No tienes cuenta? Regístrate';
            } else {
                const errorText = await response.text();
                errorMessage.textContent = errorText || 'Error al registrar usuario';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error al registrar usuario:', error);
        }
    });
});