const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business", // ye lead kis business ke liye hai
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    interest: {
      type: String, // jaise "Black T-shirt" - customer kis cheez mein interested tha
      default: "General inquiry",
    },
    status: {
      type: String,
      enum: ["New", "Warm", "Hot"], // sirf ye 3 values allowed
      default: "New",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);