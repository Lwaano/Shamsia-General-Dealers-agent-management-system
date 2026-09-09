const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertBranchAccess } = require('../middleware/branchScope');
const { openDay, closeDay } = require('../services/reconciliationService');
const { logAction } = require('../services/auditService');

const list = asyncHandler(async (req, res) => {
  const { floatAccountId, status } = req.query;
  const where = {};
  if (req.branchFilter) where.floatAccount = { branchId: req.branchFilter };
  if (floatAccountId) where.floatAccountId = floatAccountId;
  if (status) where.status = status;

  const reconciliations = await prisma.reconciliation.findMany({
    where,
    include: {
      floatAccount: { include: { provider: true, agent: true, branch: true } },
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    },
    orderBy: { openedAt: 'desc' },
    take: 200,
  });
  res.json({ reconciliations });
});

const get = asyncHandler(async (req, res) => {
  const reconciliation = await prisma.reconciliation.findUnique({
    where: { id: req.params.id },
    include: {
      floatAccount: { include: { provider: true, agent: true, branch: true } },
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    },
  });
  if (!reconciliation) throw new ApiError(404, 'Reconciliation not found');
  assertBranchAccess(req, reconciliation.floatAccount.branchId);

  const windowEnd = reconciliation.closedAt || new Date();
  const [transactions, floatMovements] = await Promise.all([
    reconciliation.floatAccount.agentId
      ? prisma.transaction.findMany({
          where: { agentId: reconciliation.floatAccount.agentId, createdAt: { gte: reconciliation.openedAt, lte: windowEnd } },
          orderBy: { createdAt: 'asc' },
        })
      : [],
    prisma.floatTransaction.findMany({
      where: {
        OR: [{ fromAccountId: reconciliation.floatAccountId }, { toAccountId: reconciliation.floatAccountId }],
        createdAt: { gte: reconciliation.openedAt, lte: windowEnd },
      },
      include: { fromAccount: { include: { agent: true, provider: true } }, toAccount: { include: { agent: true, provider: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  res.json({ reconciliation, transactions, floatMovements });
});

const open = asyncHandler(async (req, res) => {
  const { floatAccountId, openingCash, openNote } = req.body;
  const account = await prisma.floatAccount.findUnique({ where: { id: floatAccountId } });
  if (!account) throw new ApiError(404, 'Float account not found');
  assertBranchAccess(req, account.branchId);

  const reconciliation = await openDay({
    floatAccountId,
    openingCash: openingCash !== undefined ? Number(openingCash) : 0,
    openNote,
    openedById: req.user.id,
  });

  await logAction({ userId: req.user.id, action: 'OPEN_RECONCILIATION', entityType: 'Reconciliation', entityId: reconciliation.id, metadata: { floatAccountId }, req });
  res.status(201).json({ reconciliation });
});

const close = asyncHandler(async (req, res) => {
  const { closingFloatCounted, closingCashCounted, closeNote } = req.body;
  const existing = await prisma.reconciliation.findUnique({ where: { id: req.params.id }, include: { floatAccount: true } });
  if (!existing) throw new ApiError(404, 'Reconciliation not found');
  assertBranchAccess(req, existing.floatAccount.branchId);

  const reconciliation = await closeDay({
    reconciliationId: req.params.id,
    closingFloatCounted: Number(closingFloatCounted),
    closingCashCounted: closingCashCounted !== undefined && closingCashCounted !== '' ? Number(closingCashCounted) : null,
    closeNote,
    closedById: req.user.id,
  });

  await logAction({
    userId: req.user.id,
    action: 'CLOSE_RECONCILIATION',
    entityType: 'Reconciliation',
    entityId: reconciliation.id,
    metadata: { floatVariance: reconciliation.floatVariance, cashVariance: reconciliation.cashVariance },
    req,
  });

  res.json({ reconciliation });
});

module.exports = { list, get, open, close };
