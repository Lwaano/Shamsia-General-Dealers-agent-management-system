const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { list, create, update } = require('../controllers/branchController');

const router = Router();

router.use(authenticate);

router.get('/', list);

router.post(
  '/',
  authorize('ADMIN'),
  [body('name').notEmpty().withMessage('Name is required'), body('town').notEmpty().withMessage('Town is required')],
  validate,
  create
);

router.patch('/:id', authorize('ADMIN'), update);

module.exports = router;
