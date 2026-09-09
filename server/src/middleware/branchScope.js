const ApiError = require('../utils/ApiError');

/**
 * Sets req.branchFilter: for ADMIN, an optional ?branchId= to drill into one branch
 * (undefined means "all branches, combined"). For MANAGER/TELLER, always their own
 * assigned branch — a query param cannot be used to see another branch's data.
 */
const resolveBranchFilter = (req, res, next) => {
  if (req.user.role === 'ADMIN') {
    req.branchFilter = req.query.branchId || undefined;
  } else {
    if (!req.user.branchId) throw new ApiError(403, 'Your account is not assigned to a branch yet');
    req.branchFilter = req.user.branchId;
  }
  next();
};

/**
 * Throws unless the given branchId is one the current user is allowed to act on:
 * ADMIN may act on any branch, MANAGER/TELLER only their own.
 */
const assertBranchAccess = (req, branchId) => {
  if (req.user.role === 'ADMIN') return;
  if (!req.user.branchId || branchId !== req.user.branchId) {
    throw new ApiError(403, 'You do not have access to that branch');
  }
};

module.exports = { resolveBranchFilter, assertBranchAccess };
