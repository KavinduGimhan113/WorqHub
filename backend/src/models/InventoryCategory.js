/**
 * Inventory category — created manually per tenant; items reference categoryId.
 */
const mongoose = require('mongoose');

const inventoryCategorySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

inventoryCategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('InventoryCategory', inventoryCategorySchema);
