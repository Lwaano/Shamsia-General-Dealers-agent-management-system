import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { floatApi, reconciliationApi } from '../api/endpoints';
import BranchFilter from '../components/BranchFilter';
import { Button, Card, Modal, Input, Badge, Spinner, EmptyState } from '../components/ui';
import { formatMoney, formatDate, titleCase } from '../utils/format';

const varianceBadge = (variance) => {
  if (variance === null || variance === undefined) return <Badge tone="slate">N/A</Badge>;
  if (Math.abs(variance) < 0.01) return <Badge tone="green">Balanced</Badge>;
  return variance < 0 ? <Badge tone="red">Shortage {formatMoney(Math.abs(variance))}</Badge> : <Badge tone="amber">Overage {formatMoney(variance)}</Badge>;
};

export default function Reconciliation() {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState(undefined);
  const [openModalAccount, setOpenModalAccount] = useState(null);
  const [closeModalRecon, setCloseModalRecon] = useState(null);
  const [detailRecon, setDetailRecon] = useState(null);

  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['floatAccounts', branchId],
    queryFn: () => floatApi.listAccounts({ branchId }),
  });
  const { data: openRecons } = useQuery({
    queryKey: ['reconciliations', 'open', branchId],
    queryFn: () => reconciliationApi.list({ branchId, status: 'OPEN' }),
  });
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['reconciliations', 'all', branchId],
    queryFn: () => reconciliationApi.list({ branchId }),
  });
  const { data: detail } = useQuery({
    queryKey: ['reconciliation', detailRecon?.id],
    queryFn: () => reconciliationApi.get(detailRecon.id),
    enabled: !!detailRecon,
  });

  const openByAccountId = useMemo(() => {
    const map = {};
    (openRecons || []).forEach((r) => (map[r.floatAccountId] = r));
    return map;
  }, [openRecons]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
    queryClient.invalidateQueries({ queryKey: ['floatAccounts'] });
  };

  const [openForm, setOpenForm] = useState({ openingCash: '', openNote: '' });
  const openMutation = useMutation({
    mutationFn: reconciliationApi.open,
    onSuccess: () => {
      toast.success('Day opened');
      invalidateAll();
      setOpenModalAccount(null);
      setOpenForm({ openingCash: '', openNote: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to open day'),
  });

  const [closeForm, setCloseForm] = useState({ closingFloatCounted: '', closingCashCounted: '', closeNote: '' });
  const closeMutation = useMutation({
    mutationFn: ({ id, data }) => reconciliationApi.close(id, data),
    onSuccess: (recon) => {
      const balanced = Math.abs(recon.floatVariance || 0) < 0.01 && (recon.cashVariance === null || Math.abs(recon.cashVariance) < 0.01);
      toast[balanced ? 'success' : 'error'](balanced ? 'Day closed - balanced' : 'Day closed - variance found, check the report');
      invalidateAll();
      setCloseModalRecon(null);
      setCloseForm({ closingFloatCounted: '', closingCashCounted: '', closeNote: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to close day'),
  });

  const accountLabel = (acc) => `${acc.agent ? acc.agent.name : 'Master'} — ${acc.provider.name} (${acc.branch.name})`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Day Reconciliation</h1>
          <p className="text-sm text-slate-500">Open and close each float account's day, and see exactly where a shortage comes from.</p>
        </div>
        <BranchFilter value={branchId} onChange={setBranchId} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Accounts</h2>
        <Card className="overflow-x-auto">
          {loadingAccounts ? (
            <Spinner />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Current Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(accounts || []).map((acc) => {
                  const open = openByAccountId[acc.id];
                  return (
                    <tr key={acc.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{accountLabel(acc)}</td>
                      <td className="px-4 py-3 font-semibold">{formatMoney(acc.balance)}</td>
                      <td className="px-4 py-3">
                        {open ? <Badge tone="blue">Open since {formatDate(open.openedAt)}</Badge> : <Badge tone="slate">Not started</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        {open ? (
                          <Button variant="secondary" onClick={() => setCloseModalRecon(open)}>
                            Close Day
                          </Button>
                        ) : (
                          <Button onClick={() => setOpenModalAccount(acc)}>Open Day</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(accounts || []).length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState message="No float accounts in scope." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">History</h2>
        <Card className="overflow-x-auto">
          {loadingHistory ? (
            <Spinner />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Closed</th>
                  <th className="px-4 py-3">Float Variance</th>
                  <th className="px-4 py-3">Cash Variance</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(history || []).map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{accountLabel(r.floatAccount)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(r.openedAt)} · {r.openedBy?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.closedAt ? `${formatDate(r.closedAt)} · ${r.closedBy?.name}` : <Badge tone="blue">Open</Badge>}</td>
                    <td className="px-4 py-3">{r.status === 'CLOSED' ? varianceBadge(r.floatVariance) : '—'}</td>
                    <td className="px-4 py-3">{r.status === 'CLOSED' ? varianceBadge(r.cashVariance) : '—'}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" onClick={() => setDetailRecon(r)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {(history || []).length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState message="No reconciliations recorded yet." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Modal open={!!openModalAccount} onClose={() => setOpenModalAccount(null)} title={`Open Day — ${openModalAccount ? accountLabel(openModalAccount) : ''}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            openMutation.mutate({
              floatAccountId: openModalAccount.id,
              openingCash: openForm.openingCash ? Number(openForm.openingCash) : 0,
              openNote: openForm.openNote,
            });
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-500">
            System float balance right now: <span className="font-semibold text-slate-900">{formatMoney(openModalAccount?.balance)}</span>. This is recorded as the
            opening figure automatically.
          </p>
          {openModalAccount?.agent && (
            <Input
              label="Opening Cash on Hand (ZMW)"
              type="number"
              step="0.01"
              value={openForm.openingCash}
              onChange={(e) => setOpenForm({ ...openForm, openingCash: e.target.value })}
            />
          )}
          <Input label="Note (optional)" value={openForm.openNote} onChange={(e) => setOpenForm({ ...openForm, openNote: e.target.value })} />
          <Button type="submit" className="w-full" disabled={openMutation.isPending}>
            {openMutation.isPending ? 'Opening…' : 'Open Day'}
          </Button>
        </form>
      </Modal>

      <Modal open={!!closeModalRecon} onClose={() => setCloseModalRecon(null)} title={`Close Day — ${closeModalRecon ? accountLabel(closeModalRecon.floatAccount) : ''}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            closeMutation.mutate({
              id: closeModalRecon.id,
              data: {
                closingFloatCounted: Number(closeForm.closingFloatCounted),
                closingCashCounted: closeForm.closingCashCounted ? Number(closeForm.closingCashCounted) : undefined,
                closeNote: closeForm.closeNote,
              },
            });
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-500">
            Opened {closeModalRecon && formatDate(closeModalRecon.openedAt)} with opening float{' '}
            <span className="font-semibold text-slate-900">{formatMoney(closeModalRecon?.openingFloatBalance)}</span>
            {closeModalRecon?.floatAccount?.agent && (
              <>
                {' '}
                and opening cash <span className="font-semibold text-slate-900">{formatMoney(closeModalRecon?.openingCash)}</span>
              </>
            )}
            .
          </p>
          <Input
            label="Counted Float Balance (ZMW) — verify against the provider's app"
            type="number"
            step="0.01"
            value={closeForm.closingFloatCounted}
            onChange={(e) => setCloseForm({ ...closeForm, closingFloatCounted: e.target.value })}
            required
          />
          {closeModalRecon?.floatAccount?.agent && (
            <Input
              label="Counted Cash on Hand (ZMW)"
              type="number"
              step="0.01"
              value={closeForm.closingCashCounted}
              onChange={(e) => setCloseForm({ ...closeForm, closingCashCounted: e.target.value })}
            />
          )}
          <Input label="Note (optional)" value={closeForm.closeNote} onChange={(e) => setCloseForm({ ...closeForm, closeNote: e.target.value })} />
          <Button type="submit" className="w-full" disabled={closeMutation.isPending}>
            {closeMutation.isPending ? 'Closing…' : 'Close Day'}
          </Button>
        </form>
      </Modal>

      <Modal open={!!detailRecon} onClose={() => setDetailRecon(null)} title="Reconciliation Detail">
        {!detail ? (
          <Spinner />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Opening Float</p>
                <p className="font-semibold">{formatMoney(detail.reconciliation.openingFloatBalance)}</p>
              </div>
              <div>
                <p className="text-slate-500">Closing Float (System)</p>
                <p className="font-semibold">{formatMoney(detail.reconciliation.closingFloatBalance)}</p>
              </div>
              <div>
                <p className="text-slate-500">Closing Float (Counted)</p>
                <p className="font-semibold">{formatMoney(detail.reconciliation.closingFloatCounted)}</p>
              </div>
              <div>
                <p className="text-slate-500">Float Variance</p>
                {varianceBadge(detail.reconciliation.floatVariance)}
              </div>
              {detail.reconciliation.floatAccount.agent && (
                <>
                  <div>
                    <p className="text-slate-500">Expected Closing Cash</p>
                    <p className="font-semibold">{formatMoney(detail.reconciliation.expectedClosingCash)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Counted Cash</p>
                    <p className="font-semibold">{formatMoney(detail.reconciliation.closingCashCounted)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Cash Variance</p>
                    {varianceBadge(detail.reconciliation.cashVariance)}
                  </div>
                </>
              )}
            </div>

            {detail.transactions?.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Transactions During This Window ({detail.transactions.length})</h3>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {detail.transactions.map((t) => (
                        <tr key={t.id}>
                          <td className="px-3 py-2 text-slate-500">{formatDate(t.createdAt)}</td>
                          <td className="px-3 py-2">{titleCase(t.type)}</td>
                          <td className="px-3 py-2 font-medium">{formatMoney(t.amount)}</td>
                          <td className="px-3 py-2 text-slate-500">float {t.floatImpact >= 0 ? '+' : ''}{formatMoney(t.floatImpact)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detail.floatMovements?.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Float Movements During This Window ({detail.floatMovements.length})</h3>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {detail.floatMovements.map((m) => (
                        <tr key={m.id}>
                          <td className="px-3 py-2 text-slate-500">{formatDate(m.createdAt)}</td>
                          <td className="px-3 py-2">{titleCase(m.type)}</td>
                          <td className="px-3 py-2 font-medium">{formatMoney(m.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detail.transactions?.length === 0 && detail.floatMovements?.length === 0 && (
              <p className="text-sm text-slate-400">No activity recorded during this window.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
