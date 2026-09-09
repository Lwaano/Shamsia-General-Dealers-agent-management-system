import { useQuery } from '@tanstack/react-query';
import { branchApi } from '../api/endpoints';
import { Select } from './ui';
import { useAuth } from '../context/AuthContext';

// Only ADMIN sees this - Managers/Tellers are scoped to their own branch server-side,
// so there's nothing for them to switch between.
export default function BranchFilter({ value, onChange }) {
  const { user } = useAuth();
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: branchApi.list, enabled: user?.role === 'ADMIN' });

  if (user?.role !== 'ADMIN') return null;

  return (
    <Select value={value || ''} onChange={(e) => onChange(e.target.value || undefined)} className="min-w-[220px]">
      <option value="">All Branches (Combined)</option>
      {(branches || []).map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </Select>
  );
}
