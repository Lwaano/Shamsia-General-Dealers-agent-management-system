const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { transactionsReport, floatReport, inventoryReport } = require('../controllers/reportController');

const router = Router();

router.use(authenticate, authorize('ADMIN', 'MANAGER'));

router.get('/transactions', transactionsReport);
router.get('/float', floatReport);
router.get('/inventory', inventoryReport);

module.exports = router;
