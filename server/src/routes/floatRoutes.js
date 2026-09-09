const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { listAccounts, listFloatTransactions, createFloatTransaction } = require('../controllers/floatController');

const router = Router();

router.use(authenticate);

router.get('/accounts', listAccounts);
router.get('/transactions', listFloatTransactions);

router.post(
  '/transactions',
  authorize('ADMIN', 'MANAGER'),
  [
    body('type').isIn(['TOPUP', 'DISTRIBUTION', 'RETURN', 'ADJUSTMENT']).withMessage('Invalid float transaction type'),
    body('providerId').notEmpty().withMessage('Provider is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
  ],
  validate,
  createFloatTransaction
);

module.exports = router;
