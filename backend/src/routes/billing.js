<<<<<<< Updated upstream
const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const { auth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const router = express.Router();

router.use(auth);
router.use(requireTenant);

/** Outside /invoices/* so nothing can intercept the path (PDF download). */
router.get('/download-invoice/:id', invoiceController.downloadPdf);

/** Literal `/invoices/*` paths before `GET /invoices` and before `router.use('/invoices', …)` so they never hit `/:id`. */
router.get('/invoices/next-number', invoiceController.suggestNextNumber);
router.get('/invoices/pdf/:id', invoiceController.downloadPdf);
router.get('/invoices', invoiceController.list);
router.post('/invoices', invoiceController.create);

const invoicesScoped = express.Router();
invoicesScoped.get('/:id', invoiceController.get);
invoicesScoped.put('/:id', invoiceController.update);
invoicesScoped.delete('/:id', invoiceController.remove);
router.use('/invoices', invoicesScoped);

/** Alias for older clients / proxies that still call this path. */
router.get('/invoice-next-number', invoiceController.suggestNextNumber);

module.exports = router;
=======
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
>>>>>>> Stashed changes
