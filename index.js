require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// ===== Test route =====
app.get("/", (req, res) => {
  res.send("AIHelper backend is running!");
});

// ===== Export app for Vercel =====
module.exports = app;