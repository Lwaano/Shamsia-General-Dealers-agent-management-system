import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { dashboardApi } from '../api/endpoints';
import StatCard from '../components/StatCard';
import BranchFilter from '../components/BranchFilter';
import { Card, Spinner } from '../components/ui';
import { formatMoney, formatDateShort } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const CHART_COLORS = ['#296c4b', '#57a37c', '#e08e26', '#5b8fd6', '#c4741a'];

export default function Dashboard() {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState(undefined);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', branchId],
    queryFn: () => dashboardApi.summary({ branchId }),
    refetchInterval: 30000,
  });

  if (isLoading || !data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {user?.role === 'ADMIN' && !branchId
              ? 'Combined overview across all branches.'
              : 'Overview of float, transactions, and inventory health.'}
          </p>
        </div>
        <BranchFilter value={branchId} onChange={setBranchId} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Float (Master + Agents)" value={formatMoney(data.totalFloat)} hint={`Master: ${formatMoney(data.totalMasterFloat)}`} />
        <StatCard label="Today's Transaction Volume" value={formatMoney(data.todaysVolume)} hint={`${data.todaysTransactionCount} transactions today`} tone="accent" />
        <StatCard label="Today's Commission Earned" value={formatMoney(data.todaysCommission)} tone="brand" />
        <StatCard
          label="Alerts"
          value={`${data.lowFloatCount + data.lowStockCount}`}
          hint={`${data.lowFloatCount} low float · ${data.lowStockCount} low stock`}
          tone={data.lowFloatCount + data.lowStockCount > 0 ? 'red' : 'slate'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Float Balance by Provider</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.floatByProvider}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `K${v / 1000}k`} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Bar dataKey="balance" radius={[6, 6, 0, 0]}>
                {data.floatByProvider.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">7-Day Transaction Volume</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.transactionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(d) => formatDateShort(d)} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `K${v / 1000}k`} />
              <Tooltip formatter={(v) => formatMoney(v)} labelFormatter={(d) => formatDateShort(d)} />
              <Line type="monotone" dataKey="volume" stroke="#296c4b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {!branchId && data.floatByBranch?.length > 1 && (
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Float by Branch (Combined Total's Source)</h2>
          <ResponsiveContainer width="100%" height={Math.max(220, data.floatByBranch.length * 28)}>
            <BarChart data={data.floatByBranch} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `K${v / 1000}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Bar dataKey="balance" fill="#5b8fd6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Top Agents by 7-Day Volume</h2>
        {data.topAgents.length === 0 ? (
          <p className="text-sm text-slate-400">No transactions recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topAgents} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `K${v / 1000}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Bar dataKey="volume" fill="#e08e26" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
