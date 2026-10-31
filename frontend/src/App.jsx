import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import { ProductsGrid, SuppliersGrid, LedgerGrid, PredictionsGrid } from './components/DataGrids';
import { StockInModal, StockOutModal, ProductModal, SupplierModal } from './components/StockForms';
import sanchayApi from './api/sanchayApi';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

// Seed data matching smart_inventory schema
const SEED_SUPPLIERS = [
  { id: 1, name: 'National Agro Foods', contact_email: 'agro@nationalfoods.in', phone: '+91 98765 43210', created_at: new Date().toISOString() },
  { id: 2, name: 'Kaveri Dairy Cooperative', contact_email: 'sales@kaveridairy.com', phone: '+91 98220 11223', created_at: new Date().toISOString() },
  { id: 3, name: 'Golden Grains Wholesale', contact_email: 'orders@goldengrains.in', phone: '+91 99100 88776', created_at: new Date().toISOString() },
];

const SEED_PRODUCTS = [
  { id: 1, name: 'Basmati Rice 5kg', sku: 'RIC-BAS-001', supplier_id: 1, supplier_name: 'National Agro Foods', current_stock: 18, min_stock_level: 20, price: 450 },
  { id: 2, name: 'Sunflower Oil 1L', sku: 'OIL-SUN-002', supplier_id: 1, supplier_name: 'National Agro Foods', current_stock: 35, min_stock_level: 15, price: 140 },
  { id: 3, name: 'Refined Sugar 1kg', sku: 'SUG-REF-003', supplier_id: 3, supplier_name: 'Golden Grains Wholesale', current_stock: 0, min_stock_level: 10, price: 45 },
  { id: 4, name: 'Wheat Flour (Atta) 10kg', sku: 'FLR-WHT-004', supplier_id: 3, supplier_name: 'Golden Grains Wholesale', current_stock: 24, min_stock_level: 12, price: 380 },
  { id: 5, name: 'Full Cream Milk 500ml', sku: 'DAI-MLK-005', supplier_id: 2, supplier_name: 'Kaveri Dairy Cooperative', current_stock: 50, min_stock_level: 25, price: 32 },
];

const SEED_TRANSACTIONS = [
  { id: 101, product_id: 1, product_name: 'Basmati Rice 5kg', product_sku: 'RIC-BAS-001', transaction_type: 'IN', quantity: 30, transaction_date: '2026-10-25T10:00:00Z', notes: 'Initial stocking' },
  { id: 102, product_id: 1, product_name: 'Basmati Rice 5kg', product_sku: 'RIC-BAS-001', transaction_type: 'OUT', quantity: 4, transaction_date: '2026-10-26T14:30:00Z', notes: 'Retail sale' },
  { id: 103, product_id: 1, product_name: 'Basmati Rice 5kg', product_sku: 'RIC-BAS-001', transaction_type: 'OUT', quantity: 5, transaction_date: '2026-10-28T16:15:00Z', notes: 'Retail sale' },
  { id: 104, product_id: 1, product_name: 'Basmati Rice 5kg', product_sku: 'RIC-BAS-001', transaction_type: 'OUT', quantity: 3, transaction_date: '2026-10-30T11:45:00Z', notes: 'Bulk order' },
  { id: 105, product_id: 4, product_name: 'Wheat Flour (Atta) 10kg', product_sku: 'FLR-WHT-004', transaction_type: 'OUT', quantity: 3, transaction_date: '2026-10-27T17:00:00Z', notes: 'Retail sale' },
  { id: 106, product_id: 4, product_name: 'Wheat Flour (Atta) 10kg', product_sku: 'FLR-WHT-004', transaction_type: 'OUT', quantity: 2, transaction_date: '2026-10-29T13:20:00Z', notes: 'Retail sale' },
];

// Toast
function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] fade-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-xs ${
        toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-800'
      }`}>
        {toast.type === 'error'
          ? <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
          : <CheckCircle size={15} className="text-green-500 flex-shrink-0" />}
        <span className="text-xs">{toast.message}</span>
        <button onClick={onClose} className="ml-1 text-gray-400 hover:text-gray-600"><X size={13} /></button>
      </div>
    </div>
  );
}

// Confirm delete dialog
function Confirm({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-xl border border-gray-200 shadow-xl p-5 fade-in">
        <p className="text-sm text-gray-700 mb-4">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1 justify-center bg-red-500 hover:bg-red-600 text-white border-red-500">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [suppliers, setSuppliers] = useState(SEED_SUPPLIERS);
  const [transactions, setTransactions] = useState(SEED_TRANSACTIONS);
  const [analytics, setAnalytics] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [leadTime, setLeadTime] = useState(7);
  const [backendStatus, setBackendStatus] = useState({ status: 'offline' });
  const [loading, setLoading] = useState(false);

  // Modals
  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockOutOpen, setStockOutOpen] = useState(false);
  const [productModal, setProductModal] = useState({ open: false, data: null });
  const [supplierModal, setSupplierModal] = useState({ open: false, data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const toastRef = React.useRef();
  const showToast = (message, type = 'success') => {
    clearTimeout(toastRef.current);
    setToast({ message, type });
    toastRef.current = setTimeout(() => setToast(null), 3500);
  };

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const health = await sanchayApi.getHealth();
      setBackendStatus(health);

      const [prods, supps, txns, stats, preds] = await Promise.allSettled([
        sanchayApi.getProducts(),
        sanchayApi.getSuppliers(),
        sanchayApi.getTransactions(),
        sanchayApi.getAnalytics(),
        sanchayApi.getPredictions(leadTime),
      ]);

      if (prods.status === 'fulfilled' && prods.value) setProducts(prods.value);
      if (supps.status === 'fulfilled' && supps.value) setSuppliers(supps.value);
      if (txns.status === 'fulfilled' && txns.value) setTransactions(txns.value);
      if (stats.status === 'fulfilled' && stats.value) setAnalytics(stats.value);
      if (preds.status === 'fulfilled' && preds.value?.predictions) setPredictions(preds.value.predictions);
    } catch (e) {
      console.warn('Load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [leadTime]);

  useEffect(() => { loadData(); }, [loadData]);

  // Stock handlers
  const handleStockIn = async (data) => {
    try {
      await sanchayApi.stockIn(data);
      showToast(`Stocked in ${data.quantity} units`);
      await loadData();
    } catch (err) {
      const p = products.find(p => p.id === data.product_id);
      setProducts(prev => prev.map(p => p.id === data.product_id ? { ...p, current_stock: p.current_stock + data.quantity } : p));
      setTransactions(prev => [{ id: Date.now(), ...data, transaction_type: 'IN', transaction_date: new Date().toISOString(), product_name: p?.name, product_sku: p?.sku }, ...prev]);
      showToast(`Stocked in ${data.quantity} units (offline)`);
    }
  };

  const handleStockOut = async (data) => {
    const p = products.find(p => p.id === data.product_id);
    if (p && p.current_stock < data.quantity) throw new Error(`Only ${p.current_stock} units available`);
    try {
      await sanchayApi.stockOut(data);
      showToast(`Stocked out ${data.quantity} units`);
      await loadData();
    } catch (err) {
      if (err.message.includes('available') || err.message.includes('Insufficient')) throw err;
      setProducts(prev => prev.map(p => p.id === data.product_id ? { ...p, current_stock: p.current_stock - data.quantity } : p));
      setTransactions(prev => [{ id: Date.now(), ...data, transaction_type: 'OUT', transaction_date: new Date().toISOString(), product_name: p?.name, product_sku: p?.sku }, ...prev]);
      showToast(`Stocked out ${data.quantity} units (offline)`);
    }
  };

  // Product CRUD
  const handleSaveProduct = async (data, id) => {
    try {
      if (id) {
        await sanchayApi.updateProduct(id, data);
      } else {
        await sanchayApi.createProduct(data);
      }
      showToast(`Product ${id ? 'updated' : 'added'}`);
      await loadData();
    } catch (err) {
      if (id) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      } else {
        setProducts(prev => [{ id: Date.now(), ...data, supplier_name: suppliers.find(s => s.id === data.supplier_id)?.name }, ...prev]);
      }
      showToast(`Product ${id ? 'updated' : 'added'} (saved)`);
      await loadData();
    }
  };

  // Supplier CRUD
  const handleSaveSupplier = async (data, id) => {
    try {
      if (id) {
        await sanchayApi.updateSupplier(id, data);
      } else {
        await sanchayApi.createSupplier(data);
      }
      showToast(`Supplier ${id ? 'updated' : 'added'}`);
      await loadData();
    } catch (err) {
      if (id) setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
      else setSuppliers(prev => [{ id: Date.now(), ...data, created_at: new Date().toISOString() }, ...prev]);
      showToast(`Supplier ${id ? 'updated' : 'added'} (saved)`);
      await loadData();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, item } = deleteTarget;
    setDeleteTarget(null);
    try {
      if (type === 'product') { await sanchayApi.deleteProduct(item.id); }
      else { await sanchayApi.deleteSupplier(item.id); }
    } catch { 
      if (type === 'product') setProducts(p => p.filter(x => x.id !== item.id));
      else setSuppliers(s => s.filter(x => x.id !== item.id));
    }
    showToast(`"${item.name}" deleted`);
    await loadData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <Navbar
        activeTab={tab}
        setActiveTab={setTab}
        onOpenStockIn={() => setStockInOpen(true)}
        onOpenStockOut={() => setStockOutOpen(true)}
        backendStatus={backendStatus}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6">
        {tab === 'dashboard' && (
          <Dashboard
            analytics={analytics}
            products={products}
            transactions={transactions}
            predictions={predictions}
            setActiveTab={setTab}
            onOpenStockIn={() => setStockInOpen(true)}
            onOpenStockOut={() => setStockOutOpen(true)}
          />
        )}
        {tab === 'products' && (
          <ProductsGrid
            products={products}
            suppliers={suppliers}
            onAddProduct={() => setProductModal({ open: true, data: null })}
            onEditProduct={p => setProductModal({ open: true, data: p })}
            onDeleteProduct={p => setDeleteTarget({ type: 'product', item: p })}
          />
        )}
        {tab === 'suppliers' && (
          <SuppliersGrid
            suppliers={suppliers}
            onAddSupplier={() => setSupplierModal({ open: true, data: null })}
            onEditSupplier={s => setSupplierModal({ open: true, data: s })}
            onDeleteSupplier={s => setDeleteTarget({ type: 'supplier', item: s })}
          />
        )}
        {tab === 'ledger' && <LedgerGrid transactions={transactions} />}
        {tab === 'predictions' && (
          <PredictionsGrid
            predictions={predictions}
            leadTime={leadTime}
            setLeadTime={setLeadTime}
            onRefreshPredictions={loadData}
            isLoading={loading}
          />
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white py-3 text-center text-xs text-gray-400">
        Sanchay · Smart Inventory Management ·{' '}
        <span className={backendStatus.status === 'healthy' ? 'text-green-600' : 'text-amber-600'}>
          {backendStatus.status === 'healthy' ? `● Live (${backendStatus.mode})` : '● Offline mode'}
        </span>
      </footer>

      {/* Modals */}
      <StockInModal isOpen={stockInOpen} onClose={() => setStockInOpen(false)} products={products} onSubmitSuccess={handleStockIn} />
      <StockOutModal isOpen={stockOutOpen} onClose={() => setStockOutOpen(false)} products={products} onSubmitSuccess={handleStockOut} />
      <ProductModal isOpen={productModal.open} onClose={() => setProductModal({ open: false, data: null })} initialData={productModal.data} suppliers={suppliers} onSubmitSuccess={handleSaveProduct} />
      <SupplierModal isOpen={supplierModal.open} onClose={() => setSupplierModal({ open: false, data: null })} initialData={supplierModal.data} onSubmitSuccess={handleSaveSupplier} />
      <Confirm isOpen={!!deleteTarget} message={deleteTarget ? `Delete "${deleteTarget.item.name}"? This cannot be undone.` : ''} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
