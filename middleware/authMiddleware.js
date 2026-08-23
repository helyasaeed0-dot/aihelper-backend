const jwt = require("jsonwebtoken");

// Ye middleware check karta hai ke request ke sath valid token hai ya nahi
// Isko har "protected" route mein use karenge (jaise dashboard ki APIs)
module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization; // format: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Login zaroori hai" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // ab agle route mein req.userId use kar sakte hain
    next(); // aage badho
  } catch (error) {
    return res.status(401).json({ message: "Token invalid ya expired hai" });
  }
};