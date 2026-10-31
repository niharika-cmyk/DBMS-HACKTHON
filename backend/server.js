/**
 * SANCHAY AI — Smart Inventory Management System
 * Production-grade Express.js REST API
 * Database: smart_inventory (MySQL)
 * Tables: suppliers, products, stock_transactions
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));

// ─── In-Memory Fallback Store (schema-matched to smart_inventory) ────────────
const mockDb = {
  suppliers: [
    { id: 1, name: 'National Agro Foods', contact_email: 'agro@nationalfoods.in', phone: '+91 98765 43210', created_at: new Date().toISOString() },
    { id: 2, name: 'Kaveri Dairy Cooperative', contact_email: 'sales@kaveridairy.com', phone: '+91 98220 11223', created_at: new Date().toISOString() },
    { id: 3, name: 'Golden Grains Wholesale', contact_email: 'orders@goldengrains.in', phone: '+91 99100 88776', created_at: new Date().toISOString() },
  ],
  products: [
    { id: 1, name: 'Basmati Rice 5kg', sku: 'RIC-BAS-001', supplier_id: 1, current_stock: 18, min_stock_level: 20, price: 450.00, created_at: new Date().toISOString() },
    { id: 2, name: 'Sunflower Oil 1L', sku: 'OIL-SUN-002', supplier_id: 1, current_stock: 35, min_stock_level: 15, price: 140.00, created_at: new Date().toISOString() },
    { id: 3, name: 'Refined Sugar 1kg', sku: 'SUG-REF-003', supplier_id: 3, current_stock: 0, min_stock_level: 10, price: 45.00, created_at: new Date().toISOString() },
    { id: 4, name: 'Wheat Flour (Atta) 10kg', sku: 'FLR-WHT-004', supplier_id: 3, current_stock: 24, min_stock_level: 12, price: 380.00, created_at: new Date().toISOString() },
    { id: 5, name: 'Full Cream Milk 500ml', sku: 'DAI-MLK-005', supplier_id: 2, current_stock: 50, min_stock_level: 25, price: 32.00, created_at: new Date().toISOString() },
  ],
  stock_transactions: [
    { id: 101, product_id: 1, transaction_type: 'IN', quantity: 30, transaction_date: '2026-10-25T10:00:00Z', notes: 'Initial stocking from National Agro' },
    { id: 102, product_id: 1, transaction_type: 'OUT', quantity: 4, transaction_date: '2026-10-26T14:30:00Z', notes: 'Retail sale' },
    { id: 103, product_id: 1, transaction_type: 'OUT', quantity: 5, transaction_date: '2026-10-28T16:15:00Z', notes: 'Retail sale' },
    { id: 104, product_id: 1, transaction_type: 'OUT', quantity: 3, transaction_date: '2026-10-30T11:45:00Z', notes: 'Bulk purchase order' },
    { id: 105, product_id: 4, transaction_type: 'OUT', quantity: 3, transaction_date: '2026-10-27T17:00:00Z', notes: 'Retail sale' },
    { id: 106, product_id: 4, transaction_type: 'OUT', quantity: 2, transaction_date: '2026-10-29T13:20:00Z', notes: 'Retail sale' },
  ],
  nextSupplierId: 4,
  nextProductId: 6,
  nextTransactionId: 107,
};

// ─── MySQL Connection Pool ───────────────────────────────────────────────────
let dbPool = null;
let useMySQL = false;

async function initDatabase() {
  try {
    dbPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'smart_inventory',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 3000,
    });
    const conn = await dbPool.getConnection();
    await conn.ping();
    conn.release();
    useMySQL = true;
    console.log('✓ Connected to MySQL → smart_inventory');

    // Auto-seed initial reference data if tables are empty
    try {
      const [sCount] = await dbPool.query('SELECT COUNT(*) as cnt FROM suppliers');
      if (sCount[0].cnt === 0) {
        for (const s of mockDb.suppliers) {
          await dbPool.query('INSERT IGNORE INTO suppliers (id, name, contact_email, phone) VALUES (?, ?, ?, ?)', [s.id, s.name, s.contact_email, s.phone]);
        }
        for (const p of mockDb.products) {
          await dbPool.query('INSERT IGNORE INTO products (id, name, sku, supplier_id, current_stock, min_stock_level, price) VALUES (?, ?, ?, ?, ?, ?, ?)', [p.id, p.name, p.sku, p.supplier_id, p.current_stock, p.min_stock_level, p.price]);
        }
        for (const t of mockDb.stock_transactions) {
          await dbPool.query('INSERT IGNORE INTO stock_transactions (id, product_id, transaction_type, quantity, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?)', [t.id, t.product_id, t.transaction_type, t.quantity, t.transaction_date.slice(0, 19).replace('T', ' '), t.notes]);
        }
        console.log('✓ Initial seed completed in MySQL');
      }
    } catch (seedErr) {
      console.warn('Auto-seed check notice:', seedErr.message);
    }
  } catch (err) {
    useMySQL = false;
    console.log(`ℹ MySQL unavailable (${err.message}). Running with in-memory fallback store.`);
  }
}

initDatabase();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function dbQuery(sql, params = []) {
  if (!useMySQL || !dbPool) throw new Error('MySQL not connected');
  return dbPool.query(sql, params);
}

function getStockStatus(current_stock, min_stock_level) {
  if (current_stock <= 0) return 'Out of Stock';
  if (current_stock <= min_stock_level) return 'Low Stock';
  return 'Available';
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ─── Health & Diagnostics ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    brand: 'SANCHAY AI',
    version: '2.0.0',
    mode: useMySQL ? 'mysql' : 'in-memory',
    database: useMySQL ? 'smart_inventory' : 'mock',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/db-test', asyncHandler(async (req, res) => {
  if (!useMySQL || !dbPool) {
    return res.json({ connected: false, mode: 'in-memory', message: 'Running with mock data store.' });
  }
  const [rows] = await dbPool.query(
    'SELECT COUNT(*) AS products, (SELECT COUNT(*) FROM suppliers) AS suppliers, (SELECT COUNT(*) FROM stock_transactions) AS transactions FROM products'
  );
  res.json({ connected: true, mode: 'mysql', database: 'smart_inventory', counts: rows[0] });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/suppliers
app.get('/api/suppliers', asyncHandler(async (req, res) => {
  if (useMySQL) {
    const [rows] = await dbQuery('SELECT * FROM suppliers ORDER BY created_at DESC');
    return res.json(rows);
  }
  res.json([...mockDb.suppliers].reverse());
}));

// GET /api/suppliers/:id
app.get('/api/suppliers/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (useMySQL) {
    const [rows] = await dbQuery('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Supplier not found' });
    return res.json(rows[0]);
  }
  const s = mockDb.suppliers.find(s => s.id === id);
  if (!s) return res.status(404).json({ error: 'Supplier not found' });
  res.json(s);
}));

// POST /api/suppliers
app.post('/api/suppliers', asyncHandler(async (req, res) => {
  const { name, contact_email, phone } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Supplier name is required' });

  if (useMySQL) {
    const [result] = await dbQuery(
      'INSERT INTO suppliers (name, contact_email, phone) VALUES (?, ?, ?)',
      [name.trim(), contact_email || null, phone || null]
    );
    const [rows] = await dbQuery('SELECT * FROM suppliers WHERE id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  }

  const newSupplier = {
    id: mockDb.nextSupplierId++,
    name: name.trim(),
    contact_email: contact_email || null,
    phone: phone || null,
    created_at: new Date().toISOString(),
  };
  mockDb.suppliers.push(newSupplier);
  res.status(201).json(newSupplier);
}));

// PUT /api/suppliers/:id
app.put('/api/suppliers/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, contact_email, phone } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Supplier name is required' });

  if (useMySQL) {
    const [result] = await dbQuery(
      'UPDATE suppliers SET name = ?, contact_email = ?, phone = ? WHERE id = ?',
      [name.trim(), contact_email || null, phone || null, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Supplier not found' });
    const [rows] = await dbQuery('SELECT * FROM suppliers WHERE id = ?', [id]);
    return res.json(rows[0]);
  }

  const idx = mockDb.suppliers.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Supplier not found' });
  mockDb.suppliers[idx] = { ...mockDb.suppliers[idx], name: name.trim(), contact_email: contact_email || null, phone: phone || null };
  res.json(mockDb.suppliers[idx]);
}));

// DELETE /api/suppliers/:id
app.delete('/api/suppliers/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (useMySQL) {
    const [result] = await dbQuery('DELETE FROM suppliers WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Supplier not found' });
    return res.json({ success: true, message: `Supplier ${id} deleted` });
  }
  const idx = mockDb.suppliers.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Supplier not found' });
  mockDb.suppliers.splice(idx, 1);
  res.json({ success: true, message: `Supplier ${id} deleted` });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/products
app.get('/api/products', asyncHandler(async (req, res) => {
  if (useMySQL) {
    const [rows] = await dbQuery(`
      SELECT p.*, s.name AS supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.created_at DESC
    `);
    return res.json(rows.map(p => ({ ...p, stock_status: getStockStatus(p.current_stock, p.min_stock_level) })));
  }
  const enriched = mockDb.products.map(p => {
    const supplier = mockDb.suppliers.find(s => s.id === p.supplier_id);
    return { ...p, supplier_name: supplier?.name || null, stock_status: getStockStatus(p.current_stock, p.min_stock_level) };
  });
  res.json([...enriched].reverse());
}));

// GET /api/products/:id
app.get('/api/products/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (useMySQL) {
    const [rows] = await dbQuery(
      'SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    return res.json({ ...rows[0], stock_status: getStockStatus(rows[0].current_stock, rows[0].min_stock_level) });
  }
  const p = mockDb.products.find(p => p.id === id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  const supplier = mockDb.suppliers.find(s => s.id === p.supplier_id);
  res.json({ ...p, supplier_name: supplier?.name || null, stock_status: getStockStatus(p.current_stock, p.min_stock_level) });
}));

// POST /api/products
app.post('/api/products', asyncHandler(async (req, res) => {
  const { name, sku, supplier_id, current_stock = 0, min_stock_level = 10, price } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Product name is required' });
  if (!sku?.trim()) return res.status(400).json({ error: 'SKU is required' });

  if (useMySQL) {
    let validSupplierId = null;
    if (supplier_id) {
      const [sRows] = await dbQuery('SELECT id FROM suppliers WHERE id = ?', [supplier_id]);
      if (sRows.length > 0) validSupplierId = supplier_id;
    }
    const [result] = await dbQuery(
      'INSERT INTO products (name, sku, supplier_id, current_stock, min_stock_level, price) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), sku.trim().toUpperCase(), validSupplierId, Number(current_stock) || 0, Number(min_stock_level) || 10, price ? Number(price) : null]
    );
    const [rows] = await dbQuery(
      'SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?',
      [result.insertId]
    );
    return res.status(201).json({ ...rows[0], stock_status: getStockStatus(rows[0].current_stock, rows[0].min_stock_level) });
  }

  if (mockDb.products.some(p => p.sku === sku.trim().toUpperCase())) {
    return res.status(409).json({ error: `SKU '${sku}' already exists` });
  }
  const newProduct = {
    id: mockDb.nextProductId++,
    name: name.trim(),
    sku: sku.trim().toUpperCase(),
    supplier_id: supplier_id || null,
    current_stock: Number(current_stock),
    min_stock_level: Number(min_stock_level),
    price: price ? Number(price) : null,
    created_at: new Date().toISOString(),
  };
  mockDb.products.push(newProduct);
  const supplier = mockDb.suppliers.find(s => s.id === newProduct.supplier_id);
  res.status(201).json({ ...newProduct, supplier_name: supplier?.name || null, stock_status: getStockStatus(newProduct.current_stock, newProduct.min_stock_level) });
}));

// PUT /api/products/:id
app.put('/api/products/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, sku, supplier_id, min_stock_level, price } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Product name is required' });

  if (useMySQL) {
    let validSupplierId = null;
    if (supplier_id) {
      const [sRows] = await dbQuery('SELECT id FROM suppliers WHERE id = ?', [supplier_id]);
      if (sRows.length > 0) validSupplierId = supplier_id;
    }
    const [result] = await dbQuery(
      'UPDATE products SET name = ?, sku = ?, supplier_id = ?, min_stock_level = ?, price = ? WHERE id = ?',
      [name.trim(), sku?.trim().toUpperCase(), validSupplierId, Number(min_stock_level) || 10, price ? Number(price) : null, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    const [rows] = await dbQuery(
      'SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?',
      [id]
    );
    return res.json({ ...rows[0], stock_status: getStockStatus(rows[0].current_stock, rows[0].min_stock_level) });
  }

  const idx = mockDb.products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  mockDb.products[idx] = { ...mockDb.products[idx], name: name.trim(), sku: sku?.trim().toUpperCase() || mockDb.products[idx].sku, supplier_id: supplier_id || null, min_stock_level: Number(min_stock_level) || 10, price: price ? Number(price) : null };
  const supplier = mockDb.suppliers.find(s => s.id === mockDb.products[idx].supplier_id);
  res.json({ ...mockDb.products[idx], supplier_name: supplier?.name || null, stock_status: getStockStatus(mockDb.products[idx].current_stock, mockDb.products[idx].min_stock_level) });
}));

// DELETE /api/products/:id
app.delete('/api/products/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (useMySQL) {
    const [result] = await dbQuery('DELETE FROM products WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    return res.json({ success: true, message: `Product ${id} deleted` });
  }
  const idx = mockDb.products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  mockDb.products.splice(idx, 1);
  res.json({ success: true, message: `Product ${id} deleted` });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK TRANSACTIONS (IN / OUT)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/transactions
app.get('/api/transactions', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
  if (useMySQL) {
    const [rows] = await dbQuery(`
      SELECT st.*, p.name AS product_name, p.sku AS product_sku
      FROM stock_transactions st
      JOIN products p ON st.product_id = p.id
      ORDER BY st.transaction_date DESC
      LIMIT ?
    `, [limit]);
    return res.json(rows);
  }
  const enriched = mockDb.stock_transactions.map(t => {
    const p = mockDb.products.find(p => p.id === t.product_id);
    return { ...t, product_name: p?.name || 'Unknown', product_sku: p?.sku || '' };
  });
  res.json([...enriched].reverse().slice(0, limit));
}));

// POST /api/transactions/stock-in  — Stock IN
app.post('/api/transactions/stock-in', asyncHandler(async (req, res) => {
  const { product_id, quantity, notes } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id is required' });
  const qty = parseInt(quantity, 10);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'quantity must be a positive integer' });

  if (useMySQL) {
    const conn = await dbPool.getConnection();
    try {
      await conn.beginTransaction();
      const [pRows] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [product_id]);
      if (!pRows.length) { await conn.rollback(); return res.status(404).json({ error: 'Product not found' }); }

      await conn.query(
        'INSERT INTO stock_transactions (product_id, transaction_type, quantity, notes) VALUES (?, ?, ?, ?)',
        [product_id, 'IN', qty, notes || null]
      );
      await conn.query('UPDATE products SET current_stock = current_stock + ? WHERE id = ?', [qty, product_id]);
      await conn.commit();

      const [updated] = await conn.query('SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?', [product_id]);
      conn.release();
      return res.status(201).json({
        success: true,
        message: `Stocked IN ${qty} units of "${pRows[0].name}"`,
        product: { ...updated[0], stock_status: getStockStatus(updated[0].current_stock, updated[0].min_stock_level) },
      });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  }

  const pIdx = mockDb.products.findIndex(p => p.id === parseInt(product_id, 10));
  if (pIdx === -1) return res.status(404).json({ error: 'Product not found' });

  mockDb.products[pIdx].current_stock += qty;
  const txn = {
    id: mockDb.nextTransactionId++,
    product_id: parseInt(product_id, 10),
    transaction_type: 'IN',
    quantity: qty,
    transaction_date: new Date().toISOString(),
    notes: notes || null,
  };
  mockDb.stock_transactions.push(txn);
  const p = mockDb.products[pIdx];
  res.status(201).json({ success: true, message: `Stocked IN ${qty} units of "${p.name}"`, product: { ...p, stock_status: getStockStatus(p.current_stock, p.min_stock_level) } });
}));

// POST /api/transactions/stock-out  — Stock OUT
app.post('/api/transactions/stock-out', asyncHandler(async (req, res) => {
  const { product_id, quantity, notes } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id is required' });
  const qty = parseInt(quantity, 10);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'quantity must be a positive integer' });

  if (useMySQL) {
    const conn = await dbPool.getConnection();
    try {
      await conn.beginTransaction();
      const [pRows] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [product_id]);
      if (!pRows.length) { await conn.rollback(); return res.status(404).json({ error: 'Product not found' }); }
      if (pRows[0].current_stock < qty) {
        await conn.rollback();
        return res.status(409).json({ error: `Insufficient stock. Available: ${pRows[0].current_stock}, Requested: ${qty}` });
      }
      await conn.query(
        'INSERT INTO stock_transactions (product_id, transaction_type, quantity, notes) VALUES (?, ?, ?, ?)',
        [product_id, 'OUT', qty, notes || null]
      );
      await conn.query('UPDATE products SET current_stock = current_stock - ? WHERE id = ?', [qty, product_id]);
      await conn.commit();

      const [updated] = await conn.query('SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?', [product_id]);
      conn.release();
      return res.status(201).json({
        success: true,
        message: `Stocked OUT ${qty} units of "${pRows[0].name}"`,
        product: { ...updated[0], stock_status: getStockStatus(updated[0].current_stock, updated[0].min_stock_level) },
      });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  }

  const pIdx = mockDb.products.findIndex(p => p.id === parseInt(product_id, 10));
  if (pIdx === -1) return res.status(404).json({ error: 'Product not found' });
  if (mockDb.products[pIdx].current_stock < qty) {
    return res.status(409).json({ error: `Insufficient stock. Available: ${mockDb.products[pIdx].current_stock}, Requested: ${qty}` });
  }
  mockDb.products[pIdx].current_stock -= qty;
  const txn = {
    id: mockDb.nextTransactionId++,
    product_id: parseInt(product_id, 10),
    transaction_type: 'OUT',
    quantity: qty,
    transaction_date: new Date().toISOString(),
    notes: notes || null,
  };
  mockDb.stock_transactions.push(txn);
  const p = mockDb.products[pIdx];
  res.status(201).json({ success: true, message: `Stocked OUT ${qty} units of "${p.name}"`, product: { ...p, stock_status: getStockStatus(p.current_stock, p.min_stock_level) } });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS — Dashboard KPI Aggregates
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/analytics', asyncHandler(async (req, res) => {
  let products = [];
  let transactions = [];

  if (useMySQL) {
    const [pRows] = await dbQuery('SELECT * FROM products');
    const [tRows] = await dbQuery('SELECT * FROM stock_transactions');
    products = pRows;
    transactions = tRows;
  } else {
    products = mockDb.products;
    transactions = mockDb.stock_transactions;
  }

  const totalProducts = products.length;
  const totalStockUnits = products.reduce((a, p) => a + (Number(p.current_stock) || 0), 0);
  const totalInventoryValue = products.reduce((a, p) => a + ((Number(p.current_stock) || 0) * (Number(p.price) || 0)), 0);
  const lowStockCount = products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length;
  const outOfStockCount = products.filter(p => p.current_stock <= 0).length;

  const totalStockIn = transactions.filter(t => t.transaction_type === 'IN').reduce((a, t) => a + (Number(t.quantity) || 0), 0);
  const totalStockOut = transactions.filter(t => t.transaction_type === 'OUT').reduce((a, t) => a + (Number(t.quantity) || 0), 0);

  let supplierCount = 0;
  if (useMySQL) {
    const [s] = await dbQuery('SELECT COUNT(*) AS cnt FROM suppliers');
    supplierCount = s[0].cnt;
  } else {
    supplierCount = mockDb.suppliers.length;
  }

  res.json({
    metrics: {
      totalProducts,
      totalStockUnits,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      lowStockCount,
      outOfStockCount,
      activeSuppliers: supplierCount,
    },
    stockMovement: { totalStockIn, totalStockOut },
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// AI PREDICTIONS — Python child process via stdin/stdout
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/predictions', asyncHandler(async (req, res) => {
  const leadTime = Math.max(1, Math.min(parseInt(req.query.leadTime, 10) || 7, 90));

  let products = [];
  let transactions = [];

  if (useMySQL) {
    try {
      const [pRows] = await dbQuery('SELECT * FROM products');
      const [tRows] = await dbQuery('SELECT * FROM stock_transactions');
      products = pRows;
      transactions = tRows;
    } catch (err) {
      products = mockDb.products;
      transactions = mockDb.stock_transactions;
    }
  } else {
    products = mockDb.products;
    transactions = mockDb.stock_transactions;
  }

  const payload = JSON.stringify({ lead_time: leadTime, products, transactions });
  const scriptPath = path.join(__dirname, 'ml_engine', 'predictor.py');
  const pyProcess = spawn('python3', [scriptPath, String(leadTime)]);

  let stdout = '';
  let stderr = '';

  pyProcess.stdin.write(payload);
  pyProcess.stdin.end();
  pyProcess.stdout.on('data', d => { stdout += d.toString(); });
  pyProcess.stderr.on('data', d => { stderr += d.toString(); });

  pyProcess.on('close', (code) => {
    if (code === 0 && stdout.trim()) {
      try {
        return res.json(JSON.parse(stdout));
      } catch (_) {}
    }

    console.warn(`Python predictor exited ${code}. Stderr: ${stderr}. Using built-in baseline.`);
    // Built-in statistical fallback
    const now = new Date();
    const baseline = products.map(p => {
      const outTxns = transactions.filter(t => t.transaction_type === 'OUT' && t.product_id === p.id);
      const totalOut = outTxns.reduce((a, t) => a + (Number(t.quantity) || 0), 0);
      const earliest = outTxns.length ? outTxns.reduce((a, t) => {
        const d = new Date(t.transaction_date);
        return d < a ? d : a;
      }, new Date()) : now;
      const days = Math.max(1, Math.round((now - earliest) / 86400000));
      const avgDaily = outTxns.length >= 2 ? totalOut / days : null;
      const current = Number(p.current_stock);
      const minStock = Number(p.min_stock_level);
      const daysLeft = avgDaily ? current / avgDaily : null;
      const risk = current <= 0 ? 'Critical' : (daysLeft !== null && daysLeft <= leadTime) ? 'Critical' : (current <= minStock) ? 'Warning' : 'Safe';
      return {
        product_id: p.id,
        name: p.name,
        sku: p.sku,
        current_stock: current,
        min_stock_level: minStock,
        avg_daily_demand: avgDaily ? Math.round(avgDaily * 100) / 100 : null,
        safety_stock: minStock,
        reorder_point: avgDaily ? Math.round(avgDaily * leadTime + minStock) : minStock,
        suggested_reorder_qty: avgDaily ? Math.max(0, Math.round(avgDaily * (leadTime + 14) + minStock - current)) : (current <= minStock ? (minStock * 2 - current) : 0),
        days_of_stock_left: daysLeft !== null ? Math.round(daysLeft * 10) / 10 : null,
        stockout_date: daysLeft !== null ? new Date(now.getTime() + daysLeft * 86400000).toISOString().slice(0, 10) : null,
        risk_level: risk,
        confidence_score: outTxns.length >= 3 ? 0.72 : 0.45,
        notes: outTxns.length < 2 ? 'Insufficient transaction history.' : `Based on ${outTxns.length} OUT events over ${days} days.`,
      };
    });
    res.json({ success: true, lead_time_days: leadTime, source: 'baseline_rule_engine', predictions: baseline });
  });
}));

// ─── Frontend Static Build Serving (Production) ──────────────────────────────
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  🚀  SANCHAY AI Backend  ·  Port ${PORT}`);
  console.log(`  📡  Health:       http://localhost:${PORT}/api/health`);
  console.log(`  🛒  Products:     http://localhost:${PORT}/api/products`);
  console.log(`  🏭  Suppliers:    http://localhost:${PORT}/api/suppliers`);
  console.log(`  📊  Transactions: http://localhost:${PORT}/api/transactions`);
  console.log(`  🤖  Predictions:  http://localhost:${PORT}/api/predictions?leadTime=7`);
  console.log(`  🗄️   Mode:        ${useMySQL ? 'MySQL (smart_inventory)' : 'In-Memory Fallback'}`);
  console.log('═══════════════════════════════════════════════════════');
});
