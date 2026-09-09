const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../services/auditService');

const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  position: user.position,
  email: user.email,
  role: user.role,
  branchId: user.branchId,
  branch: user.branch ? { id: user.branch.id, name: user.branch.name, town: user.branch.town } : null,
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email }, include: { branch: true } });

  if (!user || !user.isActive) {
    await logAction({ userId: null, action: 'LOGIN_FAILED', entityType: 'User', metadata: { email }, req });
    throw new ApiError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await logAction({ userId: user.id, action: 'LOGIN_FAILED', entityType: 'User', entityId: user.id, metadata: { email }, req });
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken(user);
  await logAction({ userId: user.id, action: 'LOGIN_SUCCESS', entityType: 'User', entityId: user.id, req });
  res.json({ token, user: sanitizeUser(user) });
});

const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { branch: true } });
  res.json({ user: sanitizeUser(user) });
});

module.exports = { login, me, sanitizeUser };
