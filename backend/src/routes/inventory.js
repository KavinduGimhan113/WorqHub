<<<<<<< Updated upstream
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
/** On parent router so `/next-sku` is never matched as `/:id` (Express 5 still matches `/:id` first for some paths). */
router.get('/next-sku', inventoryController.suggestNextSku);
/** Under `/meta` so `/:id` cannot capture `low-stock` (Express 5 path matching). */
const inventoryMetaRouter = express.Router();
inventoryMetaRouter.get('/low-stock', inventoryController.lowStock);
router.use('/meta', inventoryMetaRouter);

const inventoryScoped = express.Router();
inventoryScoped.get('/:id', inventoryController.get);
inventoryScoped.put('/:id', inventoryController.update);
inventoryScoped.delete('/:id', inventoryController.remove);
router.use('/', inventoryScoped);

module.exports = router;
=======
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
>>>>>>> Stashed changes
