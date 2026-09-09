const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../services/auditService');

const list = asyncHandler(async (req, res) => {
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { agents: true, users: true } } },
  });
  res.json({ branches });
});

const create = asyncHandler(async (req, res) => {
  const { name, town, address } = req.body;
  const providers = await prisma.provider.findMany();

  const branch = await prisma.$transaction(
    async (tx) => {
      const created = await tx.branch.create({ data: { name, town, address } });
      // Every existing provider needs a master float account for this new branch.
      for (const provider of providers) {
        await tx.floatAccount.create({ data: { providerId: provider.id, branchId: created.id, agentId: null, balance: 0 } });
      }
      return created;
    },
    { timeout: 20000 }
  );

  await logAction({ userId: req.user.id, action: 'CREATE_BRANCH', entityType: 'Branch', entityId: branch.id, metadata: { name, town }, req });
  res.status(201).json({ branch });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, town, address, isActive } = req.body;
  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) throw new ApiError(404, 'Branch not found');

  const updated = await prisma.branch.update({ where: { id }, data: { name, town, address, isActive } });
  await logAction({ userId: req.user.id, action: 'UPDATE_BRANCH', entityType: 'Branch', entityId: id, metadata: req.body, req });
  res.json({ branch: updated });
});

module.exports = { list, create, update };
