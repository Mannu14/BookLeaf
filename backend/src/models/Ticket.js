const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema(
  {
    ticket_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: true,
    },
    author_id: {
      type: String,
      required: true,
      index: true,
    },
    author_name: {
      type: String,
      required: true,
    },
    author_email: {
      type: String,
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null,
    },
    book_id: {
      type: String,
      default: null,
    },
    book_title: {
      type: String,
      default: 'General / Account Level',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'Royalty & Payments',
        'ISBN & Metadata Issues',
        'Printing & Quality',
        'Distribution & Availability',
        'Book Status & Production Updates',
        'General Inquiry',
      ],
      default: 'General Inquiry',
      index: true,
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
      index: true,
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      default: null,
    },
    assigned_to_name: {
      type: String,
      default: null,
    },
    ai_classification: {
      category: { type: String },
      confidence: { type: Number },
      reasoning: { type: String },
      overridden: { type: Boolean, default: false },
      overridden_by: { type: String },
      overridden_at: { type: Date },
    },
    ai_priority: {
      priority: { type: String },
      confidence: { type: Number },
      reasoning: { type: String },
      overridden: { type: Boolean, default: false },
      overridden_by: { type: String },
      overridden_at: { type: Date },
    },
    ai_draft_response: {
      draft: { type: String },
      model_used: { type: String },
      generated_at: { type: Date },
      token_estimate: { type: Number },
      policy_applied: [{ type: String }],
    },
    attachment: {
      filename: { type: String },
      original_name: { type: String },
      mime_type: { type: String },
      size: { type: Number },
      url: { type: String },
    },
    resolved_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for queue filtering and sorting: priority + status + created_at
TicketSchema.index({ status: 1, priority: 1, created_at: -1 });

module.exports = mongoose.model('Ticket', TicketSchema);
