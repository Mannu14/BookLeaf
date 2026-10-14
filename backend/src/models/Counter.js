const mongoose = require('mongoose');

// Atomic sequence generator. countDocuments()+1 races under concurrent inserts;
// findOneAndUpdate with $inc does not.
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

CounterSchema.statics.next = async function next(name, start = 1000) {
  const doc = await this.findOneAndUpdate(
    { _id: name },
    [{ $set: { seq: { $add: [{ $ifNull: ['$seq', start] }, 1] } } }],
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', CounterSchema);
