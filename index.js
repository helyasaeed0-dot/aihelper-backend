require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/businessRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

// ===== Middleware =====

app.use(cors());
app.use(express.json());

// ===== Test route =====

app.get("/", (req, res) => {
  res.send("AIHelper backend is running!");
});

// ===== Routes =====

app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/chat", chatRoutes);

// ===== Export app for Vercel =====

module.exports = app;