const mongoose = require("mongoose");

// Ye "User" business owner hai jo AIHelper par account banata hai
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // ek email se sirf ek account
    },
    password: {
      type: String,
      required: true, // ye hashed (encrypted) save hoga, plain text nahi
    },
  },
  { timestamps: true } // createdAt, updatedAt automatically add ho jayenge
);

module.exports = mongoose.model("User", userSchema);