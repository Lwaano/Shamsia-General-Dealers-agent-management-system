const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { summary } = require('../controllers/dashboardController');

const router = Router();

router.use(authenticate);
router.get('/summary', summary);

module.exports = router;
