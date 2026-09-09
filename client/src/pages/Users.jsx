import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { userApi, branchApi } from '../api/endpoints';
import { Button, Card, Modal, Select, Input, Badge, Spinner } from '../components/ui';

export default function Users() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: userApi.list });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: branchApi.list });
  const [form, setForm] = useState({ name: '', position: '', email: '', password: '', role: 'TELLER', branchId: '' });

  const mutation = useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
      toast.success('User created');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      setForm({ name: '', position: '', email: '', password: '', role: 'TELLER', branchId: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create user'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => userApi.update(id, { isActive }),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update user'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">Manage who can access the system and what they can do.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Add User</Button>
      </div>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(users || []).map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.position || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === 'ADMIN' ? 'blue' : u.role === 'MANAGER' ? 'amber' : 'slate'}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.branch ? u.branch.name : 'All / HQ'}</td>
                  <td className="px-4 py-3">{u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}>
                      {u.isActive ? 'Disable' : 'Enable'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add User">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ ...form, branchId: form.branchId || undefined });
          }}
          className="space-y-4"
        >
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input
            label="Position (job title)"
            placeholder="e.g. Branch Teller"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="TELLER">Teller</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </Select>
          {form.role !== 'ADMIN' && (
            <Select label="Branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
              <option value="">Select branch…</option>
              {(branches || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Add User'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
