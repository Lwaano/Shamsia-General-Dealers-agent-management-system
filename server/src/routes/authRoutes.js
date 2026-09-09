const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { login, me } = require('../controllers/authController');

const router = Router();

router.post(
  '/login',
  [body('email').isEmail().withMessage('A valid email is required'), body('password').notEmpty().withMessage('Password is required')],
  validate,
  login
);

router.get('/me', authenticate, me);

module.exports = router;
