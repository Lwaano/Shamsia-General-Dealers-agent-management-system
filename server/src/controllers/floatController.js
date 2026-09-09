const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { recordFloatTransaction } = require('../services/floatService');

const listAccounts = asyncHandler(async (req, res) => {
  const accounts = await prisma.floatAccount.findMany({
    include: { provider: true, agent: true },
    orderBy: [{ providerId: 'asc' }, { agentId: 'asc' }],
  });
  res.json({ accounts });
});

const listFloatTransactions = asyncHandler(async (req, res) => {
  const { providerId, agentId, take = 50 } = req.query;
  const where = {};
  if (providerId || agentId) {
    where.OR = [
      { fromAccount: { providerId: providerId || undefined, agentId: agentId || undefined } },
      { toAccount: { providerId: providerId || undefined, agentId: agentId || undefined } },
    ];
  }
  const transactions = await prisma.floatTransaction.findMany({
    where,
    include: {
      fromAccount: { include: { agent: true, provider: true } },
      toAccount: { include: { agent: true, provider: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Number(take),
  });
  res.json({ transactions });
});

const createFloatTransaction = asyncHandler(async (req, res) => {
  const { type, providerId, agentId, amount, reference, note } = req.body;
  const transaction = await recordFloatTransaction({
    type,
    providerId,
    agentId: agentId || null,
    amount: Number(amount),
    reference,
    note,
    recordedById: req.user.id,
  });
  res.status(201).json({ transaction });
});

module.exports = { listAccounts, listFloatTransactions, createFloatTransaction };
