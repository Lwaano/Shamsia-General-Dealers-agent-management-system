const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { assertBranchAccess } = require('../middleware/branchScope');
const { recordFloatTransaction } = require('../services/floatService');
const { logAction } = require('../services/auditService');

const listAccounts = asyncHandler(async (req, res) => {
  const where = req.branchFilter ? { branchId: req.branchFilter } : {};
  const accounts = await prisma.floatAccount.findMany({
    where,
    include: { provider: true, agent: true, branch: true },
    orderBy: [{ branchId: 'asc' }, { providerId: 'asc' }, { agentId: 'asc' }],
  });
  res.json({ accounts });
});

const listFloatTransactions = asyncHandler(async (req, res) => {
  const { providerId, agentId, take = 50 } = req.query;
  const where = {};
  if (req.branchFilter) where.branchId = req.branchFilter;
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
      branch: true,
      recordedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Number(take),
  });
  res.json({ transactions });
});

const createFloatTransaction = asyncHandler(async (req, res) => {
  const { type, providerId, agentId, amount, reference, note } = req.body;
  // Non-admins can only move float within their own branch, regardless of what's posted.
  const branchId = req.user.role === 'ADMIN' ? req.body.branchId : req.user.branchId;
  assertBranchAccess(req, branchId);

  const transaction = await recordFloatTransaction({
    type,
    providerId,
    branchId,
    agentId: agentId || null,
    amount: Number(amount),
    reference,
    note,
    recordedById: req.user.id,
  });

  await logAction({
    userId: req.user.id,
    action: 'CREATE_FLOAT_TRANSACTION',
    entityType: 'FloatTransaction',
    entityId: transaction.id,
    metadata: { type, providerId, branchId, agentId, amount: transaction.amount },
    req,
  });

  res.status(201).json({ transaction });
});

module.exports = { listAccounts, listFloatTransactions, createFloatTransaction };
