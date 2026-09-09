const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../services/auditService');

const sanitize = (u) => ({
  id: u.id,
  name: u.name,
  position: u.position,
  email: u.email,
  role: u.role,
  branchId: u.branchId,
  branch: u.branch ? { id: u.branch.id, name: u.branch.name, town: u.branch.town } : null,
  isActive: u.isActive,
  createdAt: u.createdAt,
});

const list = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' }, include: { branch: true } });
  res.json({ users: users.map(sanitize) });
});

const create = asyncHandler(async (req, res) => {
  const { name, position, email, password, role, branchId } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(400, 'A user with that email already exists');

  if (role !== 'ADMIN' && !branchId) throw new ApiError(400, 'Branch is required for this role');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, position, email, passwordHash, role, branchId: branchId || null },
    include: { branch: true },
  });

  await logAction({ userId: req.user.id, action: 'CREATE_USER', entityType: 'User', entityId: user.id, metadata: { email, role, branchId }, req });
  res.status(201).json({ user: sanitize(user) });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, position, role, branchId, isActive, password } = req.body;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'User not found');

  const data = { name, position, role, isActive };
  if (branchId !== undefined) data.branchId = branchId || null;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const updated = await prisma.user.update({ where: { id }, data, include: { branch: true } });
  await logAction({ userId: req.user.id, action: 'UPDATE_USER', entityType: 'User', entityId: id, metadata: { name, role, branchId, isActive }, req });
  res.json({ user: sanitize(updated) });
});

module.exports = { list, create, update };
