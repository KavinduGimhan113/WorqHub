/**
 * Per-tenant sequence for human-readable work order numbers.
 */
const mongoose = require('mongoose');

const workOrderCounterSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: false }
);

module.exports = mongoose.model('WorkOrderCounter', workOrderCounterSchema);
