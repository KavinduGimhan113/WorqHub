/**
 * Per-tenant sequence for invoice numbers (INV-000-001, …).
 */
const mongoose = require('mongoose');

const invoiceCounterSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: false }
);

module.exports = mongoose.model('InvoiceCounter', invoiceCounterSchema);

