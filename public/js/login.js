const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const message = document.getElementById("message");


    try {

        const response = await fetch("/api/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                password
            })

        });


        const data = await response.json();


        if (data.success) {

            message.innerHTML = `
                <div class="alert alert-success">
                    Login successful! Welcome to Attendify.
                </div>
            `;


            // Save logged-in user
            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );


            // Redirect according to role
            setTimeout(() => {

                if (data.user.role === "student") {

                    window.location.href =
                        "student-dashboard.html";

                } else if (data.user.role === "faculty") {

                    window.location.href =
                        "faculty-dashboard.html";

                } else if (data.user.role === "admin") {

                    window.location.href =
                        "admin-dashboard.html";

                }

            }, 1000);


        } else {

            message.innerHTML = `
                <div class="alert alert-danger">
                    ${data.message}
                </div>
            `;

        }

    } catch (error) {

        console.error(error);

        message.innerHTML = `
            <div class="alert alert-danger">
                Unable to connect to server.
            </div>
        `;

    }

});