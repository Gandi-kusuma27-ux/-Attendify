const userData = localStorage.getItem("user");


// Check login
if (!userData) {

    window.location.href = "login.html";

} else {

    const student = JSON.parse(userData);

    document.getElementById("studentName").textContent =
        student.name;

    loadAttendance(student.id);
}


// =================================
// LOAD STUDENT ATTENDANCE
// =================================

async function loadAttendance(studentId) {

    try {

        const response = await fetch(
            `/api/student/attendance/${studentId}`
        );

        const data = await response.json();


        if (!data.success) {

            console.error(data.message);

            return;
        }


        // Overall attendance
        document.getElementById(
            "overallPercentage"
        ).textContent =
            data.overallPercentage + "%";


        document.getElementById(
            "presentClasses"
        ).textContent =
            data.presentClasses;


        document.getElementById(
            "totalClasses"
        ).textContent =
            data.totalClasses;


        // Subject attendance
        const subjectTable =
            document.getElementById("subjectTable");

        subjectTable.innerHTML = "";


        if (data.subjectWise.length === 0) {

            subjectTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        No attendance records available.
                    </td>
                </tr>
            `;

        } else {

            data.subjectWise.forEach(subject => {

                subjectTable.innerHTML += `

                    <tr>

                        <td>
                            ${subject.subject_name}
                        </td>

                        <td>
                            ${subject.subject_code}
                        </td>

                        <td>
                            ${subject.present}
                        </td>

                        <td>
                            ${subject.total}
                        </td>

                        <td>
                            <strong>
                                ${subject.percentage}%
                            </strong>
                        </td>

                    </tr>

                `;

            });

        }


        // Attendance history
        const historyTable =
            document.getElementById("historyTable");

        historyTable.innerHTML = "";


        if (data.history.length === 0) {

            historyTable.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center">
                        No attendance history available.
                    </td>
                </tr>
            `;

        } else {

            data.history.forEach(record => {

                historyTable.innerHTML += `

                    <tr>

                        <td>
                            ${record.attendance_date}
                        </td>

                        <td>
                            ${record.subject_name}
                        </td>

                        <td>
                            ${record.status}
                        </td>

                    </tr>

                `;

            });

        }


    } catch (error) {

        console.error(
            "Attendance loading error:",
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