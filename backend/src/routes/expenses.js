const express = require('express');
const expenseController = require('../controllers/expenseController');
const { auth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const router = express.Router();

router.use(auth);
router.use(requireTenant);

router.get('/summary', expenseController.summary);
router.get('/', expenseController.list);
router.get('/:id', expenseController.get);
router.post('/', expenseController.create);
router.put('/:id', expenseController.update);
router.delete('/:id', expenseController.remove);

module.exports = router;
