const mongoose = require('mongoose');

// Staff-only notes. Never returned by author endpoints or emitted to author sockets.
const InternalNoteSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    admin_name: { type: String, required: true },
    note: { type: String, required: true, maxlength: 5000 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('InternalNote', InternalNoteSchema);
