import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { agentApi, providerApi, branchApi } from '../api/endpoints';
import BranchFilter from '../components/BranchFilter';
import { Button, Card, Modal, Select, Input, Badge, Spinner, EmptyState } from '../components/ui';
import { formatMoney, titleCase } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function Agents() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState(undefined);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);

  const { data: agents, isLoading } = useQuery({ queryKey: ['agents', branchId], queryFn: () => agentApi.list({ branchId }) });
  const { data: providers } = useQuery({ queryKey: ['providers'], queryFn: providerApi.list });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: branchApi.list });

  const [agentForm, setAgentForm] = useState({
    name: '',
    phoneNumber: '',
    location: '',
    agentType: 'MOBILE_MONEY_AGENT',
    commissionRate: '0.02',
    providerId: '',
    branchId: '',
  });
  const [providerForm, setProviderForm] = useState({ name: '', code: '', type: 'MOBILE_MONEY' });
  const [branchForm, setBranchForm] = useState({ name: '', town: '', address: '' });

  const agentMutation = useMutation({
    mutationFn: agentApi.create,
    onSuccess: () => {
      toast.success('Agent added');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['floatAccounts'] });
      setAgentModalOpen(false);
      setAgentForm({ name: '', phoneNumber: '', location: '', agentType: 'MOBILE_MONEY_AGENT', commissionRate: '0.02', providerId: '', branchId: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add agent'),
  });

  const providerMutation = useMutation({
    mutationFn: providerApi.create,
    onSuccess: () => {
      toast.success('Provider added — a master float account was created for every branch');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['floatAccounts'] });
      setProviderModalOpen(false);
      setProviderForm({ name: '', code: '', type: 'MOBILE_MONEY' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add provider'),
  });

  const branchMutation = useMutation({
    mutationFn: branchApi.create,
    onSuccess: () => {
      toast.success('Branch added — a master float account was created for every provider');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['floatAccounts'] });
      setBranchModalOpen(false);
      setBranchForm({ name: '', town: '', address: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add branch'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agents, Providers & Branches</h1>
          <p className="text-sm text-slate-500">Manage Shamsia's branch network, the providers it works with, and each branch's sub-agents.</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="secondary" onClick={() => setBranchModalOpen(true)}>
              + Branch
            </Button>
          )}
          <Button variant="secondary" onClick={() => setProviderModalOpen(true)}>
            + Provider
          </Button>
          <Button onClick={() => setAgentModalOpen(true)}>+ Agent</Button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Branches</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Town</th>
                <th className="px-4 py-3">Agents</th>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(branches || []).map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                  <td className="px-4 py-3 text-slate-600">{b.town}</td>
                  <td className="px-4 py-3">{b._count?.agents ?? 0}</td>
                  <td className="px-4 py-3">{b._count?.users ?? 0}</td>
                  <td className="px-4 py-3">{b.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>}</td>
                </tr>
              ))}
              {(branches || []).length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState message="No branches yet." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700">Agents</h2>
          <BranchFilter value={branchId} onChange={setBranchId} />
        </div>
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
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Phone</th>
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
                    <td className="px-4 py-3 text-slate-600">{a.branch?.name}</td>
                    <td className="px-4 py-3 text-slate-500">{a.phoneNumber}</td>
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
            agentMutation.mutate({ ...agentForm, commissionRate: Number(agentForm.commissionRate), branchId: agentForm.branchId || undefined });
          }}
          className="space-y-4"
        >
          <Input label="Name" value={agentForm.name} onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })} required />
          <Input label="Phone Number" value={agentForm.phoneNumber} onChange={(e) => setAgentForm({ ...agentForm, phoneNumber: e.target.value })} required />
          <Input label="Location (optional)" value={agentForm.location} onChange={(e) => setAgentForm({ ...agentForm, location: e.target.value })} />
          {isAdmin && (
            <Select label="Branch" value={agentForm.branchId} onChange={(e) => setAgentForm({ ...agentForm, branchId: e.target.value })} required>
              <option value="">Select branch…</option>
              {(branches || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
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

      <Modal open={branchModalOpen} onClose={() => setBranchModalOpen(false)} title="Add Branch">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            branchMutation.mutate(branchForm);
          }}
          className="space-y-4"
        >
          <Input label="Name" placeholder="e.g. Mazabuka Branch 11" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} required />
          <Input label="Town" placeholder="e.g. Mazabuka" value={branchForm.town} onChange={(e) => setBranchForm({ ...branchForm, town: e.target.value })} required />
          <Input label="Address (optional)" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
          <Button type="submit" className="w-full" disabled={branchMutation.isPending}>
            {branchMutation.isPending ? 'Saving…' : 'Add Branch'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
