const express = require("express");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const path = require("path");

console.log("🔥 NEW SERVER.JS IS RUNNING");

// Load .env file
dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

// ===============================
// MySQL DATABASE CONNECTION
// ===============================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Test MySQL connection
async function testDatabase() {
    try {
        const connection = await db.getConnection();

        console.log("✅ MySQL connected successfully!");

        connection.release();
    } catch (error) {
        console.log("❌ MySQL connection failed!");
        console.log("Error:", error.message);
    }
}

testDatabase();

// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// HOME PAGE
// ===============================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// DATABASE TEST API
// ===============================

app.get("/api/test", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS test");

        res.json({
            success: true,
            message: "Attendify server and database are working!",
            database: true
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database connection failed",
            database: false,
            error: error.message
        });
    }
});

// ===============================
// START SERVER
// ===============================

// ===============================
// REGISTER API
// ===============================

app.post("/api/register", async (req, res) => {

    try {

        const {
            name,
            email,
            phone,
            role,
            password
        } = req.body;


        // Check required fields
        if (!name || !email || !role || !password) {

            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });

        }


        // Check whether email already exists
        const [existingUser] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );


        if (existingUser.length > 0) {

            return res.status(400).json({
                success: false,
                message: "Email already registered."
            });

        }


        // Encrypt password
        const hashedPassword = await bcrypt.hash(password, 10);


        // Insert user
        const [result] = await db.query(

            `INSERT INTO users
            (name, email, phone, role, password)
            VALUES (?, ?, ?, ?, ?)`,

            [
                name,
                email,
                phone,
                role,
                hashedPassword
            ]

        );


        res.status(201).json({

            success: true,

            message: "Registration successful!",

            userId: result.insertId

        });

    } catch (error) {

        console.error("Registration error:", error);

        res.status(500).json({

            success: false,

            message: "Registration failed.",

            error: error.message

        });

    }

});

// ===============================
// LOGIN API
// ===============================

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // Check required fields
        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message: "Please enter email and password."

            });

        }


        // Find user
        const [users] = await db.query(

            "SELECT * FROM users WHERE email = ?",

            [email]

        );


        // User not found
        if (users.length === 0) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password."

            });

        }


        const user = users[0];


        // Compare password with hashed password
        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password."

            });

        }


        // Login successful
        res.json({

            success: true,

            message: "Login successful!",

            user: {

                id: user.id,

                name: user.name,

                email: user.email,

                phone: user.phone,

                role: user.role

            }

        });


    } catch (error) {

        console.error("Login error:", error);

        res.status(500).json({

            success: false,

            message: "Login failed.",

            error: error.message

        });

    }

});

// =================================
// STUDENT ATTENDANCE API
// =================================

app.get("/api/student/attendance/:studentId", async (req, res) => {

    try {

        const studentId = req.params.studentId;


        // Get attendance records
        const [records] = await db.query(

            `SELECT
                attendance.attendance_date,
                attendance.status,
                subjects.subject_name,
                subjects.subject_code

             FROM attendance

             JOIN subjects
                ON attendance.subject_id = subjects.id

             WHERE attendance.student_id = ?

             ORDER BY attendance.attendance_date DESC`,

            [studentId]

        );


        // Overall calculations
        const totalClasses = records.length;

        const presentClasses = records.filter(
            record => record.status === "Present"
        ).length;


        let overallPercentage = 0;

        if (totalClasses > 0) {

            overallPercentage =
                ((presentClasses / totalClasses) * 100)
                .toFixed(2);

        }


        // Subject-wise attendance
        const subjectMap = {};


        records.forEach(record => {

            const code = record.subject_code;


            if (!subjectMap[code]) {

                subjectMap[code] = {

                    subject_name:
                        record.subject_name,

                    subject_code:
                        record.subject_code,

                    present: 0,

                    total: 0

                };

            }


            subjectMap[code].total++;


            if (record.status === "Present") {

                subjectMap[code].present++;

            }

        });


        const subjectWise =
            Object.values(subjectMap);


        subjectWise.forEach(subject => {

            subject.percentage =
                subject.total > 0
                    ? (
                        (subject.present /
                        subject.total) * 100
                    ).toFixed(2)
                    : "0.00";

        });


        res.json({

            success: true,

            overallPercentage,

            presentClasses,

            totalClasses,

            subjectWise,

            history: records

        });


    } catch (error) {

        console.error(
            "Attendance API error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Unable to load attendance.",

            error: error.message

        });

    }

});

// =================================
// GET ALL STUDENTS
// =================================

app.get("/api/students", async (req, res) => {

    try {

        const [students] = await db.query(

            `SELECT id, name, email
             FROM users
             WHERE role = 'student'
             ORDER BY name`

        );

        res.json({

            success: true,
            students: students

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,
            message: "Unable to load students."

        });

    }

});

// =================================
// GET ALL SUBJECTS
// =================================

app.get("/api/subjects", async (req, res) => {

    try {

        const [subjects] = await db.query(

            `SELECT id, subject_name, subject_code
             FROM subjects
             ORDER BY subject_name`

        );

        res.json({

            success: true,
            subjects: subjects

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,
            message: "Unable to load subjects."

        });

    }

});

// =================================
// SAVE ATTENDANCE
// =================================

app.post("/api/attendance", async (req, res) => {

    try {

        const {
            studentId,
            subjectId,
            attendanceDate,
            status,
            facultyId
        } = req.body;


        if (
            !studentId ||
            !subjectId ||
            !attendanceDate ||
            !status
        ) {

            return res.status(400).json({

                success: false,
                message: "Please fill all fields."

            });

        }


        // Check whether attendance already exists
        const [existing] = await db.query(

            `SELECT id
             FROM attendance
             WHERE student_id = ?
             AND subject_id = ?
             AND attendance_date = ?`,

            [
                studentId,
                subjectId,
                attendanceDate
            ]

        );


        if (existing.length > 0) {

            // Update existing attendance
            await db.query(

                `UPDATE attendance
                 SET status = ?,
                     faculty_id = ?
                 WHERE student_id = ?
                 AND subject_id = ?
                 AND attendance_date = ?`,

                [
                    status,
                    facultyId || null,
                    studentId,
                    subjectId,
                    attendanceDate
                ]

            );


            return res.json({

                success: true,

                message:
                    "Attendance updated successfully."

            });

        }


        // Insert new attendance
        await db.query(

            `INSERT INTO attendance
            (
                student_id,
                subject_id,
                attendance_date,
                status,
                faculty_id
            )
            VALUES (?, ?, ?, ?, ?)`,

            [
                studentId,
                subjectId,
                attendanceDate,
                status,
                facultyId || null
            ]

        );


        res.json({

            success: true,

            message:
                "Attendance saved successfully."

        });


    } catch (error) {

        console.error(
            "Attendance error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to save attendance.",

            error: error.message

        });

    }

});

// =================================
// GET ATTENDANCE RECORDS
// =================================

app.get("/api/attendance", async (req, res) => {

    try {

        const [records] = await db.query(

            `SELECT
                attendance.id,
                users.name AS student_name,
                subjects.subject_name,
                attendance.attendance_date,
                attendance.status

             FROM attendance

             JOIN users
                ON attendance.student_id = users.id

             JOIN subjects
                ON attendance.subject_id = subjects.id

             ORDER BY attendance.attendance_date DESC`

        );


        res.json({

            success: true,
            records: records

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Unable to load attendance records."

        });

    }

});

app.post(
    "/api/job-applications",
    async (req, res) => {

        try {

            const {
                name,
                email,
                phone,
                position,
                resume
            } = req.body;


            // Validation
            if (
                !name ||
                !email ||
                !phone ||
                !position
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please fill all required fields."

                });

            }


            // Insert application
            const [result] =
                await db.query(

                    `INSERT INTO job_applications
                    (
                        name,
                        email,
                        phone,
                        position,
                        resume
                    )
                    VALUES (?, ?, ?, ?, ?)`,

                    [
                        name,
                        email,
                        phone,
                        position,
                        resume || null
                    ]

                );


            res.status(201).json({

                success: true,

                message:
                    "Job application submitted successfully!",

                applicationId:
                    result.insertId

            });


        } catch (error) {

            console.error(
                "Job application error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to submit job application.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// CAREERS - GET ALL JOB APPLICATIONS
// =====================================================

app.get(
    "/api/job-applications",
    async (req, res) => {

        try {

            const [applications] =
                await db.query(

                    `SELECT
                        id,
                        name,
                        email,
                        phone,
                        position,
                        resume,
                        created_at
                     FROM job_applications
                     ORDER BY created_at DESC`

                );


            res.json({

                success: true,

                applications

            });


        } catch (error) {

            console.error(
                "Get applications error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to load applications.",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// CONTACT FORM - SUBMIT MESSAGE
// =====================================================

app.post("/api/contact", async (req, res) => {

    try {

        const {
            name,
            email,
            subject,
            message
        } = req.body;


        // Validation
        if (!name || !email || !message) {

            return res.status(400).json({

                success: false,

                message:
                    "Please fill all required fields."

            });

        }

app.post("/api/contact", async (req, res) => {

    try {

        const { name, email, subject, message } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {

            return res.status(400).json({
                success: false,
                message: "Please fill all fields."
            });

        }

//CONTACT
        // Insert message into MySQL
        const [result] = await db.query(
            `INSERT INTO contact_messages
            (name, email, subject, message)
            VALUES (?, ?, ?, ?)`,
            [
                name,
                email,
                subject,
                message
            ]
        );

        // Success response
        res.status(201).json({
            success: true,
            message: "Message sent successfully!",
            messageId: result.insertId
        });

    } catch (error) {

        console.error("Contact API Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to send message.",
            error: error.message
        });

    }

});

//CONTACT
////GET MESSAGES
        // Insert message into MySQL
        const [result] = await db.query(
            `INSERT INTO contact_messages
            (name, email, subject, message)
            VALUES (?, ?, ?, ?)`,
            [
                name,
                email,
                subject,
                message
            ]
        );

        // Success response
        res.status(201).json({
            success: true,
            message: "Message sent successfully!",
            messageId: result.insertId
        });

    } catch (error) {

        console.error("Contact API Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to send message.",
            error: error.message
        });

    }

});

app.listen(PORT, () => {
    console.log(`Attendify running at http://localhost:${PORT}`);
});


