/**
 * Work order model. Strictly scoped by tenantId.
 */
const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    /** Monotonic per tenant (assigned on create) — displayed as 001, 002, … */
    workOrderNumber: { type: Number, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'draft',
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    scheduledAt: { type: Date },
    completedAt: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    /** Field staff (Employee records) assigned to the job */
    assignedEmployeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    items: [
      {
        name: String,
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryCategory' },
        /** When set, quantity changes adjust Inventory.quantity for this tenant. */
        inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
        quantity: Number,
      },
    ],
  },
  { timestamps: true }
);

workOrderSchema.index({ tenantId: 1, createdAt: -1 });
workOrderSchema.index({ tenantId: 1, status: 1 });
workOrderSchema.index({ tenantId: 1, workOrderNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('WorkOrder', workOrderSchema);
