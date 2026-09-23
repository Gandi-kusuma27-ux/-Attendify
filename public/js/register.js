const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const role = document.getElementById("role").value;
    const password = document.getElementById("password").value;
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const message = document.getElementById("message");


    // Check passwords
    if (password !== confirmPassword) {

        message.innerHTML = `
            <div class="alert alert-danger">
                Passwords do not match.
            </div>
        `;

        return;
    }


    try {

        const response = await fetch("/api/register", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name,
                email,
                phone,
                role,
                password
            })

        });


        const data = await response.json();


        if (data.success) {

            message.innerHTML = `
                <div class="alert alert-success">
                    Registration successful! You can now login.
                </div>
            `;

            registerForm.reset();

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