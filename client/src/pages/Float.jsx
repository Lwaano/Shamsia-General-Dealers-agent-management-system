import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { floatApi, providerApi, agentApi, branchApi } from '../api/endpoints';
import BranchFilter from '../components/BranchFilter';
import { Button, Card, Modal, Select, Input, Badge, Spinner, EmptyState } from '../components/ui';
import { formatMoney, formatDate, titleCase } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const TYPE_TONE = { TOPUP: 'green', DISTRIBUTION: 'blue', RETURN: 'amber', ADJUSTMENT: 'slate' };

export default function Float() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [branchId, setBranchId] = useState(undefined);

  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['floatAccounts', branchId],
    queryFn: () => floatApi.listAccounts({ branchId }),
  });
  const { data: ledger, isLoading: loadingLedger } = useQuery({
    queryKey: ['floatTransactions', branchId],
    queryFn: () => floatApi.listTransactions({ branchId }),
  });
  const { data: providers } = useQuery({ queryKey: ['providers'], queryFn: providerApi.list });
  const { data: agents } = useQuery({ queryKey: ['agents'], queryFn: () => agentApi.list() });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: branchApi.list, enabled: isAdmin });

  const [form, setForm] = useState({ type: 'TOPUP', branchId: '', providerId: '', agentId: '', amount: '', reference: '', note: '' });

  const mutation = useMutation({
    mutationFn: floatApi.create,
    onSuccess: () => {
      toast.success('Float transaction recorded');
      queryClient.invalidateQueries({ queryKey: ['floatAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['floatTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setModalOpen(false);
      setForm({ type: 'TOPUP', branchId: '', providerId: '', agentId: '', amount: '', reference: '', note: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to record transaction'),
  });

  const agentsForSelection = useMemo(
    () => (agents || []).filter((a) => a.providerId === form.providerId && (!form.branchId || a.branchId === form.branchId)),
    [agents, form.providerId, form.branchId]
  );

  const master = useMemo(() => (accounts || []).filter((a) => !a.agentId), [accounts]);
  const agentAccounts = useMemo(() => (accounts || []).filter((a) => a.agentId), [accounts]);

  const masterByBranch = useMemo(() => {
    const groups = {};
    for (const acc of master) {
      const key = acc.branch.name;
      groups[key] = groups[key] || [];
      groups[key].push(acc);
    }
    return groups;
  }, [master]);

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      branchId: form.branchId || undefined,
      agentId: form.type === 'TOPUP' || form.type === 'ADJUSTMENT' ? form.agentId || undefined : form.agentId,
      amount: Number(form.amount),
    });
  };

  if (loadingAccounts) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Float Management</h1>
          <p className="text-sm text-slate-500">Track each branch's master float and every agent's balance per provider.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BranchFilter value={branchId} onChange={setBranchId} />
          {canManage && <Button onClick={() => setModalOpen(true)}>+ Record Movement</Button>}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Master Accounts (branch balance with each provider)</h2>
        {Object.entries(masterByBranch).map(([branchName, accs]) => (
          <div key={branchName}>
            {Object.keys(masterByBranch).length > 1 && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{branchName}</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {accs.map((acc) => (
                <Card key={acc.id} className="p-4">
                  <p className="text-sm font-medium text-slate-500">{acc.provider.name}</p>
                  <p className="mt-1 text-xl font-bold text-brand-700">{formatMoney(acc.balance)}</p>
                  {acc.balance <= acc.lowFloatAt && <Badge tone="red">Low float</Badge>}
                </Card>
              ))}
            </div>
          </div>
        ))}
        {master.length === 0 && <EmptyState message="No master float accounts in scope." />}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Agent Float Accounts</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentAccounts.map((acc) => (
                <tr key={acc.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{acc.agent?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{acc.branch.name}</td>
                  <td className="px-4 py-3 text-slate-600">{acc.provider.name}</td>
                  <td className="px-4 py-3 font-semibold">{formatMoney(acc.balance)}</td>
                  <td className="px-4 py-3">
                    {acc.balance <= acc.lowFloatAt ? <Badge tone="red">Low float</Badge> : <Badge tone="green">Healthy</Badge>}
                  </td>
                </tr>
              ))}
              {agentAccounts.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState message="No agent float accounts yet." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Recent Float Movements</h2>
        <Card className="overflow-x-auto">
          {loadingLedger ? (
            <Spinner />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(ledger || []).map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 text-slate-500">{formatDate(tx.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={TYPE_TONE[tx.type]}>{titleCase(tx.type)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {tx.fromAccount ? `${tx.fromAccount.agent?.name || 'Master'} (${tx.fromAccount.provider.name})` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {tx.toAccount ? `${tx.toAccount.agent?.name || 'Master'} (${tx.toAccount.provider.name})` : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(tx.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{tx.recordedBy?.name}</td>
                  </tr>
                ))}
                {(ledger || []).length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState message="No float movements recorded yet." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Float Movement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, agentId: '' })}>
            <option value="TOPUP">Top-up (Provider → Master)</option>
            <option value="DISTRIBUTION">Distribution (Master → Agent)</option>
            <option value="RETURN">Return (Agent → Master)</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </Select>

          {isAdmin && (
            <Select label="Branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value, agentId: '' })} required>
              <option value="">Select branch…</option>
              {(branches || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}

          <Select label="Provider" value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value, agentId: '' })} required>
            <option value="">Select provider…</option>
            {(providers || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          {(form.type === 'DISTRIBUTION' || form.type === 'RETURN') && (
            <Select label="Agent" value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })} required>
              <option value="">Select agent…</option>
              {agentsForSelection.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}

          {form.type === 'ADJUSTMENT' && (
            <Select label="Account (leave blank for master account)" value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}>
              <option value="">Master account</option>
              {agentsForSelection.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}

          <Input label="Amount (ZMW)" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <Input label="Reference (optional)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <Input label="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Record Movement'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
