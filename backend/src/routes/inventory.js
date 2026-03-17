const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { auth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const router = express.Router();

router.use(auth);
router.use(requireTenant);

router.get('/', inventoryController.list);
router.get('/:id', inventoryController.get);
router.post('/', inventoryController.create);
router.put('/:id', inventoryController.update);
router.delete('/:id', inventoryController.remove);

module.exports = router;
