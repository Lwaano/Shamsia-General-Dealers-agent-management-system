const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { recordInventoryTransaction } = require('../services/inventoryService');
const { logAction } = require('../services/auditService');

const listItems = asyncHandler(async (req, res) => {
  const items = await prisma.inventoryItem.findMany({
    include: { category: true },
    orderBy: { name: 'asc' },
  });
  res.json({ items });
});

const listCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.inventoryCategory.findMany({ orderBy: { name: 'asc' } });
  res.json({ categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await prisma.inventoryCategory.create({ data: { name: req.body.name } });
  await logAction({ userId: req.user.id, action: 'CREATE_INVENTORY_CATEGORY', entityType: 'InventoryCategory', entityId: category.id, metadata: { name: category.name }, req });
  res.status(201).json({ category });
});

const createItem = asyncHandler(async (req, res) => {
  const { name, sku, unitCost, unitPrice, reorderLevel, categoryId, quantityOnHand } = req.body;
  const item = await prisma.inventoryItem.create({
    data: {
      name,
      sku,
      unitCost: Number(unitCost),
      unitPrice: Number(unitPrice),
      reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : undefined,
      quantityOnHand: quantityOnHand !== undefined ? Number(quantityOnHand) : 0,
      categoryId: categoryId || null,
    },
  });
  await logAction({ userId: req.user.id, action: 'CREATE_INVENTORY_ITEM', entityType: 'InventoryItem', entityId: item.id, metadata: { name, sku }, req });
  res.status(201).json({ item });
});

const updateItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, unitCost, unitPrice, reorderLevel, categoryId, isActive } = req.body;
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, 'Item not found');
  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: { name, unitCost, unitPrice, reorderLevel, categoryId, isActive },
  });
  await logAction({ userId: req.user.id, action: 'UPDATE_INVENTORY_ITEM', entityType: 'InventoryItem', entityId: id, metadata: req.body, req });
  res.json({ item: updated });
});

const listTransactions = asyncHandler(async (req, res) => {
  const { itemId, take = 100 } = req.query;
  const where = itemId ? { itemId } : {};
  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: { item: true, recordedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: Number(take),
  });
  res.json({ transactions });
});

const createTransaction = asyncHandler(async (req, res) => {
  const { type, itemId, quantity, unitPrice, note } = req.body;
  const transaction = await recordInventoryTransaction({
    type,
    itemId,
    quantity: Number(quantity),
    unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
    note,
    recordedById: req.user.id,
  });
  await logAction({
    userId: req.user.id,
    action: 'CREATE_INVENTORY_TRANSACTION',
    entityType: 'InventoryTransaction',
    entityId: transaction.id,
    metadata: { type, itemId, quantity },
    req,
  });
  res.status(201).json({ transaction });
});

module.exports = { listItems, listCategories, createCategory, createItem, updateItem, listTransactions, createTransaction };
