const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { list, create } = require('../controllers/transactionController');

const router = Router();

router.use(authenticate);

router.get('/', list);

router.post(
  '/',
  [
    body('type')
      .isIn(['CASH_IN', 'CASH_OUT', 'AIRTIME', 'BILL_PAYMENT', 'DEPOSIT', 'WITHDRAWAL'])
      .withMessage('Invalid transaction type'),
    body('agentId').notEmpty().withMessage('Agent is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
  ],
  validate,
  create
);

module.exports = router;
