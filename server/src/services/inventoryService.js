const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const DIRECTION = { PURCHASE: 1, SALE: -1, ADJUSTMENT: 0 };

/**
 * ADJUSTMENT sets quantityOnHand directly to `quantity` (a correction),
 * while PURCHASE/SALE move it up/down by `quantity`.
 */
const recordInventoryTransaction = async ({ type, itemId, quantity, unitPrice, note, recordedById }) => {
  if (quantity <= 0) throw new ApiError(400, 'Quantity must be greater than zero');
  if (!(type in DIRECTION)) throw new ApiError(400, 'Invalid inventory transaction type');

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new ApiError(404, 'Item not found');

    let quantityAfter;
    if (type === 'ADJUSTMENT') {
      quantityAfter = quantity;
    } else {
      const delta = DIRECTION[type] * quantity;
      if (type === 'SALE' && item.quantityOnHand + delta < 0) {
        throw new ApiError(400, `Insufficient stock: only ${item.quantityOnHand} units on hand`);
      }
      quantityAfter = item.quantityOnHand + delta;
    }

    const price = unitPrice !== undefined && unitPrice !== null ? unitPrice : type === 'SALE' ? item.unitPrice : item.unitCost;
    const totalAmount = Number((price * quantity).toFixed(2));

    await tx.inventoryItem.update({ where: { id: itemId }, data: { quantityOnHand: quantityAfter } });

    const transaction = await tx.inventoryTransaction.create({
      data: { type, itemId, quantity, unitPrice: price, totalAmount, quantityAfter, note, recordedById },
      include: { item: true },
    });

    return transaction;
  }, { timeout: 15000 });
};

module.exports = { recordInventoryTransaction };
