const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertBranchAccess } = require('../middleware/branchScope');
const { recordTransaction } = require('../services/transactionService');
const { logAction } = require('../services/auditService');

const list = asyncHandler(async (req, res) => {
  const { agentId, providerId, type, from, to, take = 100 } = req.query;
  const where = {};
  if (req.branchFilter) where.branchId = req.branchFilter;
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
    include: { agent: { include: { provider: true, branch: true } }, recordedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: Number(take),
  });
  res.json({ transactions });
});

const create = asyncHandler(async (req, res) => {
  const { type, agentId, amount, customerPhone, reference } = req.body;

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new ApiError(400, 'Agent not found');
  assertBranchAccess(req, agent.branchId);

  const transaction = await recordTransaction({
    type,
    agentId,
    amount: Number(amount),
    customerPhone,
    reference,
    recordedById: req.user.id,
  });

  await logAction({
    userId: req.user.id,
    action: 'CREATE_TRANSACTION',
    entityType: 'Transaction',
    entityId: transaction.id,
    metadata: { type, agentId, amount: transaction.amount, floatImpact: transaction.floatImpact },
    req,
  });

  res.status(201).json({ transaction });
});

module.exports = { list, create };
