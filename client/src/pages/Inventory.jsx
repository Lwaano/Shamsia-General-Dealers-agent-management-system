import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { inventoryApi } from '../api/endpoints';
import { Button, Card, Modal, Select, Input, Badge, Spinner, EmptyState } from '../components/ui';
import { formatMoney, formatDate, titleCase } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function Inventory() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const queryClient = useQueryClient();
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  const { data: items, isLoading } = useQuery({ queryKey: ['inventoryItems'], queryFn: inventoryApi.listItems });
  const { data: categories } = useQuery({ queryKey: ['inventoryCategories'], queryFn: inventoryApi.listCategories });
  const { data: movements } = useQuery({ queryKey: ['inventoryTransactions'], queryFn: () => inventoryApi.listTransactions({}) });

  const [txForm, setTxForm] = useState({ type: 'SALE', itemId: '', quantity: '', unitPrice: '', note: '' });
  const [itemForm, setItemForm] = useState({ name: '', sku: '', unitCost: '', unitPrice: '', quantityOnHand: '', reorderLevel: '5', categoryId: '' });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
    queryClient.invalidateQueries({ queryKey: ['inventoryTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const txMutation = useMutation({
    mutationFn: inventoryApi.createTransaction,
    onSuccess: () => {
      toast.success('Stock movement recorded');
      invalidateAll();
      setTxModalOpen(false);
      setTxForm({ type: 'SALE', itemId: '', quantity: '', unitPrice: '', note: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to record movement'),
  });

  const itemMutation = useMutation({
    mutationFn: inventoryApi.createItem,
    onSuccess: () => {
      toast.success('Item added');
      invalidateAll();
      setItemModalOpen(false);
      setItemForm({ name: '', sku: '', unitCost: '', unitPrice: '', quantityOnHand: '', reorderLevel: '5', categoryId: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add item'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">Stock levels for the general dealer side of the business.</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button variant="secondary" onClick={() => setItemModalOpen(true)}>
              + Add Item
            </Button>
          )}
          <Button onClick={() => setTxModalOpen(true)}>+ Record Movement</Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">On Hand</th>
                <th className="px-4 py-3">Unit Cost</th>
                <th className="px-4 py-3">Unit Price</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(items || []).map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500">{item.sku}</td>
                  <td className="px-4 py-3 text-slate-600">{item.category?.name || '—'}</td>
                  <td className="px-4 py-3 font-semibold">{item.quantityOnHand}</td>
                  <td className="px-4 py-3">{formatMoney(item.unitCost)}</td>
                  <td className="px-4 py-3">{formatMoney(item.unitPrice)}</td>
                  <td className="px-4 py-3">
                    {item.quantityOnHand <= item.reorderLevel ? <Badge tone="red">Low stock</Badge> : <Badge tone="green">In stock</Badge>}
                  </td>
                </tr>
              ))}
              {(items || []).length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState message="No inventory items yet." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Recent Stock Movements</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Qty After</th>
                <th className="px-4 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(movements || []).map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-slate-500">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={m.type === 'SALE' ? 'blue' : m.type === 'PURCHASE' ? 'green' : 'slate'}>{titleCase(m.type)}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{m.item.name}</td>
                  <td className="px-4 py-3">{m.quantity}</td>
                  <td className="px-4 py-3 font-semibold">{formatMoney(m.totalAmount)}</td>
                  <td className="px-4 py-3">{m.quantityAfter}</td>
                  <td className="px-4 py-3 text-slate-500">{m.recordedBy?.name}</td>
                </tr>
              ))}
              {(movements || []).length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState message="No stock movements recorded yet." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <Modal open={txModalOpen} onClose={() => setTxModalOpen(false)} title="Record Stock Movement">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            txMutation.mutate({ ...txForm, quantity: Number(txForm.quantity), unitPrice: txForm.unitPrice ? Number(txForm.unitPrice) : undefined });
          }}
          className="space-y-4"
        >
          <Select label="Type" value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}>
            <option value="SALE">Sale (stock out)</option>
            <option value="PURCHASE">Purchase (stock in)</option>
            <option value="ADJUSTMENT">Adjustment (set exact quantity)</option>
          </Select>
          <Select label="Item" value={txForm.itemId} onChange={(e) => setTxForm({ ...txForm, itemId: e.target.value })} required>
            <option value="">Select item…</option>
            {(items || []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.quantityOnHand} on hand)
              </option>
            ))}
          </Select>
          <Input
            label={txForm.type === 'ADJUSTMENT' ? 'New Quantity On Hand' : 'Quantity'}
            type="number"
            min="1"
            value={txForm.quantity}
            onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })}
            required
          />
          <Input label="Unit Price (optional, defaults to item price/cost)" type="number" step="0.01" value={txForm.unitPrice} onChange={(e) => setTxForm({ ...txForm, unitPrice: e.target.value })} />
          <Input label="Note (optional)" value={txForm.note} onChange={(e) => setTxForm({ ...txForm, note: e.target.value })} />
          <Button type="submit" className="w-full" disabled={txMutation.isPending}>
            {txMutation.isPending ? 'Saving…' : 'Record Movement'}
          </Button>
        </form>
      </Modal>

      <Modal open={itemModalOpen} onClose={() => setItemModalOpen(false)} title="Add Inventory Item">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            itemMutation.mutate(itemForm);
          }}
          className="space-y-4"
        >
          <Input label="Name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
          <Input label="SKU" value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} required />
          <Select label="Category" value={itemForm.categoryId} onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}>
            <option value="">Uncategorized</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Unit Cost" type="number" step="0.01" value={itemForm.unitCost} onChange={(e) => setItemForm({ ...itemForm, unitCost: e.target.value })} required />
            <Input label="Unit Price" type="number" step="0.01" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Opening Quantity" type="number" value={itemForm.quantityOnHand} onChange={(e) => setItemForm({ ...itemForm, quantityOnHand: e.target.value })} />
            <Input label="Reorder Level" type="number" value={itemForm.reorderLevel} onChange={(e) => setItemForm({ ...itemForm, reorderLevel: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={itemMutation.isPending}>
            {itemMutation.isPending ? 'Saving…' : 'Add Item'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
