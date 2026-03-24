const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const inventoryCategoryController = require('../controllers/inventoryCategoryController');
const { auth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const router = express.Router();

router.use(auth);
router.use(requireTenant);

// Sub-router so /categories is never captured by /:id (Express 5–safe)
const categoriesRouter = express.Router();
categoriesRouter.get('/', inventoryCategoryController.list);
categoriesRouter.post('/', inventoryCategoryController.create);
categoriesRouter.delete('/:id', inventoryCategoryController.remove);
router.use('/categories', categoriesRouter);

router.get('/', inventoryController.list);
router.get('/:id', inventoryController.get);
router.post('/', inventoryController.create);
router.put('/:id', inventoryController.update);
router.delete('/:id', inventoryController.remove);

module.exports = router;
