const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const openDay = async ({ floatAccountId, openingCash, openNote, openedById }) => {
  return prisma.$transaction(async (tx) => {
    const account = await tx.floatAccount.findUnique({ where: { id: floatAccountId } });
    if (!account) throw new ApiError(404, 'Float account not found');

    const existingOpen = await tx.reconciliation.findFirst({ where: { floatAccountId, status: 'OPEN' } });
    if (existingOpen) throw new ApiError(400, 'This account already has an open reconciliation - close it first');

    return tx.reconciliation.create({
      data: {
        floatAccountId,
        openingFloatBalance: account.balance,
        openingCash: openingCash || 0,
        openNote,
        openedById,
      },
      include: { floatAccount: { include: { provider: true, agent: true, branch: true } }, openedBy: { select: { name: true } } },
    });
  }, { timeout: 15000 });
};

const closeDay = async ({ reconciliationId, closingFloatCounted, closingCashCounted, closeNote, closedById }) => {
  return prisma.$transaction(async (tx) => {
    const reconciliation = await tx.reconciliation.findUnique({ where: { id: reconciliationId }, include: { floatAccount: true } });
    if (!reconciliation) throw new ApiError(404, 'Reconciliation not found');
    if (reconciliation.status !== 'OPEN') throw new ApiError(400, 'This reconciliation is already closed');

    const account = await tx.floatAccount.findUnique({ where: { id: reconciliation.floatAccountId } });
    const closingFloatBalance = account.balance;

    let expectedClosingCash = null;
    let cashVariance = null;

    // Cash only applies to an agent's own account - a master account has no customer-facing
    // Transactions of its own, so there's nothing to derive an expected cash position from.
    if (account.agentId) {
      const transactions = await tx.transaction.findMany({
        where: { agentId: account.agentId, createdAt: { gte: reconciliation.openedAt } },
      });
      const netFloatImpact = transactions.reduce((sum, t) => sum + t.floatImpact, 0);
      expectedClosingCash = reconciliation.openingCash - netFloatImpact;
      if (closingCashCounted !== undefined && closingCashCounted !== null) {
        cashVariance = Number((closingCashCounted - expectedClosingCash).toFixed(2));
      }
    }

    const floatVariance = Number((closingFloatCounted - closingFloatBalance).toFixed(2));

    return tx.reconciliation.update({
      where: { id: reconciliationId },
      data: {
        status: 'CLOSED',
        closingFloatBalance,
        closingFloatCounted,
        expectedClosingCash,
        closingCashCounted: closingCashCounted ?? null,
        floatVariance,
        cashVariance,
        closeNote,
        closedAt: new Date(),
        closedById,
      },
      include: { floatAccount: { include: { provider: true, agent: true, branch: true } }, openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
    });
  }, { timeout: 15000 });
};

module.exports = { openDay, closeDay };
