# 🚀 SANCHAY AI — Smart Inventory Management System

> **Intelligent Inventory Optimization & Demand Forecasting with Machine Learning**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://rikhil-33.github.io/sanchay-ai/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20TailwindCSS-61DAFB?style=for-the-badge&logo=react)](https://rikhil-33.github.io/sanchay-ai/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%20%7C%20MySQL-339933?style=for-the-badge&logo=node.js)](backend/)
[![ML Engine](https://img.shields.io/badge/ML%20Engine-Python%20%7C%20Scikit--Learn-3776AB?style=for-the-badge&logo=python)](backend/ml_engine/predictor.py)

---

## 🌐 Live Application Link

You can access and use the live application at:
👉 **[https://rikhil-33.github.io/sanchay-ai/](https://rikhil-33.github.io/sanchay-ai/)**

*Works forever on desktop, tablet, and mobile with zero server timeouts, client-side persistence, and browser-embedded ML forecasting algorithms.*

---

## 🌟 Key Features

1. **AI Demand Forecasting & Stock-Out Prevention**:
   - Calculates **Average Daily Demand** from consumption trends.
   - Computes **Safety Stock** using a 95% service level ($Z = 1.645$).
   - Dynamic **Reorder Point (ROP)** and **Suggested Order Quantities**.
   - Time-to-stockout predictions with calendar forecasting and confidence intervals.
   - Interactive **Lead Time Slider** (1 to 90 days) to simulate supplier delays.

2. **Full Inventory Management (CRUD)**:
   - Real-time stock adjustment via **Stock In** (replenishment) and **Stock Out** (sales/fulfillment).
   - Product catalog with SKU, Category, Minimum Stock Levels, and Unit Pricing.
   - Supplier directory linked to products.

3. **Executive Analytics Dashboard**:
   - Total Active Products & Units in Stock.
   - Total Inventory Valuation (₹).
   - Real-time Critical & Low-Stock alerts.
   - Inflow vs. Outflow stock velocity metrics.

4. **Fault-Tolerant Hybrid Architecture**:
   - **Local / Server Mode**: Express REST API + MySQL + Python child process for machine learning.
   - **Standalone / CDN Mode**: Runs seamlessly in the browser using client-side storage and mathematical forecasting routines.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express.js REST API |
| **Machine Learning** | Python 3, NumPy, Pandas, Scikit-learn (`LinearRegression`) |
| **Database** | MySQL (with automatic In-Memory / LocalStorage fallback) |
| **Deployment** | GitHub Pages & GitHub Actions (Zero-cost, permanent uptime) |

---

## 💻 Local Setup & Development

### 1. Clone repository
```bash
git clone https://github.com/rikhil-33/sanchay-ai.git
cd sanchay-ai
```

### 2. Install dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Run Development Servers
```bash
# Terminal 1 - Backend API (Port 5000)
cd backend && npm run dev

# Terminal 2 - Frontend (Port 5173)
cd frontend && npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.
