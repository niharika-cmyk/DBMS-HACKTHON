import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Pencil, Trash2,
  AlertTriangle, CheckCircle, XCircle, Info, RefreshCw,
  ArrowUpDown,
} from 'lucide-react';

// ─── Shared: stock status pill ────────────────────────────────────────────────
function StatusPill({ stock, min }) {
  if (stock <= 0)
    return <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-red-50 text-red-600">Out of stock</span>;
  if (stock <= min)
    return <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-600">Low stock</span>;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-green-50 text-green-700">In stock</span>;
}

// ─── Shared: sortable column header ──────────────────────────────────────────
function Th({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th
      className="table-th cursor-pointer select-none hover:text-gray-700"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown size={11} className={active ? 'text-indigo-500' : 'text-gray-300'} />
      </span>
    </th>
  );
}

function useSort(data, defaultField = 'name') {
  const [field, setField] = useState(defaultField);
  const [dir, setDir] = useState('asc');

  const onSort = (f) => {
    if (field === f) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setField(f); setDir('asc'); }
  };

  const sorted = useMemo(() =>
    [...data].sort((a, b) => {
      let av = a[field] ?? '', bv = b[field] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return av < bv ? (dir === 'asc' ? -1 : 1) : av > bv ? (dir === 'asc' ? 1 : -1) : 0;
    }),
  [data, field, dir]);

  return { sorted, sortField: field, sortDir: dir, onSort };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS GRID
// ═══════════════════════════════════════════════════════════════════════════════
export function ProductsGrid({ products, onAddProduct, onEditProduct, onDeleteProduct }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => products.filter(p => {
    const matchSearch = `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'Low Stock') return p.current_stock > 0 && p.current_stock <= p.min_stock_level;
    if (filter === 'Out of Stock') return p.current_stock <= 0;
    if (filter === 'In Stock') return p.current_stock > p.min_stock_level;
    return true;
  }), [products, search, filter]);

  const { sorted, sortField, sortDir, onSort } = useSort(filtered, 'name');

  return (
    <div className="space-y-4 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500">{products.length} items tracked</p>
        </div>
        <button onClick={onAddProduct} className="btn-primary self-start sm:self-auto">
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or SKU…"
              className="input pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  filter === f
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                <th className="table-th">SKU</th>
                <th className="table-th">Supplier</th>
                <Th label="Price" field="price" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                <Th label="Stock" field="current_stock" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                <th className="table-th">Min Level</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan="8" className="table-td text-center text-gray-400 py-10">No products found.</td></tr>
              ) : sorted.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="table-td font-medium">{p.name}</td>
                  <td className="table-td font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="table-td text-gray-500">{p.supplier_name || '—'}</td>
                  <td className="table-td">{p.price ? `₹${Number(p.price).toFixed(2)}` : '—'}</td>
                  <td className={`table-td font-semibold ${
                    p.current_stock <= 0 ? 'text-red-600' :
                    p.current_stock <= p.min_stock_level ? 'text-amber-600' : 'text-gray-900'
                  }`}>{p.current_stock}</td>
                  <td className="table-td text-gray-500">{p.min_stock_level}</td>
                  <td className="table-td">
                    <StatusPill stock={p.current_stock} min={p.min_stock_level} />
                  </td>
                  <td className="table-td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEditProduct(p)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => onDeleteProduct(p)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
          {sorted.length} of {products.length} products
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLIERS GRID
// ═══════════════════════════════════════════════════════════════════════════════
export function SuppliersGrid({ suppliers, onAddSupplier, onEditSupplier, onDeleteSupplier }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    suppliers.filter(s => `${s.name} ${s.contact_email || ''}`.toLowerCase().includes(search.toLowerCase())),
  [suppliers, search]);

  const { sorted, sortField, sortDir, onSort } = useSort(filtered, 'name');

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Suppliers</h2>
          <p className="text-sm text-gray-500">{suppliers.length} suppliers registered</p>
        </div>
        <button onClick={onAddSupplier} className="btn-primary">
          <Plus size={14} /> Add Supplier
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers…" className="input pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                <th className="table-th">Email</th>
                <th className="table-th">Phone</th>
                <Th label="Added" field="created_at" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan="5" className="table-td text-center text-gray-400 py-10">No suppliers found.</td></tr>
              ) : sorted.map(s => (
                <tr key={s.id} className="table-row">
                  <td className="table-td font-medium">{s.name}</td>
                  <td className="table-td">
                    {s.contact_email
                      ? <a href={`mailto:${s.contact_email}`} className="text-indigo-600 hover:underline">{s.contact_email}</a>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="table-td text-gray-500 font-mono text-xs">{s.phone || '—'}</td>
                  <td className="table-td text-gray-500 text-xs">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="table-td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEditSupplier(s)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => onDeleteSupplier(s)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER GRID
// ═══════════════════════════════════════════════════════════════════════════════
export function LedgerGrid({ transactions }) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');

  const filtered = useMemo(() => transactions.filter(t => {
    const matchSearch = `${t.product_name} ${t.product_sku} ${t.notes || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchType = type === 'All' || t.transaction_type === type;
    return matchSearch && matchType;
  }), [transactions, search, type]);

  return (
    <div className="space-y-4 fade-in">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Inventory Ledger</h2>
        <p className="text-sm text-gray-500">Complete history of all stock movements</p>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by product, SKU, or note…" className="input pl-9" />
          </div>
          <div className="flex gap-1.5">
            {['All', 'IN', 'OUT'].map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                {t === 'All' ? 'All' : t === 'IN' ? '↓ IN' : '↑ OUT'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Product</th>
                <th className="table-th">SKU</th>
                <th className="table-th">Type</th>
                <th className="table-th text-right">Qty</th>
                <th className="table-th">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="table-td text-center text-gray-400 py-10">No transactions found.</td></tr>
              ) : filtered.map(t => {
                const isIn = t.transaction_type === 'IN';
                return (
                  <tr key={t.id} className="table-row">
                    <td className="table-td text-xs text-gray-500 font-mono whitespace-nowrap">
                      {t.transaction_date
                        ? new Date(t.transaction_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="table-td font-medium">{t.product_name || '—'}</td>
                    <td className="table-td font-mono text-xs text-gray-500">{t.product_sku || '—'}</td>
                    <td className="table-td">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${isIn ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className={`table-td text-right font-semibold ${isIn ? 'text-green-700' : 'text-red-600'}`}>
                      {isIn ? '+' : '−'}{t.quantity}
                    </td>
                    <td className="table-td text-gray-400 text-xs truncate max-w-[180px]">{t.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
          {filtered.length} of {transactions.length} records
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI PREDICTIONS GRID
// ═══════════════════════════════════════════════════════════════════════════════
export function PredictionsGrid({ predictions, leadTime, setLeadTime, onRefreshPredictions, isLoading }) {
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() =>
    filter === 'All' ? predictions : predictions.filter(p => p.risk_level === filter),
  [predictions, filter]);

  return (
    <div className="space-y-4 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">AI Insights</h2>
          <p className="text-sm text-gray-500">Stockout predictions based on transaction history</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Lead time</label>
          <select
            value={leadTime}
            onChange={e => setLeadTime(Number(e.target.value))}
            className="input py-1.5 w-28"
          >
            {[3, 5, 7, 10, 14, 21, 30].map(d => <option key={d} value={d}>{d} days</option>)}
          </select>
          <button onClick={onRefreshPredictions} disabled={isLoading} className="btn-primary disabled:opacity-60">
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Analyzing…' : 'Run'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'All', color: 'bg-gray-100 text-gray-700', count: predictions.length },
          { label: 'Critical', color: 'bg-red-50 text-red-600', count: predictions.filter(p => p.risk_level === 'Critical').length },
          { label: 'Warning', color: 'bg-amber-50 text-amber-600', count: predictions.filter(p => p.risk_level === 'Warning').length },
          { label: 'Safe', color: 'bg-green-50 text-green-700', count: predictions.filter(p => p.risk_level === 'Safe').length },
        ].map(({ label, color, count }) => (
          <button
            key={label}
            onClick={() => setFilter(label)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              filter === label ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-transparent'
            } ${color}`}
          >
            {label} <span className="font-bold">{count}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Product</th>
                <th className="table-th text-right">Stock</th>
                <th className="table-th text-right">Demand/day</th>
                <th className="table-th text-right">Days Left</th>
                <th className="table-th">Stockout Date</th>
                <th className="table-th text-right">Reorder Qty</th>
                <th className="table-th">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="table-td text-center text-gray-400 py-10">
                  No predictions yet. Click "Run" to analyse inventory.
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.product_id} className={`table-row ${
                  p.risk_level === 'Critical' ? 'bg-red-50/40' :
                  p.risk_level === 'Warning' ? 'bg-amber-50/40' : ''
                }`}>
                  <td className="table-td">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                  </td>
                  <td className={`table-td text-right font-semibold ${
                    p.current_stock <= 0 ? 'text-red-600' :
                    p.current_stock <= p.min_stock_level ? 'text-amber-600' : 'text-gray-900'
                  }`}>{p.current_stock}</td>
                  <td className="table-td text-right text-gray-600">
                    {p.avg_daily_demand != null ? p.avg_daily_demand.toFixed(2) : '—'}
                  </td>
                  <td className={`table-td text-right font-medium ${
                    p.days_of_stock_left != null && p.days_of_stock_left <= 7 ? 'text-red-600' :
                    p.days_of_stock_left != null && p.days_of_stock_left <= 14 ? 'text-amber-600' : 'text-gray-700'
                  }`}>
                    {p.days_of_stock_left != null ? `${p.days_of_stock_left}d` : '—'}
                  </td>
                  <td className="table-td text-xs font-mono text-gray-500">{p.stockout_date || '—'}</td>
                  <td className="table-td text-right font-semibold text-indigo-600">
                    {p.suggested_reorder_qty > 0 ? p.suggested_reorder_qty : '—'}
                  </td>
                  <td className="table-td">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                      p.risk_level === 'Critical' ? 'bg-red-50 text-red-600' :
                      p.risk_level === 'Warning' ? 'bg-amber-50 text-amber-600' :
                      p.risk_level === 'Safe' ? 'bg-green-50 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {p.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Predictions based on OUT transaction history. Reorder point = avg daily demand × lead time + safety stock.
      </p>
    </div>
  );
}
