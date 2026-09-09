const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Local YYYY-MM-DD key. toISOString() converts to UTC first, which silently shifts the
// date (and can drop "today" entirely) whenever the server's local timezone is ahead of UTC.
const dateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const summary = asyncHandler(async (req, res) => {
  const today = startOfDay(new Date());
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const branchWhere = req.branchFilter ? { branchId: req.branchFilter } : {};

  const [accounts, todaysTransactions, lowStockItems, allTransactions, allItems] = await Promise.all([
    prisma.floatAccount.findMany({ where: branchWhere, include: { provider: true, agent: true, branch: true } }),
    prisma.transaction.findMany({ where: { ...branchWhere, createdAt: { gte: today } } }),
    prisma.inventoryItem.findMany({ where: { isActive: true } }),
    prisma.transaction.findMany({
      where: { ...branchWhere, createdAt: { gte: sevenDaysAgo } },
      include: { agent: true },
    }),
    prisma.inventoryItem.count(),
  ]);

  const floatByProvider = {};
  const floatByBranch = {};
  let totalMasterFloat = 0;
  let totalAgentFloat = 0;
  const lowFloatAccounts = [];

  for (const acc of accounts) {
    const providerKey = acc.provider.name;
    floatByProvider[providerKey] = (floatByProvider[providerKey] || 0) + acc.balance;

    const branchKey = acc.branch.name;
    floatByBranch[branchKey] = (floatByBranch[branchKey] || 0) + acc.balance;

    if (acc.agentId === null) totalMasterFloat += acc.balance;
    else totalAgentFloat += acc.balance;
    if (acc.balance <= acc.lowFloatAt) lowFloatAccounts.push(acc);
  }

  const todaysVolume = todaysTransactions.reduce((sum, t) => sum + t.amount, 0);
  const todaysCommission = todaysTransactions.reduce((sum, t) => sum + t.commissionAmount, 0);

  const lowStock = lowStockItems.filter((i) => i.quantityOnHand <= i.reorderLevel);

  // Last 7 days transaction volume trend
  const trendMap = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    trendMap[dateKey(d)] = 0;
  }
  for (const t of allTransactions) {
    const key = dateKey(t.createdAt);
    if (key in trendMap) trendMap[key] += t.amount;
  }
  const transactionTrend = Object.entries(trendMap).map(([date, volume]) => ({ date, volume }));

  // Top agents by 7-day volume
  const agentVolume = {};
  for (const t of allTransactions) {
    agentVolume[t.agent.name] = (agentVolume[t.agent.name] || 0) + t.amount;
  }
  const topAgents = Object.entries(agentVolume)
    .map(([name, volume]) => ({ name, volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  res.json({
    totalMasterFloat,
    totalAgentFloat,
    totalFloat: totalMasterFloat + totalAgentFloat,
    floatByProvider: Object.entries(floatByProvider).map(([name, balance]) => ({ name, balance })),
    // Only meaningful company-wide (all branches combined) - a single-branch view is its own bar.
    floatByBranch: Object.entries(floatByBranch)
      .map(([name, balance]) => ({ name, balance }))
      .sort((a, b) => b.balance - a.balance),
    todaysVolume,
    todaysCommission,
    todaysTransactionCount: todaysTransactions.length,
    lowFloatCount: lowFloatAccounts.length,
    lowStockCount: lowStock.length,
    totalInventoryItems: allItems,
    transactionTrend,
    topAgents,
  });
});

module.exports = { summary };
