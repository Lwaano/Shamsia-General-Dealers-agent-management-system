const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertBranchAccess } = require('../middleware/branchScope');
const { logAction } = require('../services/auditService');

const list = asyncHandler(async (req, res) => {
  const where = req.branchFilter ? { branchId: req.branchFilter } : {};
  const agents = await prisma.agent.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { provider: true, branch: true, floatAccounts: true },
  });
  res.json({ agents });
});

const get = asyncHandler(async (req, res) => {
  const agent = await prisma.agent.findUnique({
    where: { id: req.params.id },
    include: { provider: true, branch: true, floatAccounts: true },
  });
  if (!agent) throw new ApiError(404, 'Agent not found');
  assertBranchAccess(req, agent.branchId);
  res.json({ agent });
});

const create = asyncHandler(async (req, res) => {
  const { name, phoneNumber, location, agentType, commissionRate, providerId } = req.body;
  // Non-admins can only create agents for their own branch, regardless of what's posted.
  const branchId = req.user.role === 'ADMIN' ? req.body.branchId : req.user.branchId;
  assertBranchAccess(req, branchId);
  if (!branchId) throw new ApiError(400, 'Branch is required');

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new ApiError(400, 'Provider not found');
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new ApiError(400, 'Branch not found');

  const agent = await prisma.$transaction(async (tx) => {
    const created = await tx.agent.create({
      data: { name, phoneNumber, location, agentType, commissionRate, providerId, branchId },
    });
    await tx.floatAccount.create({
      data: { providerId, agentId: created.id, branchId, balance: 0 },
    });
    return created;
  }, { timeout: 15000 });

  await logAction({ userId: req.user.id, action: 'CREATE_AGENT', entityType: 'Agent', entityId: agent.id, metadata: { name, providerId, branchId }, req });
  res.status(201).json({ agent });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phoneNumber, location, commissionRate, isActive } = req.body;
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) throw new ApiError(404, 'Agent not found');
  assertBranchAccess(req, agent.branchId);

  const updated = await prisma.agent.update({
    where: { id },
    data: { name, phoneNumber, location, commissionRate, isActive },
  });
  await logAction({ userId: req.user.id, action: 'UPDATE_AGENT', entityType: 'Agent', entityId: id, metadata: req.body, req });
  res.json({ agent: updated });
});

module.exports = { list, get, create, update };
