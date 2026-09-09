const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../services/auditService');

const list = asyncHandler(async (req, res) => {
  const providers = await prisma.provider.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { agents: true } } },
  });
  res.json({ providers });
});

const create = asyncHandler(async (req, res) => {
  const { name, code, type } = req.body;
  const branches = await prisma.branch.findMany();

  const provider = await prisma.$transaction(
    async (tx) => {
      const created = await tx.provider.create({ data: { name, code, type } });
      // Every branch needs its own master float account for this new provider.
      for (const branch of branches) {
        await tx.floatAccount.create({ data: { providerId: created.id, branchId: branch.id, agentId: null, balance: 0 } });
      }
      return created;
    },
    { timeout: 20000 }
  );

  await logAction({ userId: req.user.id, action: 'CREATE_PROVIDER', entityType: 'Provider', entityId: provider.id, metadata: { name, code, type }, req });
  res.status(201).json({ provider });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, isActive } = req.body;
  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) throw new ApiError(404, 'Provider not found');
  const updated = await prisma.provider.update({ where: { id }, data: { name, isActive } });
  await logAction({ userId: req.user.id, action: 'UPDATE_PROVIDER', entityType: 'Provider', entityId: id, metadata: req.body, req });
  res.json({ provider: updated });
});

module.exports = { list, create, update };
