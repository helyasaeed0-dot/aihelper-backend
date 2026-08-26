require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/businessRoutes");
const chatRoutes = require("./routes/chatRoutes");
const importRoutes = require("./routes/importRoutes");

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// Public folder
app.use(express.static("public"));

// ===== Routes =====
app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/import", importRoutes);

// ===== Test route =====
app.get("/", (req, res) => {
  res.send("AIHelper backend is running!");
});

// ===== MongoDB Connection =====
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ===== Export app for Vercel =====
module.exports = app;