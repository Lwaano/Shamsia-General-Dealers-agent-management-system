const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveBranchFilter } = require('../middleware/branchScope');
const { transactionsReport, floatReport, inventoryReport, exportExcel } = require('../controllers/reportController');

const router = Router();

router.use(authenticate, authorize('ADMIN', 'MANAGER'));
router.use(resolveBranchFilter);

router.get('/transactions', transactionsReport);
router.get('/float', floatReport);
router.get('/inventory', inventoryReport);
router.get('/export/excel', exportExcel);

module.exports = router;
