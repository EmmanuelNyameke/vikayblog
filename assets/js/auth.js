// Register
document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("registerForm");
    const registerBtn = document.getElementById("register-btn");
    const messageBox = document.getElementById("message");
    // Check if a user already exists
    fetch("http://127.0.0.1:9000/api/user_exists").then(res => res.json()).then(data => {
        if (data.exists){
            registerBtn.disabled = true;
            messageBox.textContent = "An admin already exists. Registration is disabled.";
            messageBox.style.color = "red";
        }
    });
    registerForm.addEventListener("submit", function(e){
        e.preventDefault();
        const payload = {
            username: registerForm.username.value,
            password: registerForm.password.value
        };
        fetch("http://127.0.0.1:9000/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(res => res.json().then(data => ({ status: res.status, body: data}))).then(({ status, body }) => {
            if (status === 200) {
                messageBox.textContent = body.message;
                messageBox.style.color = "green";
                registerForm.reset();
            }
            else {
                messageBox.textContent = body.detail;
                messageBox.style.color = "red";
            }
        }).catch(() => {
            messageBox.textContent = "Something went wrong.";
            messageBox.style.color = "red";
        });
    });
});


// Login
const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const messageBox = document.getElementById("message");
    fetch("http://127.0.0.1:9000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    }).then(res => res.json().then(data => ({ status: res.status, body: data }))).then(({ status, body}) => {
        if (status === 200) {
            localStorage.setItem("token", body.token);
            localStorage.setItem("username", body.username);
            messageBox.textContent = body.message;
            messageBox.style.color = "green";
            window.location.href = "../../vikayblog/admin/dashboard.html"
        }
        else{
            messageBox.textContent = body.detail;
            messageBox.style.color = "red";
        }
    }).catch(() => {
        messageBox.textContent = "Login failed. Please try again.";
        messageBox.style.color = "red";
    });
});
