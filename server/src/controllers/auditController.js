const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { userId, action, from, to, take = 200 } = req.query;
  const where = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: Number(take),
  });
  res.json({ logs });
});

module.exports = { list };
