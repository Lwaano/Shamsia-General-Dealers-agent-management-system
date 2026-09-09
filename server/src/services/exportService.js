const ExcelJS = require('exceljs');
const prisma = require('../config/prisma');

const HEADER_STYLE = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF296C4B' } } };

const addSheet = (workbook, name, columns, rows) => {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;
  sheet.getRow(1).eachCell((cell) => Object.assign(cell, HEADER_STYLE));
  sheet.addRows(rows);
  sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + columns.length)}1` };
  return sheet;
};

/**
 * Builds one workbook covering every module - transactions, float movements,
 * inventory movements, and reconciliations - for the given date range and
 * (optional) branch, so a manager can hand over a single file that captures
 * everything rather than exporting each screen separately.
 */
const buildWorkbook = async ({ from, to, branchId }) => {
  const branchWhere = branchId ? { branchId } : {};
  const dateWhere = { createdAt: { gte: from, lte: to } };

  const [transactions, floatMovements, inventoryMovements, reconciliations, floatAccounts, inventoryItems] = await Promise.all([
    prisma.transaction.findMany({
      where: { ...branchWhere, ...dateWhere },
      include: { agent: { include: { provider: true, branch: true } }, recordedBy: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.floatTransaction.findMany({
      where: { ...branchWhere, ...dateWhere },
      include: {
        fromAccount: { include: { agent: true, provider: true } },
        toAccount: { include: { agent: true, provider: true } },
        branch: true,
        recordedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.inventoryTransaction.findMany({
      where: dateWhere,
      include: { item: true, recordedBy: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.reconciliation.findMany({
      where: { floatAccount: branchWhere, openedAt: { gte: from, lte: to } },
      include: { floatAccount: { include: { agent: true, provider: true, branch: true } }, openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
      orderBy: { openedAt: 'asc' },
    }),
    prisma.floatAccount.findMany({ where: branchWhere, include: { agent: true, provider: true, branch: true } }),
    prisma.inventoryItem.findMany({ include: { category: true } }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Shamsia General Dealers';
  workbook.created = new Date();

  addSheet(
    workbook,
    'Transactions',
    [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Agent', key: 'agent', width: 24 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Provider', key: 'provider', width: 18 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Commission', key: 'commission', width: 14 },
      { header: 'Float Impact', key: 'floatImpact', width: 14 },
      { header: 'Balance After', key: 'balanceAfter', width: 16 },
      { header: 'Recorded By', key: 'recordedBy', width: 20 },
    ],
    transactions.map((t) => ({
      date: t.createdAt,
      type: t.type,
      agent: t.agent.name,
      branch: t.agent.branch.name,
      provider: t.agent.provider.name,
      amount: t.amount,
      commission: t.commissionAmount,
      floatImpact: t.floatImpact,
      balanceAfter: t.balanceAfter,
      recordedBy: t.recordedBy.name,
    }))
  );

  addSheet(
    workbook,
    'Float Movements',
    [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'From', key: 'from', width: 30 },
      { header: 'To', key: 'to', width: 30 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Recorded By', key: 'recordedBy', width: 20 },
    ],
    floatMovements.map((m) => ({
      date: m.createdAt,
      type: m.type,
      branch: m.branch.name,
      from: m.fromAccount ? `${m.fromAccount.agent?.name || 'Master'} (${m.fromAccount.provider.name})` : '—',
      to: m.toAccount ? `${m.toAccount.agent?.name || 'Master'} (${m.toAccount.provider.name})` : '—',
      amount: m.amount,
      recordedBy: m.recordedBy.name,
    }))
  );

  addSheet(
    workbook,
    'Inventory Movements',
    [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Item', key: 'item', width: 26 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Total', key: 'total', width: 14 },
      { header: 'Qty After', key: 'qtyAfter', width: 12 },
      { header: 'Recorded By', key: 'recordedBy', width: 20 },
    ],
    inventoryMovements.map((m) => ({
      date: m.createdAt,
      type: m.type,
      item: m.item.name,
      quantity: m.quantity,
      total: m.totalAmount,
      qtyAfter: m.quantityAfter,
      recordedBy: m.recordedBy.name,
    }))
  );

  addSheet(
    workbook,
    'Reconciliations',
    [
      { header: 'Account', key: 'account', width: 30 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Opened At', key: 'openedAt', width: 20 },
      { header: 'Opened By', key: 'openedBy', width: 18 },
      { header: 'Closed At', key: 'closedAt', width: 20 },
      { header: 'Closed By', key: 'closedBy', width: 18 },
      { header: 'Float Variance', key: 'floatVariance', width: 16 },
      { header: 'Cash Variance', key: 'cashVariance', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
    ],
    reconciliations.map((r) => ({
      account: `${r.floatAccount.agent?.name || 'Master'} — ${r.floatAccount.provider.name}`,
      branch: r.floatAccount.branch.name,
      openedAt: r.openedAt,
      openedBy: r.openedBy.name,
      closedAt: r.closedAt,
      closedBy: r.closedBy?.name || '',
      floatVariance: r.floatVariance,
      cashVariance: r.cashVariance,
      status: r.status,
    }))
  );

  addSheet(
    workbook,
    'Float Accounts (Current)',
    [
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Provider', key: 'provider', width: 18 },
      { header: 'Account', key: 'account', width: 24 },
      { header: 'Balance', key: 'balance', width: 16 },
    ],
    floatAccounts.map((a) => ({
      branch: a.branch.name,
      provider: a.provider.name,
      account: a.agent ? a.agent.name : 'Master',
      balance: a.balance,
    }))
  );

  addSheet(
    workbook,
    'Inventory Items (Current)',
    [
      { header: 'Name', key: 'name', width: 28 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Qty On Hand', key: 'qty', width: 14 },
      { header: 'Unit Cost', key: 'cost', width: 14 },
      { header: 'Unit Price', key: 'price', width: 14 },
    ],
    inventoryItems.map((i) => ({
      name: i.name,
      sku: i.sku,
      category: i.category?.name || '',
      qty: i.quantityOnHand,
      cost: i.unitCost,
      price: i.unitPrice,
    }))
  );

  return workbook;
};

module.exports = { buildWorkbook };
