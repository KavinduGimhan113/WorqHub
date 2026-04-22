<<<<<<< Updated upstream
/**
 * Customer model. Strictly scoped by tenantId.
 */
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** Stable display id per tenant: CUS-001, CUS-002, … */
    customerCode: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    billingAddress: { type: String, trim: true },
    notes: { type: String },
  },
  { timestamps: true }
);

customerSchema.index({ tenantId: 1, name: 1 });
customerSchema.index({ tenantId: 1, customerCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Customer', customerSchema);
=======
/**
 * Customer model. Strictly scoped by tenantId.
 */
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    billingAddress: { type: String, trim: true },
    notes: { type: String },
  },
  { timestamps: true }
);

customerSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('Customer', customerSchema);
>>>>>>> Stashed changes
