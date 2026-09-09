const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveBranchFilter } = require('../middleware/branchScope');
const { summary } = require('../controllers/dashboardController');

const router = Router();

router.use(authenticate);
router.use(resolveBranchFilter);
router.get('/summary', summary);

module.exports = router;
