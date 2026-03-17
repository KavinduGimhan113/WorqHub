/**
 * User model. Belongs to one tenant; role within that tenant.
 */
const mongoose = require('mongoose');

const ROLES = ['SuperAdmin', 'Admin', 'Manager', 'Staff'];

const userSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ROLES, default: 'Staff' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
