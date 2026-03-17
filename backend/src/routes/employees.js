const express = require('express');
const employeeController = require('../controllers/employeeController');
const { auth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const router = express.Router();

router.use(auth);
router.use(requireTenant);

router.get('/', employeeController.list);
router.get('/:id', employeeController.get);
router.post('/', employeeController.create);
router.put('/:id', employeeController.update);
router.delete('/:id', employeeController.remove);

module.exports = router;
