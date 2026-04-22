/**
 * Invoice model. Strictly scoped by tenantId.
 */
const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
    /** Monotonic per tenant (assigned on create) — displayed as INV-000-001 */
    invoiceSeq: { type: Number, index: true },
    number: { type: String, required: true, trim: true },
    status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft' },
    dueDate: { type: Date },
    paidAt: { type: Date },
    lineItems: [{ description: String, quantity: Number, unitPrice: Number, amount: Number }],
    subtotal: { type: Number, default: 0 },
    /** Optional % off subtotal (0 = none). */
    discountPercent: { type: Number, default: 0 },
    /** LKR amount computed from subtotal × discountPercent (stored for PDF/history). */
    discountAmount: { type: Number, default: 0 },
    /** Fixed government / levy amount in LKR (not a %). */
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

invoiceSchema.index({ tenantId: 1, number: 1 }, { unique: true });
invoiceSchema.index({ tenantId: 1, status: 1 });
invoiceSchema.index({ tenantId: 1, invoiceSeq: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
