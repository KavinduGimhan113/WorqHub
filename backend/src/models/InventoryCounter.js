/**
 * Per-tenant sequence for auto-generated inventory SKUs (WIDGET-001, …).
 */
const mongoose = require('mongoose');

const inventoryCounterSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: false }
);

module.exports = mongoose.model('InventoryCounter', inventoryCounterSchema);
