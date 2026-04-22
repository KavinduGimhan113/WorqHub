/**
 * Mount all API routes under /api/v1.
 */
const express = require('express');
const auth = require('./auth');
const tenants = require('./tenants');
const workOrders = require('./workOrders');
const customers = require('./customers');
const inventory = require('./inventory');
const inventoryCategories = require('./inventoryCategories');
const billing = require('./billing');
const employees = require('./employees');
const reports = require('./reports');
const expenses = require('./expenses');

const router = express.Router();

router.use('/auth', auth);
router.use('/tenants', tenants);
router.use('/work-orders', workOrders);
router.use('/customers', customers);
router.use('/inventory', inventory);
router.use('/inventory-categories', inventoryCategories);
router.use('/billing', billing);
router.use('/employees', employees);
router.use('/reports', reports);
router.use('/expenses', expenses);

module.exports = router;
