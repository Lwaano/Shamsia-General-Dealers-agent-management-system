const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { recordTransaction } = require('../services/transactionService');

const list = asyncHandler(async (req, res) => {
  const { agentId, providerId, type, from, to, take = 100 } = req.query;
  const where = {};
  if (agentId) where.agentId = agentId;
  if (type) where.type = type;
  if (providerId) where.agent = { providerId };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { agent: { include: { provider: true } }, recordedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: Number(take),
  });
  res.json({ transactions });
});

const create = asyncHandler(async (req, res) => {
  const { type, agentId, amount, customerPhone, reference } = req.body;
  const transaction = await recordTransaction({
    type,
    agentId,
    amount: Number(amount),
    customerPhone,
    reference,
    recordedById: req.user.id,
  });
  res.status(201).json({ transaction });
});

module.exports = { list, create };
