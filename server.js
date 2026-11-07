
const express = require("express");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const path = require("path");

dotenv.config();
console.log("DB HOST:", process.env.DB_HOST);
console.log("DB PORT:", process.env.DB_PORT);
console.log("DB NAME:", process.env.DB_NAME);

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🔥 ATTENDIFY SERVER STARTING...");

// =====================================
// DATABASE CONNECTION - TiDB CLOUD
// =====================================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        minVersion: "TLSv1.2"
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
async function testDatabase() {
    try {
        const [rows] = await db.query(
            "SELECT VERSION() AS version"
        );
        console.log("✅ TiDB connected successfully!", rows[0].version);
    } catch (error) {
        console.error("Database connection failed:", error);
    }
}

testDatabase();

// =====================================
// MIDDLEWARE
// =====================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// =====================================
// HOME PAGE
// =====================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =====================================
// DATABASE TEST
// =====================================

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
            error: error.message
        });
    }
});

// =====================================
// REGISTER API
// =====================================

app.post("/api/register", async (req, res) => {
    try {
        const { name, email, phone, role, password } = req.body;

        if (!name || !email || !role || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        if (!["student", "faculty", "admin"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user role."
            });
        }

        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO users
            (name, email, phone, role, password)
            VALUES (?, ?, ?, ?, ?)`,
            [name, email, phone || null, role, hashedPassword]
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
            message: "Registration failed."
        });
    }
});

// =====================================
// LOGIN API
// =====================================

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password."
            });
        }

        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

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
            message: "Login failed."
        });
    }
});

// =====================================
// GET ALL STUDENTS
// =====================================

app.get("/api/students", async (req, res) => {
    try {
        const [students] = await db.query(
            `SELECT id, name, email
             FROM users
             WHERE role = 'student'
             ORDER BY name`
        );

        res.json({ success: true, students });

    } catch (error) {
        console.error("Students error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load students."
        });
    }
});

// =====================================
// GET ALL SUBJECTS
// =====================================

app.get("/api/subjects", async (req, res) => {
    try {
        const [subjects] = await db.query(
            `SELECT id, subject_name, subject_code
             FROM subjects
             ORDER BY subject_name`
        );

        res.json({ success: true, subjects });

    } catch (error) {
        console.error("Subjects error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load subjects."
        });
    }
});

// =====================================
// SAVE OR UPDATE ATTENDANCE
// =====================================

app.post("/api/attendance", async (req, res) => {
    try {
        const {
            studentId,
            subjectId,
            attendanceDate,
            status,
            facultyId
        } = req.body;

        if (!studentId || !subjectId ||
            !attendanceDate || !status) {
            return res.status(400).json({
                success: false,
                message: "Please fill all fields."
            });
        }

        if (!["Present", "Absent"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid attendance status."
            });
        }

        const [existing] = await db.query(
            `SELECT id FROM attendance
             WHERE student_id = ?
             AND subject_id = ?
             AND attendance_date = ?`,
            [studentId, subjectId, attendanceDate]
        );

        if (existing.length > 0) {
            await db.query(
                `UPDATE attendance
                 SET status = ?, faculty_id = ?
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
                message: "Attendance updated successfully."
            });
        }

        await db.query(
            `INSERT INTO attendance
            (student_id, subject_id, attendance_date, status, faculty_id)
            VALUES (?, ?, ?, ?, ?)`,
            [
                studentId,
                subjectId,
                attendanceDate,
                status,
                facultyId || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Attendance saved successfully."
        });

    } catch (error) {
        console.error("Attendance error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to save attendance.",
            error: error.message
        });
    }
});

// =====================================
// GET ATTENDANCE RECORDS
// =====================================

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
             JOIN users ON attendance.student_id = users.id
             JOIN subjects ON attendance.subject_id = subjects.id
             ORDER BY attendance.attendance_date DESC`
        );

        res.json({ success: true, records });

    } catch (error) {
        console.error("Get attendance error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load attendance records."
        });
    }
});

// =====================================
// STUDENT ATTENDANCE SUMMARY
// =====================================

app.get("/api/student/attendance/:studentId", async (req, res) => {
    try {
        const studentId = req.params.studentId;

        const [records] = await db.query(
            `SELECT
                attendance.attendance_date,
                attendance.status,
                subjects.subject_name,
                subjects.subject_code
             FROM attendance
             JOIN subjects ON attendance.subject_id = subjects.id
             WHERE attendance.student_id = ?
             ORDER BY attendance.attendance_date DESC`,
            [studentId]
        );

        const totalClasses = records.length;

        const presentClasses = records.filter(
            record => record.status === "Present"
        ).length;

        const overallPercentage = totalClasses > 0
            ? ((presentClasses / totalClasses) * 100).toFixed(2)
            : "0.00";

        const subjectMap = {};

        records.forEach(record => {
            const code = record.subject_code;

            if (!subjectMap[code]) {
                subjectMap[code] = {
                    subject_name: record.subject_name,
                    subject_code: code,
                    present: 0,
                    total: 0
                };
            }

            subjectMap[code].total++;

            if (record.status === "Present") {
                subjectMap[code].present++;
            }
        });

        const subjectWise = Object.values(subjectMap);

        subjectWise.forEach(subject => {
            subject.percentage = (
                (subject.present / subject.total) * 100
            ).toFixed(2);
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
        console.error("Student attendance error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load attendance."
        });
    }
});

// =====================================
// JOB APPLICATION - SUBMIT
// =====================================

app.post("/api/job-applications", async (req, res) => {
    try {
        const { name, email, phone, position, resume } = req.body;

        if (!name || !email || !phone || !position) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        const [result] = await db.query(
            `INSERT INTO job_applications
            (name, email, phone, position, resume)
            VALUES (?, ?, ?, ?, ?)`,
            [name, email, phone, position, resume || null]
        );

        res.status(201).json({
            success: true,
            message: "Job application submitted successfully!",
            applicationId: result.insertId
        });

    } catch (error) {
        console.error("Job application error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to submit job application."
        });
    }
});

// =====================================
// GET JOB APPLICATIONS
// =====================================

app.get("/api/job-applications", async (req, res) => {
    try {
        const [applications] = await db.query(
            `SELECT id, name, email, phone, position, resume, created_at
             FROM job_applications
             ORDER BY created_at DESC`
        );

        res.json({ success: true, applications });

    } catch (error) {
        console.error("Get applications error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load applications."
        });
    }
});

// =====================================
// CONTACT FORM - SUBMIT MESSAGE
// =====================================

app.post("/api/contact", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        const [result] = await db.query(
            `INSERT INTO contact_messages
            (name, email, subject, message)
            VALUES (?, ?, ?, ?)`,
            [name, email, subject, message]
        );

        res.status(201).json({
            success: true,
            message: "Message sent successfully!",
            messageId: result.insertId
        });

    } catch (error) {
        console.error("Contact API error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to send message."
        });
    }
});

// =====================================
// GET CONTACT MESSAGES
// =====================================

app.get("/api/contact", async (req, res) => {
    try {
        const [messages] = await db.query(
            `SELECT id, name, email, subject, message, created_at
             FROM contact_messages
             ORDER BY created_at DESC`
        );

        res.json({ success: true, messages });

    } catch (error) {
        console.error("Get contact messages error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load contact messages."
        });
    }
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Attendify running on port ${PORT}`);
});
