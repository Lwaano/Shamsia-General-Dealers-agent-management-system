const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const sanitize = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, createdAt: u.createdAt });

const list = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  res.json({ users: users.map(sanitize) });
});

const create = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(400, 'A user with that email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash, role } });
  res.status(201).json({ user: sanitize(user) });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, role, isActive, password } = req.body;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'User not found');

  const data = { name, role, isActive };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const updated = await prisma.user.update({ where: { id }, data });
  res.json({ user: sanitize(updated) });
});

module.exports = { list, create, update };
