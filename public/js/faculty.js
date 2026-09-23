const facultyData = localStorage.getItem("user");


// =================================
// CHECK FACULTY LOGIN
// =================================

if (!facultyData) {

    window.location.href = "login.html";

} else {

    const faculty = JSON.parse(facultyData);

    if (faculty.role !== "faculty") {

        window.location.href = "login.html";

    }

}


// =================================
// LOAD STUDENTS
// =================================

async function loadStudents() {

    try {

        const response =
            await fetch("/api/students");

        const data =
            await response.json();

        const studentSelect =
            document.getElementById("student");

        studentSelect.innerHTML =
            `<option value="">
                Select Student
            </option>`;


        data.students.forEach(student => {

            studentSelect.innerHTML += `

                <option value="${student.id}">

                    ${student.name}
                    (${student.email})

                </option>

            `;

        });

    } catch (error) {

        console.error(
            "Student loading error:",
            error
        );

    }

}


// =================================
// LOAD SUBJECTS
// =================================

async function loadSubjects() {

    try {

        const response =
            await fetch("/api/subjects");

        const data =
            await response.json();

        const subjectSelect =
            document.getElementById("subject");

        subjectSelect.innerHTML =
            `<option value="">
                Select Subject
            </option>`;


        data.subjects.forEach(subject => {

            subjectSelect.innerHTML += `

                <option value="${subject.id}">

                    ${subject.subject_name}
                    (${subject.subject_code})

                </option>

            `;

        });

    } catch (error) {

        console.error(
            "Subject loading error:",
            error
        );

    }

}


// =================================
// SET TODAY'S DATE
// =================================

document.getElementById(
    "attendanceDate"
).value = new Date()
    .toISOString()
    .split("T")[0];


// =================================
// MARK ATTENDANCE
// =================================

document
    .getElementById("attendanceForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();


        const studentId =
            document.getElementById("student").value;

        const subjectId =
            document.getElementById("subject").value;

        const attendanceDate =
            document.getElementById(
                "attendanceDate"
            ).value;

        const status =
            document.getElementById("status").value;


        const faculty =
            JSON.parse(localStorage.getItem("user"));


        const message =
            document.getElementById("message");


        try {

            const response =
                await fetch("/api/attendance", {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        studentId,
                        subjectId,
                        attendanceDate,
                        status,
                        facultyId: faculty.id

                    })

                });


            const data =
                await response.json();


            if (data.success) {

                message.innerHTML = `

                    <div class="alert alert-success">

                        Attendance saved successfully!

                    </div>

                `;


                document.getElementById(
                    "attendanceForm"
                ).reset();


                document.getElementById(
                    "attendanceDate"
                ).value = new Date()
                    .toISOString()
                    .split("T")[0];


                loadAttendanceRecords();

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


// =================================
// LOAD ATTENDANCE RECORDS
// =================================

async function loadAttendanceRecords() {

    try {

        const response =
            await fetch("/api/attendance");

        const data =
            await response.json();


        const table =
            document.getElementById(
                "attendanceTable"
            );


        table.innerHTML = "";


        if (
            !data.success ||
            data.records.length === 0
        ) {

            table.innerHTML = `

                <tr>

                    <td
                        colspan="4"
                        class="text-center">

                        No attendance records found.

                    </td>

                </tr>

            `;

            return;

        }


        data.records.forEach(record => {

            table.innerHTML += `

                <tr>

                    <td>
                        ${record.student_name}
                    </td>

                    <td>
                        ${record.subject_name}
                    </td>

                    <td>
                        ${record.attendance_date}
                    </td>

                    <td>

                        <span class="badge ${
                            record.status === "Present"
                                ? "bg-success"
                                : "bg-danger"
                        }">

                            ${record.status}

                        </span>

                    </td>

                </tr>

            `;

        });


    } catch (error) {

        console.error(
            "Attendance records error:",
            error
        );

    }

}


// =================================
// LOGOUT
// =================================

function logout() {

    localStorage.removeItem("user");

    window.location.href = "login.html";

}


// =================================
// INITIAL LOAD
// =================================

loadStudents();
loadSubjects();
loadAttendanceRecords();