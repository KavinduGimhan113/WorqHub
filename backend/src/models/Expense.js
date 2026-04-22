/**
 * Expense record per tenant (vendor costs, payroll, supplies, etc.). Amounts in LKR.
 */
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** Amount in LKR */
    amount: { type: Number, required: true, min: 0 },
    /** When the cost was incurred */
    expenseDate: { type: Date, required: true },
    category: {
      type: String,
      trim: true,
      default: 'other',
    },
    description: { type: String, trim: true, default: '' },
    vendor: { type: String, trim: true },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'other',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

expenseSchema.index({ tenantId: 1, expenseDate: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
