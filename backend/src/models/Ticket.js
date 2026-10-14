const mongoose = require('mongoose');
const { CATEGORIES, PRIORITIES, STATUSES, PRIORITY_RANK, STATUS_RANK } = require('../constants');

const { ObjectId } = mongoose.Schema.Types;

// What the model suggested, and whether a human disagreed. Keeping the original
// suggestion after an override lets us measure classification accuracy later.
const AiSuggestionSchema = new mongoose.Schema(
  {
    value: String,
    confidence: Number,
    reasoning: String,
    overridden: { type: Boolean, default: false },
    overridden_by: String,
    overridden_at: Date,
  },
  { _id: false }
);

const AiCallMetaSchema = new mongoose.Schema(
  {
    source: String, // 'gemini' | 'openai' | 'fallback'
    model: String,
    latency_ms: Number,
    input_tokens: Number,
    output_tokens: Number,
    error: String, // why we fell back, if we did
  },
  { _id: false }
);

const AiDraftSchema = new mongoose.Schema(
  {
    text: String,
    generated_at: Date,
    // Set when the author replies after the draft was generated, so the admin UI
    // knows to offer a fresh one instead of a reply to an outdated message.
    stale: { type: Boolean, default: false },
    kb_sections: [String],
    meta: AiCallMetaSchema,
  },
  { _id: false }
);

const TicketSchema = new mongoose.Schema(
  {
    ticket_number: { type: String, required: true, unique: true },

    author: { type: ObjectId, ref: 'User', required: true },
    author_id: { type: String, required: true, index: true },
    author_name: { type: String, required: true },
    author_email: { type: String, required: true },

    book: { type: ObjectId, ref: 'Book', default: null },
    book_id: { type: String, default: null },
    book_title: { type: String, default: 'General / Account Level' },

    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },

    category: { type: String, enum: CATEGORIES, default: 'General Inquiry', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'Medium', index: true },
    status: { type: String, enum: STATUSES, default: 'Open', index: true },
    priority_rank: { type: Number },
    status_rank: { type: Number },

    assigned_to: { type: ObjectId, ref: 'User', default: null },
    assigned_to_name: { type: String, default: null },

    ai_category: AiSuggestionSchema,
    ai_priority: AiSuggestionSchema,
    ai_triage_meta: AiCallMetaSchema,
    ai_draft: AiDraftSchema,

    // Attachment metadata only; binary upload is out of scope (see README).
    attachment: {
      type: new mongoose.Schema(
        { original_name: String, mime_type: String, size_kb: Number },
        { _id: false }
      ),
      default: null,
    },

    first_response_at: { type: Date, default: null },
    resolved_at: { type: Date, default: null },
    last_activity_at: { type: Date, default: Date.now },
    // Lets the author UI badge tickets with a reply they haven't opened yet.
    unread_for_author: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TicketSchema.pre('save', function syncRanks(next) {
  this.priority_rank = PRIORITY_RANK[this.priority];
  this.status_rank = STATUS_RANK[this.status];
  next();
});

// Default queue order: active tickets first, then most urgent, then oldest.
TicketSchema.index({ status_rank: 1, priority_rank: 1, created_at: 1 });
TicketSchema.index({ author_id: 1, created_at: -1 });

module.exports = mongoose.model('Ticket', TicketSchema);
