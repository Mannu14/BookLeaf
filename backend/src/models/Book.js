const mongoose = require('mongoose');

// Mirrors the sample dataset one-to-one. Nullable fields (mrp, isbn, dates) are
// legitimately null for books that are still in production.
const BookSchema = new mongoose.Schema(
  {
    book_id: { type: String, required: true, unique: true, trim: true },
    author_id: { type: String, required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true, trim: true },
    isbn: { type: String, default: null, trim: true },
    genre: { type: String, default: null, trim: true },
    publication_date: { type: Date, default: null },
    status: { type: String, required: true, trim: true },
    mrp: { type: Number, default: null },
    author_royalty_per_copy: { type: Number, default: null },
    total_copies_sold: { type: Number, default: 0 },
    total_royalty_earned: { type: Number, default: 0 },
    royalty_paid: { type: Number, default: 0 },
    royalty_pending: { type: Number, default: 0 },
    last_royalty_payout_date: { type: Date, default: null },
    print_partner: { type: String, default: null },
    available_on: { type: [String], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

BookSchema.virtual('is_published').get(function isPublished() {
  return this.status === 'Published & Live';
});

BookSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Book', BookSchema);
