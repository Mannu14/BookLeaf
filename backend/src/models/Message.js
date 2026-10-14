const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: true,
    },
    sender_name: {
      type: String,
      required: true,
    },
    sender_role: {
      type: String,
      enum: ['author', 'admin', 'system'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    is_ai_drafted: {
      type: Boolean,
      default: false,
    },
    edited_by_admin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

module.exports = mongoose.model('Message', MessageSchema);

