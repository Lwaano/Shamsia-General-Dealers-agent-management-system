const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

// How each customer-facing transaction type moves the agent's own e-float balance.
// CASH_IN / AIRTIME / BILL_PAYMENT / DEPOSIT: the agent hands out e-value, so their float drops.
// CASH_OUT / WITHDRAWAL: the customer's e-value moves to the agent, so their float rises.
const FLOAT_DIRECTION = {
  CASH_IN: -1,
  AIRTIME: -1,
  BILL_PAYMENT: -1,
  DEPOSIT: -1,
  CASH_OUT: 1,
  WITHDRAWAL: 1,
};

const recordTransaction = async ({ type, agentId, amount, customerPhone, reference, recordedById }) => {
  if (amount <= 0) throw new ApiError(400, 'Amount must be greater than zero');
  const direction = FLOAT_DIRECTION[type];
  if (direction === undefined) throw new ApiError(400, 'Invalid transaction type');

  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUnique({ where: { id: agentId } });
    if (!agent || !agent.isActive) throw new ApiError(400, 'Agent not found or inactive');

    const floatAccount = await tx.floatAccount.findFirst({
      where: { providerId: agent.providerId, agentId },
    });
    if (!floatAccount) throw new ApiError(400, 'Agent has no float account for its provider');

    const floatImpact = direction * amount;

    if (floatImpact < 0 && floatAccount.balance + floatImpact < 0) {
      throw new ApiError(400, `Insufficient float: agent only has ${floatAccount.balance.toFixed(2)} available`);
    }

    const updatedAccount = await tx.floatAccount.update({
      where: { id: floatAccount.id },
      data: { balance: { increment: floatImpact }, lastUpdated: new Date() },
    });

    const commissionAmount = Number((amount * agent.commissionRate).toFixed(2));

    const transaction = await tx.transaction.create({
      data: {
        type,
        amount,
        commissionAmount,
        floatImpact,
        balanceAfter: updatedAccount.balance,
        customerPhone,
        reference,
        agentId,
        branchId: agent.branchId,
        recordedById,
      },
      include: { agent: { include: { provider: true, branch: true } } },
    });

    return transaction;
  }, { timeout: 15000 });
};

module.exports = { recordTransaction, FLOAT_DIRECTION };
