<<<<<<< Updated upstream
/**
 * Inventory item model. Strictly scoped by tenantId.
 */
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryCategory' },
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    minQuantity: { type: Number, default: 0 },
    location: { type: String, trim: true },
  },
  { timestamps: true }
);

inventorySchema.index({ tenantId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
=======
/**
 * Inventory item model. Strictly scoped by tenantId.
 */
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, default: 'unit' },
    minQuantity: { type: Number, default: 0 },
    location: { type: String, trim: true },
  },
  { timestamps: true }
);

inventorySchema.index({ tenantId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
>>>>>>> Stashed changes
