const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ============ SIGNUP ============
// Business owner naya account banata hai
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check: kya field khali hai?
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Sab fields zaroori hain" });
    }

    // Check: kya ye email pehle se registered hai?
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Ye email pehle se registered hai" });
    }

    // Password ko hash karo (plain text kabhi save nahi karte)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Naya user database mein save karo
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // JWT token banao - ye login "session" jaisa kaam karega
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Account ban gaya!",
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============ LOGIN ============
// Business owner apne existing account mein login karta hai
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email aur password zaroori hain" });
    }

    // User ko email se dhundo
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email ya password ghalat hai" });
    }

    // Password check karo (hashed password se compare)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Email ya password ghalat hai" });
    }

    // Token banao
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Login successful!",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};