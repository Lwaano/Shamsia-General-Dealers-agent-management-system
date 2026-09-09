const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const providers = await prisma.provider.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { agents: true } } },
  });
  res.json({ providers });
});

const create = asyncHandler(async (req, res) => {
  const { name, code, type } = req.body;
  const provider = await prisma.provider.create({ data: { name, code, type } });
  // Every provider needs a master float account for Shamsia.
  await prisma.floatAccount.create({ data: { providerId: provider.id, agentId: null, balance: 0 } });
  res.status(201).json({ provider });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, isActive } = req.body;
  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) throw new ApiError(404, 'Provider not found');
  const updated = await prisma.provider.update({ where: { id }, data: { name, isActive } });
  res.json({ provider: updated });
});

module.exports = { list, create, update };
