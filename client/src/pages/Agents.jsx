import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { agentApi, providerApi } from '../api/endpoints';
import { Button, Card, Modal, Select, Input, Badge, Spinner, EmptyState } from '../components/ui';
import { formatMoney, titleCase } from '../utils/format';

export default function Agents() {
  const queryClient = useQueryClient();
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [providerModalOpen, setProviderModalOpen] = useState(false);

  const { data: agents, isLoading } = useQuery({ queryKey: ['agents'], queryFn: agentApi.list });
  const { data: providers } = useQuery({ queryKey: ['providers'], queryFn: providerApi.list });

  const [agentForm, setAgentForm] = useState({ name: '', phoneNumber: '', location: '', agentType: 'MOBILE_MONEY_AGENT', commissionRate: '0.02', providerId: '' });
  const [providerForm, setProviderForm] = useState({ name: '', code: '', type: 'MOBILE_MONEY' });

  const agentMutation = useMutation({
    mutationFn: agentApi.create,
    onSuccess: () => {
      toast.success('Agent added');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['floatAccounts'] });
      setAgentModalOpen(false);
      setAgentForm({ name: '', phoneNumber: '', location: '', agentType: 'MOBILE_MONEY_AGENT', commissionRate: '0.02', providerId: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add agent'),
  });

  const providerMutation = useMutation({
    mutationFn: providerApi.create,
    onSuccess: () => {
      toast.success('Provider added');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['floatAccounts'] });
      setProviderModalOpen(false);
      setProviderForm({ name: '', code: '', type: 'MOBILE_MONEY' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add provider'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agents & Providers</h1>
          <p className="text-sm text-slate-500">Manage the network of sub-agents and the providers Shamsia works with.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setProviderModalOpen(true)}>
            + Provider
          </Button>
          <Button onClick={() => setAgentModalOpen(true)}>+ Agent</Button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Providers</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Agents</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(providers || []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.code}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.type === 'BANK' ? 'blue' : 'green'}>{titleCase(p.type)}</Badge>
                  </td>
                  <td className="px-4 py-3">{p._count?.agents ?? 0}</td>
                  <td className="px-4 py-3">{p.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Agents</h2>
        <Card className="overflow-x-auto">
          {isLoading ? (
            <Spinner />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Float Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(agents || []).map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                    <td className="px-4 py-3">
                      <Badge tone={a.agentType === 'BANKING_AGENT' ? 'blue' : 'green'}>{titleCase(a.agentType)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.provider.name}</td>
                    <td className="px-4 py-3 text-slate-500">{a.phoneNumber}</td>
                    <td className="px-4 py-3 text-slate-500">{a.location || '—'}</td>
                    <td className="px-4 py-3">{(a.commissionRate * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(a.floatAccounts?.[0]?.balance)}</td>
                  </tr>
                ))}
                {(agents || []).length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState message="No agents yet." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Modal open={agentModalOpen} onClose={() => setAgentModalOpen(false)} title="Add Agent">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            agentMutation.mutate({ ...agentForm, commissionRate: Number(agentForm.commissionRate) });
          }}
          className="space-y-4"
        >
          <Input label="Name" value={agentForm.name} onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })} required />
          <Input label="Phone Number" value={agentForm.phoneNumber} onChange={(e) => setAgentForm({ ...agentForm, phoneNumber: e.target.value })} required />
          <Input label="Location (optional)" value={agentForm.location} onChange={(e) => setAgentForm({ ...agentForm, location: e.target.value })} />
          <Select label="Agent Type" value={agentForm.agentType} onChange={(e) => setAgentForm({ ...agentForm, agentType: e.target.value })}>
            <option value="MOBILE_MONEY_AGENT">Mobile Money Agent</option>
            <option value="BANKING_AGENT">Banking Express Agent</option>
          </Select>
          <Select label="Provider" value={agentForm.providerId} onChange={(e) => setAgentForm({ ...agentForm, providerId: e.target.value })} required>
            <option value="">Select provider…</option>
            {(providers || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input
            label="Commission Rate (e.g. 0.02 = 2%)"
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={agentForm.commissionRate}
            onChange={(e) => setAgentForm({ ...agentForm, commissionRate: e.target.value })}
            required
          />
          <Button type="submit" className="w-full" disabled={agentMutation.isPending}>
            {agentMutation.isPending ? 'Saving…' : 'Add Agent'}
          </Button>
        </form>
      </Modal>

      <Modal open={providerModalOpen} onClose={() => setProviderModalOpen(false)} title="Add Provider">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            providerMutation.mutate(providerForm);
          }}
          className="space-y-4"
        >
          <Input label="Name" value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} required />
          <Input label="Code (unique, e.g. MTN)" value={providerForm.code} onChange={(e) => setProviderForm({ ...providerForm, code: e.target.value.toUpperCase() })} required />
          <Select label="Type" value={providerForm.type} onChange={(e) => setProviderForm({ ...providerForm, type: e.target.value })}>
            <option value="MOBILE_MONEY">Mobile Money Operator</option>
            <option value="BANK">Bank</option>
          </Select>
          <Button type="submit" className="w-full" disabled={providerMutation.isPending}>
            {providerMutation.isPending ? 'Saving…' : 'Add Provider'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
