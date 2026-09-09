import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { reportApi } from '../api/endpoints';
import client from '../api/client';
import BranchFilter from '../components/BranchFilter';
import { Button, Card, Select, Input, Spinner } from '../components/ui';
import { formatMoney, formatDate, titleCase } from '../utils/format';

const toISODate = (d) => d.toISOString().slice(0, 10);

const downloadBlob = (blobData, filename) => {
  const url = window.URL.createObjectURL(blobData);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export default function Reports() {
  const [reportType, setReportType] = useState('transactions');
  const [branchId, setBranchId] = useState(undefined);
  const [range, setRange] = useState({
    from: toISODate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    to: toISODate(new Date()),
  });
  const [exporting, setExporting] = useState(false);

  const queryFn = { transactions: reportApi.transactions, float: reportApi.float, inventory: reportApi.inventory }[reportType];

  const { data, isLoading } = useQuery({
    queryKey: ['report', reportType, range, branchId],
    queryFn: () => queryFn({ ...range, branchId }),
  });

  const downloadCsv = async () => {
    const res = await client.get('/reports/transactions', { params: { ...range, branchId, format: 'csv' }, responseType: 'blob' });
    downloadBlob(res.data, 'shamsia-transactions-report.csv');
  };

  const downloadExcel = async () => {
    setExporting(true);
    try {
      const res = await client.get('/reports/export/excel', { params: { ...range, branchId }, responseType: 'blob' });
      downloadBlob(res.data, `shamsia-report-${range.from}-to-${range.to}.xlsx`);
    } catch (err) {
      toast.error('Failed to export Excel workbook');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">Date-range summaries across transactions, float, and inventory.</p>
      </div>

      <Card className="flex flex-wrap items-end gap-4 p-4">
        <Select label="Report" value={reportType} onChange={(e) => setReportType(e.target.value)} className="min-w-[180px]">
          <option value="transactions">Transactions</option>
          <option value="float">Float Movements</option>
          <option value="inventory">Inventory Movements</option>
        </Select>
        <Input label="From" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <Input label="To" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        <BranchFilter value={branchId} onChange={setBranchId} />
        {reportType === 'transactions' && (
          <Button variant="secondary" onClick={downloadCsv}>
            ⬇ Export CSV
          </Button>
        )}
        <Button variant="secondary" onClick={downloadExcel} disabled={exporting}>
          {exporting ? 'Preparing…' : '⬇ Export Excel (All Data)'}
        </Button>
      </Card>

      {isLoading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Object.entries(data.totals).map(([key, value]) => (
              <Card key={key} className="p-4">
                <p className="text-sm font-medium text-slate-500">{titleCase(key)}</p>
                <p className="mt-1 text-xl font-bold text-brand-700">{typeof value === 'number' ? formatMoney(value) : value}</p>
              </Card>
            ))}
          </div>

          <Card className="overflow-x-auto">
            {reportType === 'transactions' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 text-slate-500">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3">{titleCase(t.type)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{t.agent.name}</td>
                      <td className="px-4 py-3 font-semibold">{formatMoney(t.amount)}</td>
                      <td className="px-4 py-3 text-brand-700">{formatMoney(t.commissionAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'float' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 text-slate-500">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3">{titleCase(t.type)}</td>
                      <td className="px-4 py-3 font-semibold">{formatMoney(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'inventory' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 text-slate-500">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3">{titleCase(t.type)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{t.item.name}</td>
                      <td className="px-4 py-3">{t.quantity}</td>
                      <td className="px-4 py-3 font-semibold">{formatMoney(t.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
