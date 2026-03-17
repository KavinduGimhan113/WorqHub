const express = require('express');
const customerController = require('../controllers/customerController');
const { auth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const router = express.Router();

router.use(auth);
router.use(requireTenant);

router.get('/', customerController.list);
router.get('/:id', customerController.get);
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.remove);

module.exports = router;
