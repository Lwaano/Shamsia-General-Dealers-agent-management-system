const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { resolveBranchFilter } = require('../middleware/branchScope');
const { list, get, open, close } = require('../controllers/reconciliationController');

const router = Router();

router.use(authenticate);
router.use(resolveBranchFilter);

router.get('/', list);
router.get('/:id', get);

router.post(
  '/open',
  [body('floatAccountId').notEmpty().withMessage('Float account is required')],
  validate,
  open
);

router.post(
  '/:id/close',
  [body('closingFloatCounted').isFloat({ min: 0 }).withMessage('Counted float balance is required')],
  validate,
  close
);

module.exports = router;
