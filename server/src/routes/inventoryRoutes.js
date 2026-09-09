const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listItems,
  listCategories,
  createCategory,
  createItem,
  updateItem,
  listTransactions,
  createTransaction,
} = require('../controllers/inventoryController');

const router = Router();

router.use(authenticate);

router.get('/items', listItems);
router.get('/categories', listCategories);
router.get('/transactions', listTransactions);

router.post(
  '/categories',
  authorize('ADMIN', 'MANAGER'),
  [body('name').notEmpty().withMessage('Name is required')],
  validate,
  createCategory
);

router.post(
  '/items',
  authorize('ADMIN', 'MANAGER'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('sku').notEmpty().withMessage('SKU is required'),
    body('unitCost').isFloat({ min: 0 }).withMessage('Unit cost must be a positive number'),
    body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  ],
  validate,
  createItem
);

router.patch('/items/:id', authorize('ADMIN', 'MANAGER'), updateItem);

router.post(
  '/transactions',
  [
    body('type').isIn(['PURCHASE', 'SALE', 'ADJUSTMENT']).withMessage('Invalid inventory transaction type'),
    body('itemId').notEmpty().withMessage('Item is required'),
    body('quantity').isInt({ gt: 0 }).withMessage('Quantity must be greater than zero'),
  ],
  validate,
  createTransaction
);

module.exports = router;
