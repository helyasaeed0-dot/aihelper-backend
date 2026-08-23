const mongoose = require("mongoose");

// Ek message ka structure (customer ka ho ya AI ka)
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "ai"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    sessionId: {
      type: String, // widget har browser session ke liye ek random ID banayega
      required: true,
    },
    messages: [messageSchema],
  },
  { timestamps: true } // updatedAt batayega ke last message kab aya
);

module.exports = mongoose.model("Conversation", conversationSchema);