const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

// Master account = the account Shamsia holds directly with a provider (agentId is null).
// Prisma's findUnique can't take null for a field in a compound unique index, so use findFirst here.
const getMasterAccount = (tx, providerId) => tx.floatAccount.findFirst({ where: { providerId, agentId: null } });

/**
 * Records a float movement and updates the balances of the accounts involved,
 * all inside one DB transaction so the ledger and the balances never drift apart.
 *
 * TOPUP:        provider -> master account       (fromAccount = null, toAccount = master)
 * DISTRIBUTION: master account -> agent account  (fromAccount = master, toAccount = agent)
 * RETURN:       agent account -> master account  (fromAccount = agent, toAccount = master)
 * ADJUSTMENT:   direct correction on one account  (only toAccount set)
 */
const recordFloatTransaction = async ({ type, providerId, agentId, amount, reference, note, recordedById }) => {
  if (amount <= 0) throw new ApiError(400, 'Amount must be greater than zero');

  return prisma.$transaction(async (tx) => {
    const master = await getMasterAccount(tx, providerId);
    if (!master) throw new ApiError(400, 'This provider has no master float account');

    let fromAccount = null;
    let toAccount = null;

    if (type === 'TOPUP') {
      toAccount = master;
    } else if (type === 'DISTRIBUTION' || type === 'RETURN') {
      if (!agentId) throw new ApiError(400, 'An agent is required for this float movement');
      const agentAccount = await tx.floatAccount.findUnique({
        where: { providerId_agentId: { providerId, agentId } },
      });
      if (!agentAccount) throw new ApiError(400, 'This agent has no float account for that provider');

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
        toAccount = await tx.floatAccount.findUnique({ where: { providerId_agentId: { providerId, agentId } } });
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
