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
router.post('/', inventoryController.create);
/** On parent router so `/next-sku` is never matched as `/:id` (safe across Express versions). */
router.get('/next-sku', inventoryController.suggestNextSku);

const inventoryScoped = express.Router();
inventoryScoped.get('/:id', inventoryController.get);
inventoryScoped.put('/:id', inventoryController.update);
inventoryScoped.delete('/:id', inventoryController.remove);
router.use('/', inventoryScoped);

module.exports = router;
