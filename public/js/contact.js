document.addEventListener("DOMContentLoaded", function () {

    const contactForm = document.getElementById("contactForm");
    const successMessage = document.getElementById("successMessage");

    contactForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        // Get form values
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const subject = document.getElementById("subject").value.trim();
        const message = document.getElementById("message").value.trim();

        // Check required fields
        if (!name || !email || !subject || !message) {

            successMessage.classList.remove("d-none");
            successMessage.className = "alert alert-danger mt-3";
            successMessage.textContent = "Please fill in all the fields.";

            return;
        }

        try {

            // Send data to Node.js backend
            const response = await fetch("/api/contact", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    email: email,
                    subject: subject,
                    message: message
                })

            });

            const data = await response.json();

            if (data.success) {

                // Show success message
                successMessage.className = "alert alert-success mt-3";
                successMessage.textContent =
                    "Thank you! Your message has been received successfully.";

                // Clear form
                contactForm.reset();

            } else {

                // Show error message
                successMessage.className = "alert alert-danger mt-3";
                successMessage.textContent =
                    data.message || "Unable to send your message.";

            }

        } catch (error) {

            console.error("Contact form error:", error);

            successMessage.className = "alert alert-danger mt-3";
            successMessage.textContent =
                "Unable to connect to the server. Please try again.";

        }

    });

});



    