const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { list, create, update } = require('../controllers/userController');

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', list);

router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['ADMIN', 'MANAGER', 'TELLER']).withMessage('Invalid role'),
  ],
  validate,
  create
);

router.patch('/:id', update);

module.exports = router;
