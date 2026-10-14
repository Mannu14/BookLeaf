const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../constants');

// Authors and BookLeaf staff share one collection; `role` drives access control.
const UserSchema = new mongoose.Schema(
  {
    author_id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.AUTHOR },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    joined_date: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

UserSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    author_id: this.author_id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    city: this.city,
    joined_date: this.joined_date,
  };
};

module.exports = mongoose.model('User', UserSchema);
