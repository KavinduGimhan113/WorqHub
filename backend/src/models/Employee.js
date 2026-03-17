/**
 * Employee model. Strictly scoped by tenantId.
 */
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    employeeId: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    department: { type: String, trim: true },
    position: { type: String, trim: true },
    joinDate: { type: Date },
    status: { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
    address: { type: String, trim: true },
    notes: { type: String },
    photoUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

employeeSchema.index({ tenantId: 1, name: 1 });
employeeSchema.index({ tenantId: 1, employeeId: 1 }, { sparse: true });

module.exports = mongoose.model('Employee', employeeSchema);
