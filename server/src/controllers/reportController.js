const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const parseRange = (query) => {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
};

const toCsv = (rows, columns) => {
  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const value = c.value(row);
        const str = value === null || value === undefined ? '' : String(value);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
};

const transactionsReport = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);
  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { agent: { include: { provider: true } }, recordedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const totals = transactions.reduce(
    (acc, t) => {
      acc.volume += t.amount;
      acc.commission += t.commissionAmount;
      acc.byType[t.type] = (acc.byType[t.type] || 0) + t.amount;
      return acc;
    },
    { volume: 0, commission: 0, byType: {} }
  );

  if (req.query.format === 'csv') {
    const csv = toCsv(transactions, [
      { label: 'Date', value: (t) => t.createdAt.toISOString() },
      { label: 'Type', value: (t) => t.type },
      { label: 'Agent', value: (t) => t.agent.name },
      { label: 'Provider', value: (t) => t.agent.provider.name },
      { label: 'Amount', value: (t) => t.amount },
      { label: 'Commission', value: (t) => t.commissionAmount },
      { label: 'Float Impact', value: (t) => t.floatImpact },
      { label: 'Balance After', value: (t) => t.balanceAfter },
      { label: 'Recorded By', value: (t) => t.recordedBy.name },
    ]);
    res.header('Content-Type', 'text/csv');
    res.attachment('transactions-report.csv');
    return res.send(csv);
  }

  res.json({ from, to, totals, transactions });
});

const floatReport = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);
  const transactions = await prisma.floatTransaction.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: {
      fromAccount: { include: { provider: true, agent: true } },
      toAccount: { include: { provider: true, agent: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totals = transactions.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + t.amount;
    return acc;
  }, {});

  res.json({ from, to, totals, transactions });
});

const inventoryReport = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { item: true, recordedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'SALE') acc.salesValue += t.totalAmount;
      if (t.type === 'PURCHASE') acc.purchaseValue += t.totalAmount;
      return acc;
    },
    { salesValue: 0, purchaseValue: 0 }
  );

  res.json({ from, to, totals, transactions });
});

module.exports = { transactionsReport, floatReport, inventoryReport };
