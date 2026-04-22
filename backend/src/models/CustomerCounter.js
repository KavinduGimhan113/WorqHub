/**
 * Per-tenant sequence for auto-generated customer codes (CUS-001, …).
 */
const mongoose = require('mongoose');

const customerCounterSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: false }
);

module.exports = mongoose.model('CustomerCounter', customerCounterSchema);
