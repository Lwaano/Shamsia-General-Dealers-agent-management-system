const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

// Master account = the branch's own account with a provider (agentId is null).
// Prisma's findUnique can't take null for a field in a compound unique index, so use findFirst here.
const getMasterAccount = (tx, providerId, branchId) => tx.floatAccount.findFirst({ where: { providerId, branchId, agentId: null } });

/**
 * Records a float movement and updates the balances of the accounts involved,
 * all inside one DB transaction so the ledger and the balances never drift apart.
 *
 * TOPUP:        provider -> branch's master account (fromAccount = null, toAccount = master)
 * DISTRIBUTION: master account -> agent account      (fromAccount = master, toAccount = agent)
 * RETURN:       agent account -> master account       (fromAccount = agent, toAccount = master)
 * ADJUSTMENT:   direct correction on one account       (only toAccount set)
 *
 * `branchId` identifies which branch's master account is involved for TOPUP/master-ADJUSTMENT.
 * For DISTRIBUTION/RETURN/agent-ADJUSTMENT it must match the agent's own branch.
 */
const recordFloatTransaction = async ({ type, providerId, branchId, agentId, amount, reference, note, recordedById }) => {
  if (amount <= 0) throw new ApiError(400, 'Amount must be greater than zero');
  if (!branchId) throw new ApiError(400, 'Branch is required');

  return prisma.$transaction(async (tx) => {
    const master = await getMasterAccount(tx, providerId, branchId);
    if (!master) throw new ApiError(400, 'This provider has no master float account for that branch');

    let fromAccount = null;
    let toAccount = null;

    if (type === 'TOPUP') {
      toAccount = master;
    } else if (type === 'DISTRIBUTION' || type === 'RETURN') {
      if (!agentId) throw new ApiError(400, 'An agent is required for this float movement');
      const agentAccount = await tx.floatAccount.findFirst({
        where: { providerId, agentId, branchId },
      });
      if (!agentAccount) throw new ApiError(400, 'This agent has no float account for that provider in that branch');

      if (type === 'DISTRIBUTION') {
        fromAccount = master;
        toAccount = agentAccount;
        if (master.balance < amount) throw new ApiError(400, 'Insufficient master float balance for this distribution');
      } else {
        fromAccount = agentAccount;
        toAccount = master;
        if (agentAccount.balance < amount) throw new ApiError(400, "Insufficient agent float balance for this return");
      }
    } else if (type === 'ADJUSTMENT') {
      if (agentId) {
        toAccount = await tx.floatAccount.findFirst({ where: { providerId, agentId, branchId } });
      } else {
        toAccount = master;
      }
      if (!toAccount) throw new ApiError(400, 'Float account not found');
    } else {
      throw new ApiError(400, 'Invalid float transaction type');
    }

    let balanceAfterFrom = null;
    let balanceAfterTo = null;

    if (fromAccount) {
      const updatedFrom = await tx.floatAccount.update({
        where: { id: fromAccount.id },
        data: { balance: { decrement: amount }, lastUpdated: new Date() },
      });
      balanceAfterFrom = updatedFrom.balance;
    }

    if (toAccount) {
      const updatedTo = await tx.floatAccount.update({
        where: { id: toAccount.id },
        data: { balance: { increment: amount }, lastUpdated: new Date() },
      });
      balanceAfterTo = updatedTo.balance;
    }

    const floatTransaction = await tx.floatTransaction.create({
      data: {
        type,
        amount,
        branchId,
        fromAccountId: fromAccount ? fromAccount.id : null,
        toAccountId: toAccount ? toAccount.id : null,
        balanceAfterFrom,
        balanceAfterTo,
        reference,
        note,
        recordedById,
      },
      include: { fromAccount: { include: { agent: true, provider: true } }, toAccount: { include: { agent: true, provider: true } } },
    });

    return floatTransaction;
  }, { timeout: 15000 });
};

module.exports = { recordFloatTransaction };
