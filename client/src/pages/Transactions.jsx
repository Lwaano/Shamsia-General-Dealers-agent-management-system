import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { transactionApi, agentApi } from '../api/endpoints';
import { Button, Card, Modal, Select, Input, Badge, Spinner, EmptyState } from '../components/ui';
import { formatMoney, formatDate, titleCase } from '../utils/format';

const TYPE_TONE = {
  CASH_IN: 'blue',
  CASH_OUT: 'green',
  AIRTIME: 'amber',
  BILL_PAYMENT: 'amber',
  DEPOSIT: 'blue',
  WITHDRAWAL: 'green',
};

export default function Transactions() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({ agentId: '', type: '' });

  const { data: agents } = useQuery({ queryKey: ['agents'], queryFn: agentApi.list });
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionApi.list({ agentId: filters.agentId || undefined, type: filters.type || undefined }),
  });

  const [form, setForm] = useState({ type: 'CASH_IN', agentId: '', amount: '', customerPhone: '', reference: '' });

  const mutation = useMutation({
    mutationFn: transactionApi.create,
    onSuccess: (tx) => {
      toast.success(`Transaction recorded — new float balance: ${formatMoney(tx.balanceAfter)}`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['floatAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setModalOpen(false);
      setForm({ type: 'CASH_IN', agentId: '', amount: '', customerPhone: '', reference: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to record transaction'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ ...form, amount: Number(form.amount) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500">Record agent activity — float balances update automatically.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Record Transaction</Button>
      </div>

      <Card className="flex flex-wrap gap-4 p-4">
        <Select label="Agent" value={filters.agentId} onChange={(e) => setFilters({ ...filters, agentId: e.target.value })} className="min-w-[200px]">
          <option value="">All agents</option>
          {(agents || []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select label="Type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="min-w-[180px]">
          <option value="">All types</option>
          {Object.keys(TYPE_TONE).map((t) => (
            <option key={t} value={t}>
              {titleCase(t)}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Float After</th>
                <th className="px-4 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(transactions || []).map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-slate-500">{formatDate(t.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TYPE_TONE[t.type]}>{titleCase(t.type)}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{t.agent.name}</td>
                  <td className="px-4 py-3 text-slate-600">{t.agent.provider.name}</td>
                  <td className="px-4 py-3 font-semibold">{formatMoney(t.amount)}</td>
                  <td className="px-4 py-3 text-brand-700">{formatMoney(t.commissionAmount)}</td>
                  <td className="px-4 py-3">{formatMoney(t.balanceAfter)}</td>
                  <td className="px-4 py-3 text-slate-500">{t.recordedBy?.name}</td>
                </tr>
              ))}
              {(transactions || []).length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState message="No transactions recorded yet." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.keys(TYPE_TONE).map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </Select>
          <Select label="Agent" value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })} required>
            <option value="">Select agent…</option>
            {(agents || []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.provider.name}
              </option>
            ))}
          </Select>
          <Input label="Amount (ZMW)" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <Input label="Customer Phone (optional)" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
          <Input label="Reference (optional)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Record Transaction'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
