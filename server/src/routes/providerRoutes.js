const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { list, create, update } = require('../controllers/providerController');

const router = Router();

router.use(authenticate);

router.get('/', list);

router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('code').notEmpty().withMessage('Code is required'),
    body('type').isIn(['MOBILE_MONEY', 'BANK']).withMessage('Type must be MOBILE_MONEY or BANK'),
  ],
  validate,
  create
);

router.patch('/:id', authorize('ADMIN', 'MANAGER'), update);

module.exports = router;
