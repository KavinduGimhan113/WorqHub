const express = require('express');
const workOrderController = require('../controllers/workOrderController');
const { auth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const router = express.Router();

router.use(auth);
router.use(requireTenant);

router.get('/', workOrderController.list);
router.get('/:id', workOrderController.get);
router.post('/', workOrderController.create);
router.put('/:id', workOrderController.update);
router.delete('/:id', workOrderController.remove);

module.exports = router;
