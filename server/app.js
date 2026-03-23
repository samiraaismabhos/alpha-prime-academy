require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./mysql");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

/* ================= AUTH ================= */

// REGISTER
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const [existing] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed]
    );

    const token = jwt.sign(
      { id: result.insertId, role: "student", email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ message: "registered", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = users[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= MIDDLEWARE ================= */

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function admin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

/* ================= COURSES ================= */

// GET ALL
app.get("/courses", async (req, res) => {
  try {
    const [courses] = await db.query(
      "SELECT * FROM courses WHERE status='active'"
    );
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ONE
app.get("/courses/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [courses] = await db.query(
      "SELECT * FROM courses WHERE id = ?",
      [id]
    );

    if (courses.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(courses[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE
app.post("/courses", auth, admin, async (req, res) => {
  try {
    const { title, description, level, price } = req.body;

    const [result] = await db.query(
      "INSERT INTO courses (title, description, level, price) VALUES (?, ?, ?, ?)",
      [title, description, level, price]
    );

    res.status(201).json({
      message: "course created",
      id: result.insertId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
app.put("/courses/:id", auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, level, price } = req.body;

    await db.query(
      "UPDATE courses SET title=?, description=?, level=?, price=? WHERE id=?",
      [title, description, level, price, id]
    );

    res.json({ message: "course updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
app.delete("/courses/:id", auth, admin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM courses WHERE id = ?", [id]);

    res.json({ message: "course deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= ENROLLMENTS ================= */

// ENROLL COURSE
app.post("/enroll/:courseId", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.courseId;

    const [courses] = await db.query(
      "SELECT * FROM courses WHERE id = ?",
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const [existing] = await db.query(
      "SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?",
      [userId, courseId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Already enrolled" });
    }

    await db.query(
      "INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)",
      [userId, courseId]
    );

    res.json({ message: "Enrolled successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MY ENROLLED COURSES
app.get("/my-courses", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT courses.id, courses.title, courses.description, courses.level, courses.price
       FROM enrollments
       JOIN courses ON enrollments.course_id = courses.id
       WHERE enrollments.user_id = ?`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= SERVER ================= */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});