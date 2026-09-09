import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/endpoints';
import { Card, Select, Badge, Spinner, EmptyState } from '../components/ui';
import { formatDate, titleCase } from '../utils/format';

const ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'CREATE_TRANSACTION',
  'CREATE_FLOAT_TRANSACTION',
  'CREATE_INVENTORY_TRANSACTION',
  'CREATE_INVENTORY_ITEM',
  'UPDATE_INVENTORY_ITEM',
  'CREATE_AGENT',
  'UPDATE_AGENT',
  'CREATE_PROVIDER',
  'UPDATE_PROVIDER',
  'CREATE_BRANCH',
  'UPDATE_BRANCH',
  'CREATE_USER',
  'UPDATE_USER',
  'OPEN_RECONCILIATION',
  'CLOSE_RECONCILIATION',
];

const TONE = {
  LOGIN_SUCCESS: 'green',
  LOGIN_FAILED: 'red',
};

export default function AuditLog() {
  const [action, setAction] = useState('');
  const { data: logs, isLoading } = useQuery({
    queryKey: ['auditLog', action],
    queryFn: () => auditApi.list({ action: action || undefined }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-500">Every login and every change made across the system.</p>
      </div>

      <Card className="p-4">
        <Select label="Action" value={action} onChange={(e) => setAction(e.target.value)} className="max-w-xs">
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {titleCase(a)}
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
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(logs || []).map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-slate-500">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{log.user ? log.user.name : log.metadata?.email || 'Unknown'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TONE[log.action] || 'slate'}>{titleCase(log.action)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId.slice(-6)}` : ''}` : '—'}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-500" title={JSON.stringify(log.metadata)}>
                    {log.metadata ? JSON.stringify(log.metadata) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{log.ipAddress || '—'}</td>
                </tr>
              ))}
              {(logs || []).length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState message="No audit log entries yet." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
