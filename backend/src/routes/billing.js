const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const { auth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const router = express.Router();

router.use(auth);
router.use(requireTenant);

router.get('/invoices', invoiceController.list);
router.get('/invoices/:id', invoiceController.get);
router.post('/invoices', invoiceController.create);
router.put('/invoices/:id', invoiceController.update);
router.delete('/invoices/:id', invoiceController.remove);

module.exports = router;
