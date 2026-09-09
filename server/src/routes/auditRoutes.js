const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { list } = require('../controllers/auditController');

const router = Router();

router.use(authenticate, authorize('ADMIN'));
router.get('/', list);

module.exports = router;
