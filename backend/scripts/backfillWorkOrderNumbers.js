/**
 * Backfill workOrderNumber for existing work orders.
 *
 * It assigns a per-tenant sequence (001, 002, 003, ...) into `workOrderNumber`
 * for documents that don't have the field yet.
 *
 * Run:
 *   cd backend
 *   node scripts/backfillWorkOrderNumbers.js
 */
require('dotenv').config();

const mongoose = require('mongoose');
const Tenant = require('../src/models/Tenant');
const WorkOrder = require('../src/models/WorkOrder');
const WorkOrderCounter = require('../src/models/WorkOrderCounter');
const { mongoUri } = require('../src/config/env');

function nextAvailableNumber(used, startAt) {
  let n = startAt;
  while (used.has(n)) n += 1;
  return n;
}

async function run() {
  if (!mongoUri) {
    console.error('Missing MONGO_URI in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const tenants = await Tenant.find({}).select('_id').lean();
  console.log(`Tenants found: ${tenants.length}`);

  for (const t of tenants) {
    const tenantId = t._id;
    const workOrders = await WorkOrder.find({ tenantId })
      .sort({ createdAt: 1 })
      .select('_id workOrderNumber')
      .lean();

    const used = new Set(
      workOrders
        .map((wo) => wo.workOrderNumber)
        .filter((x) => x != null && Number.isFinite(Number(x)))
        .map((x) => Number(x))
    );

    let next = 1;
    const updates = [];

    for (const wo of workOrders) {
      const current = wo.workOrderNumber;
      if (current != null && Number.isFinite(Number(current))) continue;

      const assign = nextAvailableNumber(used, next);
      used.add(assign);
      next = assign + 1;

      updates.push({
        updateOne: {
          filter: { _id: wo._id, tenantId },
          update: { $set: { workOrderNumber: assign } },
        },
      });
    }

    if (updates.length > 0) {
      await WorkOrder.bulkWrite(updates, { ordered: false });
    }

    // Max must include newly assigned numbers (old `workOrders` array is stale).
    let max = 0;
    for (const n of used) {
      if (Number.isFinite(n) && n > max) max = n;
    }

    // Next create does $inc → seq becomes max+1
    await WorkOrderCounter.findOneAndUpdate(
      { tenantId },
      { $set: { seq: max } },
      { upsert: true, new: true }
    );

    console.log(`Tenant ${tenantId}: backfilled ${updates.length} work orders (max=${max})`);
  }

  await mongoose.disconnect();
  console.log('Backfill complete');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

