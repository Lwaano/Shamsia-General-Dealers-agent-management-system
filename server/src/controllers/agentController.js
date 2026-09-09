const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const agents = await prisma.agent.findMany({
    orderBy: { name: 'asc' },
    include: { provider: true, floatAccounts: true },
  });
  res.json({ agents });
});

const get = asyncHandler(async (req, res) => {
  const agent = await prisma.agent.findUnique({
    where: { id: req.params.id },
    include: { provider: true, floatAccounts: true },
  });
  if (!agent) throw new ApiError(404, 'Agent not found');
  res.json({ agent });
});

const create = asyncHandler(async (req, res) => {
  const { name, phoneNumber, location, agentType, commissionRate, providerId } = req.body;

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new ApiError(400, 'Provider not found');

  const agent = await prisma.$transaction(async (tx) => {
    const created = await tx.agent.create({
      data: { name, phoneNumber, location, agentType, commissionRate, providerId },
    });
    await tx.floatAccount.create({
      data: { providerId, agentId: created.id, balance: 0 },
    });
    return created;
  }, { timeout: 15000 });

  res.status(201).json({ agent });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phoneNumber, location, commissionRate, isActive } = req.body;
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) throw new ApiError(404, 'Agent not found');
  const updated = await prisma.agent.update({
    where: { id },
    data: { name, phoneNumber, location, commissionRate, isActive },
  });
  res.json({ agent: updated });
});

module.exports = { list, get, create, update };
