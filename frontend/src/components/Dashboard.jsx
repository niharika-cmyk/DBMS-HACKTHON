import React from 'react';
import { Package, AlertTriangle, TrendingDown, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

function StatCard({ label, value, sub, color = 'indigo' }) {
  const accent = {
    indigo: 'text-indigo-600',
    green:  'text-green-600',
    amber:  'text-amber-600',
    red:    'text-red-600',
  }[color];

  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard({ analytics, products, transactions, predictions, setActiveTab, onOpenStockIn, onOpenStockOut }) {
  const m = analytics?.metrics || {
    totalProducts: products.length,
    totalStockUnits: products.reduce((a, p) => a + (p.current_stock || 0), 0),
    totalInventoryValue: products.reduce((a, p) => a + ((p.current_stock || 0) * (p.price || 0)), 0),
    lowStockCount: products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length,
    outOfStockCount: products.filter(p => p.current_stock <= 0).length,
    activeSuppliers: 0,
  };

  const mv = analytics?.stockMovement || {
    totalStockIn: transactions.filter(t => t.transaction_type === 'IN').reduce((a, t) => a + (t.quantity || 0), 0),
    totalStockOut: transactions.filter(t => t.transaction_type === 'OUT').reduce((a, t) => a + (t.quantity || 0), 0),
  };

  const alerts = (predictions || []).filter(p => p.risk_level === 'Critical' || p.risk_level === 'Warning');
  const recent = transactions.slice(0, 8);

  return (
    <div className="space-y-5 fade-in">

      {/* Alert banner — only shows when there's a problem */}
      {(m.outOfStockCount > 0 || m.lowStockCount > 0) && (
        <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{m.outOfStockCount} out of stock</span> and{' '}
              <span className="font-semibold">{m.lowStockCount} low stock</span> items need attention.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('predictions')}
            className="text-xs font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap underline underline-offset-2"
          >
            View insights →
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Products" value={m.totalProducts} sub={`${m.activeSuppliers} suppliers`} color="indigo" />
        <StatCard label="Total Stock" value={m.totalStockUnits.toLocaleString()} sub="units on hand" color="green" />
        <StatCard
          label="Inventory Value"
          value={`₹${(m.totalInventoryValue / 1000).toFixed(1)}k`}
          sub={`₹${m.totalInventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          color="indigo"
        />
        <StatCard
          label="Alerts"
          value={m.outOfStockCount + m.lowStockCount}
          sub={`${m.outOfStockCount} out · ${m.lowStockCount} low`}
          color={m.outOfStockCount > 0 ? 'red' : 'amber'}
        />
      </div>

      {/* Middle: Movement + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Stock movement */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Stock Movement</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowDownToLine size={14} className="text-indigo-500" />
                Total stocked in
              </div>
              <span className="text-sm font-semibold text-gray-900">{mv.totalStockIn} units</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowUpFromLine size={14} className="text-red-400" />
                Total stocked out
              </div>
              <span className="text-sm font-semibold text-gray-900">{mv.totalStockOut} units</span>
            </div>
            <div className="border-t border-gray-100 pt-4 flex gap-2">
              <button onClick={onOpenStockIn} className="btn-primary text-xs py-1.5 flex-1 justify-center">
                <ArrowDownToLine size={13} /> Stock In
              </button>
              <button onClick={onOpenStockOut} className="btn-secondary text-xs py-1.5 flex-1 justify-center">
                <ArrowUpFromLine size={13} /> Stock Out
              </button>
            </div>
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Low Stock Alerts</h3>
            {alerts.length > 0 && (
              <button onClick={() => setActiveTab('predictions')} className="text-xs text-indigo-600 hover:underline">
                View all →
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">All stock levels are healthy.</p>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 4).map(item => (
                <div key={item.product_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.current_stock} in stock</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                    item.risk_level === 'Critical'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}>
                    {item.risk_level}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
          <button onClick={() => setActiveTab('ledger')} className="text-xs text-indigo-600 hover:underline">
            View all →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Product</th>
                <th className="table-th">Type</th>
                <th className="table-th text-right">Qty</th>
                <th className="table-th">Notes</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan="5" className="table-td text-center text-gray-400 py-8">
                    No transactions yet.
                  </td>
                </tr>
              ) : recent.map(t => {
                const isIn = t.transaction_type === 'IN';
                return (
                  <tr key={t.id} className="table-row">
                    <td className="table-td text-gray-500 font-mono text-xs">
                      {t.transaction_date
                        ? new Date(t.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : '—'}
                    </td>
                    <td className="table-td font-medium">{t.product_name || '—'}</td>
                    <td className="table-td">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                        isIn ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {isIn ? 'IN' : 'OUT'}
                      </span>
                    </td>
                    <td className={`table-td text-right font-semibold ${isIn ? 'text-green-700' : 'text-red-600'}`}>
                      {isIn ? '+' : '−'}{t.quantity}
                    </td>
                    <td className="table-td text-gray-400 text-xs truncate max-w-[160px]">{t.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
