/**
 * SANCHAY AI — Resilient API Client with Universal Offline & Standalone Mode
 * Connects to live backend API (Express/MySQL/Python) when available,
 * and seamlessly provides full client-side persistence & ML demand forecasting
 * when deployed on static CDNs (e.g., GitHub Pages).
 */

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = import.meta.env?.VITE_API_BASE_URL || (isLocal ? 'http://localhost:5000/api' : '/api');

// ─── Initial Seed Data ────────────────────────────────────────────────────────
const INITIAL_SUPPLIERS = [
  { id: 1, name: 'National Agro Foods', contact_email: 'agro@nationalfoods.in', phone: '+91 98765 43210', created_at: new Date().toISOString() },
  { id: 2, name: 'Kaveri Dairy Cooperative', contact_email: 'sales@kaveridairy.com', phone: '+91 98220 11223', created_at: new Date().toISOString() },
  { id: 3, name: 'Golden Grains Wholesale', contact_email: 'orders@goldengrains.in', phone: '+91 99100 88776', created_at: new Date().toISOString() },
];

const INITIAL_PRODUCTS = [
  { id: 1, name: 'Basmati Rice 5kg', sku: 'RIC-BAS-001', supplier_id: 1, supplier_name: 'National Agro Foods', current_stock: 18, min_stock_level: 20, price: 450.00, created_at: new Date().toISOString() },
  { id: 2, name: 'Sunflower Oil 1L', sku: 'OIL-SUN-002', supplier_id: 1, supplier_name: 'National Agro Foods', current_stock: 35, min_stock_level: 15, price: 140.00, created_at: new Date().toISOString() },
  { id: 3, name: 'Refined Sugar 1kg', sku: 'SUG-REF-003', supplier_id: 3, supplier_name: 'Golden Grains Wholesale', current_stock: 0, min_stock_level: 10, price: 45.00, created_at: new Date().toISOString() },
  { id: 4, name: 'Wheat Flour (Atta) 10kg', sku: 'FLR-WHT-004', supplier_id: 3, supplier_name: 'Golden Grains Wholesale', current_stock: 24, min_stock_level: 12, price: 380.00, created_at: new Date().toISOString() },
  { id: 5, name: 'Full Cream Milk 500ml', sku: 'DAI-MLK-005', supplier_id: 2, supplier_name: 'Kaveri Dairy Cooperative', current_stock: 50, min_stock_level: 25, price: 32.00, created_at: new Date().toISOString() },
];

const INITIAL_TRANSACTIONS = [
  { id: 101, product_id: 1, product_name: 'Basmati Rice 5kg', product_sku: 'RIC-BAS-001', transaction_type: 'IN', quantity: 30, transaction_date: '2026-10-25T10:00:00Z', notes: 'Initial stocking from National Agro' },
  { id: 102, product_id: 1, product_name: 'Basmati Rice 5kg', product_sku: 'RIC-BAS-001', transaction_type: 'OUT', quantity: 4, transaction_date: '2026-10-26T14:30:00Z', notes: 'Retail sale' },
  { id: 103, product_id: 1, product_name: 'Basmati Rice 5kg', product_sku: 'RIC-BAS-001', transaction_type: 'OUT', quantity: 5, transaction_date: '2026-10-28T16:15:00Z', notes: 'Retail sale' },
  { id: 104, product_id: 1, product_name: 'Basmati Rice 5kg', product_sku: 'RIC-BAS-001', transaction_type: 'OUT', quantity: 3, transaction_date: '2026-10-30T11:45:00Z', notes: 'Bulk purchase order' },
  { id: 105, product_id: 4, product_name: 'Wheat Flour (Atta) 10kg', product_sku: 'FLR-WHT-004', transaction_type: 'OUT', quantity: 3, transaction_date: '2026-10-27T17:00:00Z', notes: 'Retail sale' },
  { id: 106, product_id: 4, product_name: 'Wheat Flour (Atta) 10kg', product_sku: 'FLR-WHT-004', transaction_type: 'OUT', quantity: 2, transaction_date: '2026-10-29T13:20:00Z', notes: 'Retail sale' },
];

// ─── Local Storage Helper ───────────────────────────────────────────────────
function getStorage(key, fallback) {
  try {
    const val = localStorage.getItem(`sanchay_${key}`);
    return val ? JSON.parse(val) : fallback;
  } catch (_) {
    return fallback;
  }
}

function setStorage(key, val) {
  try {
    localStorage.setItem(`sanchay_${key}`, JSON.stringify(val));
  } catch (_) {}
}

function initLocalStore() {
  if (!getStorage('suppliers', null)) setStorage('suppliers', INITIAL_SUPPLIERS);
  if (!getStorage('products', null)) setStorage('products', INITIAL_PRODUCTS);
  if (!getStorage('transactions', null)) setStorage('transactions', INITIAL_TRANSACTIONS);
}

initLocalStore();

// ─── Core Mathematical Forecasting Engine (Browser implementation) ───────────
function calculatePredictions(products, transactions, leadTime = 7) {
  const now = new Date();
  const outTxns = transactions.filter(t => (t.transaction_type || '').toUpperCase() === 'OUT');

  return products.map(product => {
    const pId = product.id;
    const name = product.name || 'Unknown Product';
    const sku = product.sku || '';
    const currentStock = Number(product.current_stock) || 0;
    const minStockLevel = Number(product.min_stock_level) || 10;
    const price = Number(product.price) || 0;

    const pOuts = outTxns.filter(t => Number(t.product_id) === Number(pId));

    if (pOuts.length < 2) {
      const risk = currentStock <= 0 ? 'Critical' : currentStock <= minStockLevel ? 'Warning' : 'Insufficient Data';
      return {
        product_id: pId,
        name,
        sku,
        current_stock: currentStock,
        min_stock_level: minStockLevel,
        avg_daily_demand: null,
        safety_stock: minStockLevel,
        reorder_point: minStockLevel,
        suggested_reorder_qty: currentStock <= minStockLevel ? Math.max(0, Math.round(minStockLevel * 2 - currentStock)) : 0,
        days_of_stock_left: currentStock <= 0 ? 0 : null,
        stockout_date: currentStock <= 0 ? now.toISOString().slice(0, 10) : null,
        risk_level: risk,
        confidence_score: 0.35,
        notes: 'Insufficient historical OUT transactions (< 2 events).',
      };
    }

    // Sort consumption events chronologically
    const events = pOuts
      .map(t => ({
        date: new Date(t.transaction_date || t.created_at || now),
        qty: Number(t.quantity) || 0,
      }))
      .sort((a, b) => a.date - b.date);

    const totalConsumed = events.reduce((sum, e) => sum + e.qty, 0);
    const firstDate = events[0].date;
    const daysSpan = Math.max(1, Math.round((now - firstDate) / 86400000));
    let avgDailyDemand = totalConsumed / daysSpan;
    if (avgDailyDemand <= 0) avgDailyDemand = 0.05;

    // Standard deviation of consumption quantities
    const quantities = events.map(e => e.qty);
    const meanQty = totalConsumed / quantities.length;
    const variance = quantities.reduce((acc, q) => acc + Math.pow(q - meanQty, 2), 0) / Math.max(1, quantities.length - 1);
    const stdDev = Math.sqrt(variance);

    // Safety stock (95% service level, Z = 1.645)
    const zScore = 1.645;
    const rawSafety = zScore * Math.sqrt(Math.max(1, leadTime)) * Math.max(stdDev, avgDailyDemand * 0.25);
    const safetyStock = Math.round(Math.max(rawSafety, minStockLevel * 0.5) * 10) / 10;

    // Reorder point
    const leadDemand = avgDailyDemand * leadTime;
    const reorderPoint = Math.round((leadDemand + safetyStock) * 10) / 10;

    // Stockout forecast
    const daysLeft = currentStock / avgDailyDemand;
    const stockoutDt = new Date(now.getTime() + daysLeft * 86400000);
    const stockoutStr = stockoutDt.toISOString().slice(0, 10);

    // Target coverage: lead time + 14-day cycle buffer + safety stock
    const targetCoverage = avgDailyDemand * (leadTime + 14) + safetyStock;
    const suggestedReorder = Math.max(0, Math.round(targetCoverage - currentStock));

    // Risk classification
    let risk = 'Safe';
    if (currentStock <= 0 || daysLeft <= leadTime) {
      risk = 'Critical';
    } else if (daysLeft <= leadTime * 1.5 || currentStock <= reorderPoint) {
      risk = 'Warning';
    }

    const confidence = events.length >= 5 ? 0.88 : events.length >= 3 ? 0.72 : 0.50;

    return {
      product_id: pId,
      name,
      sku,
      current_stock: currentStock,
      min_stock_level: minStockLevel,
      avg_daily_demand: Math.round(avgDailyDemand * 100) / 100,
      safety_stock: safetyStock,
      reorder_point: reorderPoint,
      suggested_reorder_qty: suggestedReorder,
      days_of_stock_left: Math.round(daysLeft * 10) / 10,
      stockout_date: stockoutStr,
      risk_level: risk,
      confidence_score: confidence,
      notes: `Forecast based on ${events.length} OUT events over ${daysSpan} days.`,
    };
  });
}

function calculateAnalytics(products, transactions, suppliers) {
  const totalProducts = products.length;
  const totalStockUnits = products.reduce((a, p) => a + (Number(p.current_stock) || 0), 0);
  const totalInventoryValue = products.reduce((a, p) => a + ((Number(p.current_stock) || 0) * (Number(p.price) || 0)), 0);
  const lowStockCount = products.filter(p => Number(p.current_stock) > 0 && Number(p.current_stock) <= Number(p.min_stock_level)).length;
  const outOfStockCount = products.filter(p => Number(p.current_stock) <= 0).length;

  const totalStockIn = transactions.filter(t => t.transaction_type === 'IN').reduce((a, t) => a + (Number(t.quantity) || 0), 0);
  const totalStockOut = transactions.filter(t => t.transaction_type === 'OUT').reduce((a, t) => a + (Number(t.quantity) || 0), 0);

  return {
    metrics: {
      totalProducts,
      totalStockUnits,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      lowStockCount,
      outOfStockCount,
      activeSuppliers: suppliers.length,
    },
    stockMovement: { totalStockIn, totalStockOut },
  };
}

// ─── HTTP Response Handler ───────────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, credentials: 'omit', signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function handleResponse(res) {
  if (!res.ok) {
    let msg = `Server error (${res.status})`;
    try {
      const json = await res.json();
      if (json?.error) msg = json.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

// ─── API Client Object ───────────────────────────────────────────────────────
const sanchayApi = {
  // ─── System ──────────────────────────────────────────────────────────────
  async getHealth() {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 2000);
      return await handleResponse(res);
    } catch (err) {
      return {
        status: 'standalone',
        brand: 'SANCHAY AI',
        mode: 'Client In-Memory / Local Storage Engine',
        version: '2.0.0-standalone',
      };
    }
  },

  // ─── Suppliers ────────────────────────────────────────────────────────────
  async getSuppliers() {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/suppliers`);
      const data = await handleResponse(res);
      setStorage('suppliers', data);
      return data;
    } catch (_) {
      return getStorage('suppliers', INITIAL_SUPPLIERS);
    }
  },

  async createSupplier(data) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const created = await handleResponse(res);
      const supps = getStorage('suppliers', INITIAL_SUPPLIERS);
      setStorage('suppliers', [created, ...supps]);
      return created;
    } catch (_) {
      const supps = getStorage('suppliers', INITIAL_SUPPLIERS);
      const newSupplier = {
        id: Date.now(),
        ...data,
        created_at: new Date().toISOString(),
      };
      setStorage('suppliers', [newSupplier, ...supps]);
      return newSupplier;
    }
  },

  async updateSupplier(id, data) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updated = await handleResponse(res);
      const supps = getStorage('suppliers', INITIAL_SUPPLIERS);
      setStorage('suppliers', supps.map(s => (s.id === id ? updated : s)));
      return updated;
    } catch (_) {
      const supps = getStorage('suppliers', INITIAL_SUPPLIERS);
      let updated = null;
      const next = supps.map(s => {
        if (s.id === id) {
          updated = { ...s, ...data };
          return updated;
        }
        return s;
      });
      setStorage('suppliers', next);
      return updated || { id, ...data };
    }
  },

  async deleteSupplier(id) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/suppliers/${id}`, { method: 'DELETE' });
      await handleResponse(res);
    } catch (_) {}
    const supps = getStorage('suppliers', INITIAL_SUPPLIERS);
    setStorage('suppliers', supps.filter(s => s.id !== id));
    return { success: true };
  },

  // ─── Products ─────────────────────────────────────────────────────────────
  async getProducts() {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/products`);
      const data = await handleResponse(res);
      setStorage('products', data);
      return data;
    } catch (_) {
      const prods = getStorage('products', INITIAL_PRODUCTS);
      const supps = getStorage('suppliers', INITIAL_SUPPLIERS);
      return prods.map(p => ({
        ...p,
        supplier_name: p.supplier_name || supps.find(s => s.id === p.supplier_id)?.name || 'Direct / General',
      }));
    }
  },

  async createProduct(data) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const created = await handleResponse(res);
      const prods = getStorage('products', INITIAL_PRODUCTS);
      setStorage('products', [created, ...prods]);
      return created;
    } catch (_) {
      const prods = getStorage('products', INITIAL_PRODUCTS);
      const supps = getStorage('suppliers', INITIAL_SUPPLIERS);
      const newProduct = {
        id: Date.now(),
        ...data,
        supplier_name: supps.find(s => s.id === data.supplier_id)?.name || 'Direct / General',
        created_at: new Date().toISOString(),
      };
      setStorage('products', [newProduct, ...prods]);
      return newProduct;
    }
  },

  async updateProduct(id, data) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updated = await handleResponse(res);
      const prods = getStorage('products', INITIAL_PRODUCTS);
      setStorage('products', prods.map(p => (p.id === id ? updated : p)));
      return updated;
    } catch (_) {
      const prods = getStorage('products', INITIAL_PRODUCTS);
      const supps = getStorage('suppliers', INITIAL_SUPPLIERS);
      let updated = null;
      const next = prods.map(p => {
        if (p.id === id) {
          updated = {
            ...p,
            ...data,
            supplier_name: supps.find(s => s.id === data.supplier_id)?.name || p.supplier_name,
          };
          return updated;
        }
        return p;
      });
      setStorage('products', next);
      return updated || { id, ...data };
    }
  },

  async deleteProduct(id) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/products/${id}`, { method: 'DELETE' });
      await handleResponse(res);
    } catch (_) {}
    const prods = getStorage('products', INITIAL_PRODUCTS);
    setStorage('products', prods.filter(p => p.id !== id));
    return { success: true };
  },

  // ─── Stock Transactions ───────────────────────────────────────────────────
  async getTransactions() {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/transactions`);
      const data = await handleResponse(res);
      setStorage('transactions', data);
      return data;
    } catch (_) {
      return getStorage('transactions', INITIAL_TRANSACTIONS);
    }
  },

  async stockIn(data) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/transactions/stock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse(res);
    } catch (_) {
      const prods = getStorage('products', INITIAL_PRODUCTS);
      const txns = getStorage('transactions', INITIAL_TRANSACTIONS);
      const p = prods.find(p => p.id === data.product_id);
      if (p) {
        p.current_stock = (Number(p.current_stock) || 0) + Number(data.quantity);
        setStorage('products', prods);
      }
      const newTxn = {
        id: Date.now(),
        product_id: data.product_id,
        product_name: p?.name || 'Product',
        product_sku: p?.sku || '',
        transaction_type: 'IN',
        quantity: Number(data.quantity),
        transaction_date: new Date().toISOString(),
        notes: data.notes || 'Stock IN replenishment',
      };
      setStorage('transactions', [newTxn, ...txns]);
      return { success: true, product: p, transaction: newTxn };
    }
  },

  async stockOut(data) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/transactions/stock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse(res);
    } catch (err) {
      if (err.message && (err.message.includes('available') || err.message.includes('Insufficient'))) {
        throw err;
      }
      const prods = getStorage('products', INITIAL_PRODUCTS);
      const txns = getStorage('transactions', INITIAL_TRANSACTIONS);
      const p = prods.find(p => p.id === data.product_id);
      if (p) {
        if (p.current_stock < data.quantity) {
          throw new Error(`Only ${p.current_stock} units available in stock`);
        }
        p.current_stock = (Number(p.current_stock) || 0) - Number(data.quantity);
        setStorage('products', prods);
      }
      const newTxn = {
        id: Date.now(),
        product_id: data.product_id,
        product_name: p?.name || 'Product',
        product_sku: p?.sku || '',
        transaction_type: 'OUT',
        quantity: Number(data.quantity),
        transaction_date: new Date().toISOString(),
        notes: data.notes || 'Stock OUT fulfillment',
      };
      setStorage('transactions', [newTxn, ...txns]);
      return { success: true, product: p, transaction: newTxn };
    }
  },

  // ─── Analytics ────────────────────────────────────────────────────────────
  async getAnalytics() {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/analytics`);
      return await handleResponse(res);
    } catch (_) {
      const prods = getStorage('products', INITIAL_PRODUCTS);
      const txns = getStorage('transactions', INITIAL_TRANSACTIONS);
      const supps = getStorage('suppliers', INITIAL_SUPPLIERS);
      return calculateAnalytics(prods, txns, supps);
    }
  },

  // ─── AI Predictions ───────────────────────────────────────────────────────
  async getPredictions(leadTime = 7) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/predictions?leadTime=${leadTime}`);
      return await handleResponse(res);
    } catch (_) {
      const prods = getStorage('products', INITIAL_PRODUCTS);
      const txns = getStorage('transactions', INITIAL_TRANSACTIONS);
      const preds = calculatePredictions(prods, txns, leadTime);
      return {
        success: true,
        brand: 'SANCHAY AI',
        lead_time_days: leadTime,
        source: 'sanchay_browser_ml_engine',
        predictions: preds,
      };
    }
  },
};

export default sanchayApi;
