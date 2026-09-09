const prisma = require('../config/prisma');

/**
 * Records one audit trail entry. Never throws — a failure to write the audit log
 * must not break the business operation it's describing.
 */
const logAction = async ({ userId, action, entityType, entityId, metadata, req }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        metadata: metadata ?? undefined,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};

module.exports = { logAction };
