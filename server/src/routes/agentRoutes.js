const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveBranchFilter } = require('../middleware/branchScope');
const { list, get, create, update } = require('../controllers/agentController');

const router = Router();

router.use(authenticate);
router.use(resolveBranchFilter);

router.get('/', list);
router.get('/:id', get);

router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('agentType').isIn(['MOBILE_MONEY_AGENT', 'BANKING_AGENT']).withMessage('Invalid agent type'),
    body('providerId').notEmpty().withMessage('Provider is required'),
    body('commissionRate').isFloat({ min: 0, max: 1 }).withMessage('Commission rate must be between 0 and 1'),
  ],
  validate,
  create
);

router.patch('/:id', authorize('ADMIN', 'MANAGER'), update);

module.exports = router;
