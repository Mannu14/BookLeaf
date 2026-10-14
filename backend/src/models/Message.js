const mongoose = require('mongoose');

// Public conversation on a ticket. Everything here is visible to the author.
const MessageSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender_name: { type: String, required: true },
    sender_role: { type: String, enum: ['author', 'admin'], required: true },
    body: { type: String, required: true, maxlength: 10000 },
    // Admin replies only: was the AI draft used, and was it edited before sending?
    ai_assisted: { type: Boolean, default: false },
    ai_draft_edited: { type: Boolean, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('Message', MessageSchema);
