const express = require('express');
const reportsController = require('../controllers/reportsController');
const { auth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const router = express.Router();

router.use(auth);
router.use(requireTenant);

router.get('/export/:dataset', reportsController.exportExcel);
router.get('/dashboard', reportsController.dashboard);
router.get('/work-orders', reportsController.workOrderStats);

module.exports = router;
