/**
 * Adjust Inventory quantities when work order line items change.
 * Uses per-line inventoryId + quantity; lines without inventoryId do not affect stock.
 */
const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const ApiError = require('./ApiError');

function aggregateInventoryQty(items) {
  const m = new Map();
  for (const it of items || []) {
    if (!it?.inventoryId) continue;
    const id = String(it.inventoryId);
    const q = Number(it.quantity);
    if (!Number.isFinite(q) || q <= 0) continue;
    m.set(id, (m.get(id) || 0) + q);
  }
  return m;
}

/**
 * Apply stock changes: new totals vs previous totals per inventory row.
 * Returns stock first (delta < 0) then consumes (delta > 0) so validation sees freed capacity.
 */
async function applyWorkOrderInventoryDelta(tenantId, oldItems, newItems) {
  const tenant =
    tenantId instanceof mongoose.Types.ObjectId ? tenantId : new mongoose.Types.ObjectId(String(tenantId));
  const oldMap = aggregateInventoryQty(oldItems);
  const newMap = aggregateInventoryQty(newItems);
  const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);
  const steps = [];
  for (const id of allIds) {
    const oldQ = oldMap.get(id) || 0;
    const newQ = newMap.get(id) || 0;
    const delta = newQ - oldQ;
    if (delta !== 0) steps.push({ inventoryId: id, delta });
  }
  steps.sort((a, b) => a.delta - b.delta);

  const applied = [];
  try {
    for (const { inventoryId, delta } of steps) {
      if (delta < 0) {
        const addBack = -delta;
        await Inventory.updateOne(
          { _id: inventoryId, tenantId: tenant },
          { $inc: { quantity: addBack } }
        );
        applied.push({ inventoryId, delta });
      } else if (delta > 0) {
        const inv = await Inventory.findOneAndUpdate(
          { _id: inventoryId, tenantId: tenant, quantity: { $gte: delta } },
          { $inc: { quantity: -delta } },
          { new: true }
        );
        if (!inv) {
          const cur = await Inventory.findOne({ _id: inventoryId, tenantId: tenant })
            .select('name quantity sku')
            .lean();
          const label = cur ? `${cur.sku ? `${cur.sku} · ` : ''}${cur.name || 'item'}` : 'item';
          const avail = cur ? Number(cur.quantity) || 0 : 0;
          throw new ApiError(
            400,
            `Cannot save this work order — not enough stock for ${label}. Only ${avail} available; this order needs ${delta} more.`
          );
        }
        applied.push({ inventoryId, delta });
      }
    }
  } catch (e) {
    for (const { inventoryId, delta } of applied.reverse()) {
      await Inventory.updateOne({ _id: inventoryId, tenantId: tenant }, { $inc: { quantity: delta } });
    }
    throw e;
  }
}

module.exports = {
  aggregateInventoryQty,
  applyWorkOrderInventoryDelta,
};
