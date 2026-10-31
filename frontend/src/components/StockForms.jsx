import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

// ─── Modal shell ──────────────────────────────────────────────────────────────
function Modal({ isOpen, onClose, title, children }) {
  const ref = useRef();

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className="overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === ref.current) onClose(); }}
    >
      <div className="bg-white w-full max-w-md rounded-xl border border-gray-200 shadow-xl fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10} />{error}</p>}
    </div>
  );
}

// ─── Submit row ───────────────────────────────────────────────────────────────
function Actions({ onCancel, loading, label, danger }) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
      <button
        type="submit"
        disabled={loading}
        className={`flex-1 justify-center inline-flex items-center gap-2 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 ${
          danger ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {loading && <Loader2 size={13} className="animate-spin" />}
        {label}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK IN
// ═══════════════════════════════════════════════════════════════════════════════
export function StockInModal({ isOpen, onClose, products, onSubmitSuccess }) {
  const [form, setForm] = useState({ product_id: '', quantity: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) { setForm({ product_id: '', quantity: '', notes: '' }); setErrors({}); }
  }, [isOpen]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.product_id) errs.product_id = 'Select a product';
    if (!form.quantity || Number(form.quantity) <= 0) errs.quantity = 'Enter a positive quantity';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await onSubmitSuccess({ product_id: Number(form.product_id), quantity: Number(form.quantity), notes: form.notes || null });
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  }

  const selected = products.find(p => p.id === Number(form.product_id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stock In">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Product" required error={errors.product_id}>
          <select value={form.product_id} onChange={set('product_id')} className="input">
            <option value="">Select product…</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku}) — {p.current_stock} in stock</option>
            ))}
          </select>
        </Field>

        {selected && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Current stock: <strong className="text-gray-900">{selected.current_stock}</strong> · Min level: {selected.min_stock_level}
          </p>
        )}

        <Field label="Quantity" required error={errors.quantity}>
          <input type="number" value={form.quantity} onChange={set('quantity')} placeholder="e.g. 50" min="1" className="input" />
        </Field>

        <Field label="Notes">
          <textarea value={form.notes} onChange={set('notes')} placeholder="Optional note…" rows={2} className="input resize-none" />
        </Field>

        {errors.submit && <p className="text-xs text-red-500">{errors.submit}</p>}
        <Actions onCancel={onClose} loading={loading} label="Confirm Stock In" />
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK OUT
// ═══════════════════════════════════════════════════════════════════════════════
export function StockOutModal({ isOpen, onClose, products, onSubmitSuccess }) {
  const [form, setForm] = useState({ product_id: '', quantity: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) { setForm({ product_id: '', quantity: '', notes: '' }); setErrors({}); }
  }, [isOpen]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.product_id) errs.product_id = 'Select a product';
    const qty = Number(form.quantity);
    if (!form.quantity || qty <= 0) errs.quantity = 'Enter a positive quantity';
    const p = products.find(p => p.id === Number(form.product_id));
    if (p && qty > p.current_stock) errs.quantity = `Only ${p.current_stock} units available`;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await onSubmitSuccess({ product_id: Number(form.product_id), quantity: qty, notes: form.notes || null });
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  }

  const selected = products.find(p => p.id === Number(form.product_id));
  const qty = Number(form.quantity);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stock Out">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Product" required error={errors.product_id}>
          <select value={form.product_id} onChange={set('product_id')} className="input">
            <option value="">Select product…</option>
            {products.map(p => (
              <option key={p.id} value={p.id} disabled={p.current_stock <= 0}>
                {p.name} ({p.sku}) — {p.current_stock} available{p.current_stock <= 0 ? ' [empty]' : ''}
              </option>
            ))}
          </select>
        </Field>

        {selected && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Available: <strong className="text-gray-900">{selected.current_stock}</strong> units
            {qty > 0 && qty <= selected.current_stock && (
              <> → After: <strong className="text-red-600">{selected.current_stock - qty}</strong></>
            )}
          </p>
        )}

        <Field label="Quantity" required error={errors.quantity}>
          <input type="number" value={form.quantity} onChange={set('quantity')} placeholder="e.g. 10" min="1" className="input" />
        </Field>

        <Field label="Notes">
          <textarea value={form.notes} onChange={set('notes')} placeholder="Optional note…" rows={2} className="input resize-none" />
        </Field>

        {errors.submit && <p className="text-xs text-red-500">{errors.submit}</p>}
        <Actions onCancel={onClose} loading={loading} label="Confirm Stock Out" danger />
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
export function ProductModal({ isOpen, onClose, initialData, suppliers, onSubmitSuccess }) {
  const isEdit = !!initialData;
  const [form, setForm] = useState({ name: '', sku: '', supplier_id: '', price: '', current_stock: '0', min_stock_level: '10' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setForm(initialData
      ? { name: initialData.name || '', sku: initialData.sku || '', supplier_id: initialData.supplier_id || '', price: initialData.price ?? '', current_stock: initialData.current_stock ?? 0, min_stock_level: initialData.min_stock_level ?? 10 }
      : { name: '', sku: '', supplier_id: '', price: '', current_stock: '0', min_stock_level: '10' }
    );
  }, [isOpen, initialData]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.sku.trim()) errs.sku = 'SKU is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await onSubmitSuccess({
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        price: form.price ? Number(form.price) : null,
        current_stock: isEdit ? undefined : Number(form.current_stock),
        min_stock_level: Number(form.min_stock_level) || 10,
      }, initialData?.id);
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Product' : 'Add Product'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Product Name" required error={errors.name}>
            <input type="text" value={form.name} onChange={set('name')} placeholder="e.g. Basmati Rice 5kg" className="input" />
          </Field>
          <Field label="SKU" required error={errors.sku}>
            <input type="text" value={form.sku} onChange={set('sku')} placeholder="e.g. RIC-001" className="input uppercase" />
          </Field>
        </div>

        <Field label="Supplier">
          <select value={form.supplier_id} onChange={set('supplier_id')} className="input">
            <option value="">No supplier</option>
            {(suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Price (₹)">
            <input type="number" value={form.price} onChange={set('price')} placeholder="0.00" min="0" step="0.01" className="input" />
          </Field>
          {!isEdit && (
            <Field label="Initial Stock">
              <input type="number" value={form.current_stock} onChange={set('current_stock')} placeholder="0" min="0" className="input" />
            </Field>
          )}
          <Field label="Min Level">
            <input type="number" value={form.min_stock_level} onChange={set('min_stock_level')} placeholder="10" min="0" className="input" />
          </Field>
        </div>

        {errors.submit && <p className="text-xs text-red-500">{errors.submit}</p>}
        <Actions onCancel={onClose} loading={loading} label={isEdit ? 'Save Changes' : 'Add Product'} />
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLIER MODAL
// ═══════════════════════════════════════════════════════════════════════════════
export function SupplierModal({ isOpen, onClose, initialData, onSubmitSuccess }) {
  const isEdit = !!initialData;
  const [form, setForm] = useState({ name: '', contact_email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setForm(initialData
      ? { name: initialData.name || '', contact_email: initialData.contact_email || '', phone: initialData.phone || '' }
      : { name: '', contact_email: '', phone: '' }
    );
  }, [isOpen, initialData]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) errs.contact_email = 'Invalid email';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await onSubmitSuccess({ name: form.name.trim(), contact_email: form.contact_email || null, phone: form.phone || null }, initialData?.id);
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Supplier' : 'Add Supplier'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Supplier Name" required error={errors.name}>
          <input type="text" value={form.name} onChange={set('name')} placeholder="e.g. National Agro Foods" className="input" />
        </Field>
        <Field label="Email" error={errors.contact_email}>
          <input type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="e.g. orders@supplier.com" className="input" />
        </Field>
        <Field label="Phone">
          <input type="tel" value={form.phone} onChange={set('phone')} placeholder="e.g. +91 98765 43210" className="input" />
        </Field>
        {errors.submit && <p className="text-xs text-red-500">{errors.submit}</p>}
        <Actions onCancel={onClose} loading={loading} label={isEdit ? 'Save Changes' : 'Add Supplier'} />
      </form>
    </Modal>
  );
}
