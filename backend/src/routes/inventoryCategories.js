/**
 * Inventory categories — mounted at /inventory-categories to avoid any conflict
 * with /inventory/:id style routes on the main inventory router.
 */
const express = require('express');
const inventoryCategoryController = require('../controllers/inventoryCategoryController');
const { auth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const router = express.Router();

router.use(auth);
router.use(requireTenant);

router.get('/', inventoryCategoryController.list);
router.post('/', inventoryCategoryController.create);
router.delete('/:id', inventoryCategoryController.remove);

module.exports = router;
