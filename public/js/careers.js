document
    .getElementById("jobApplicationForm")
    .addEventListener("submit", async function (event) {

        // Stop page refresh
        event.preventDefault();

        // Get form values
        const name = document
            .getElementById("name")
            .value
            .trim();

        const email = document
            .getElementById("email")
            .value
            .trim();

        const phone = document
            .getElementById("phone")
            .value
            .trim();

        const position = document
            .getElementById("position")
            .value;

        const resume = document
            .getElementById("resume")
            .files[0];


        // Message area
        const message = document.getElementById(
            "applicationMessage"
        );


        // Basic validation
        if (!name || !email || !phone || !position) {

            message.innerHTML = `
                <div class="alert alert-danger">
                    Please fill all required fields.
                </div>
            `;

            return;
        }


        // Phone validation
        if (!/^[0-9]{10,15}$/.test(phone)) {

            message.innerHTML = `
                <div class="alert alert-danger">
                    Please enter a valid phone number.
                </div>
            `;

            return;
        }


        // Resume filename
        let resumeName = "";

        if (resume) {
            resumeName = resume.name;
        }


        try {

            // Send data to Node.js backend
            const response = await fetch(
                "/api/job-applications",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        name: name,
                        email: email,
                        phone: phone,
                        position: position,
                        resume: resumeName

                    })
                }
            );


            // Convert response to JSON
            const data = await response.json();


            // Successful application
            if (data.success) {

                message.innerHTML = `
                    <div class="alert alert-success">
                        <strong>Application Submitted!</strong><br>
                        Your application has been submitted
                        successfully.
                    </div>
                `;


                // Clear form
                document
                    .getElementById("jobApplicationForm")
                    .reset();


            } else {

                // Backend error
                message.innerHTML = `
                    <div class="alert alert-danger">
                        ${data.message}
                    </div>
                `;
            }


        } catch (error) {

            console.error(
                "Job Application Error:",
                error
            );


            message.innerHTML = `
                <div class="alert alert-danger">
                    Unable to submit your application.
                    Please try again.
                </div>
            `;

        }

    });