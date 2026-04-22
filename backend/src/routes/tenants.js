const express = require('express');
const tenantController = require('../controllers/tenantController');
const { auth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

const router = express.Router();

router.use(auth);
router.use(requireAdmin);

router.get('/', tenantController.list);
router.get('/:id', tenantController.get);
router.post('/', tenantController.create);
router.put('/:id', tenantController.update);

module.exports = router;
