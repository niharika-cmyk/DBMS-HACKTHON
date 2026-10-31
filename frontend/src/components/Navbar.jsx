import React from 'react';
import { Package2, BarChart2, Layers, Users, History, BrainCircuit, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',   icon: BarChart2 },
  { id: 'products',    label: 'Products',     icon: Layers },
  { id: 'suppliers',   label: 'Suppliers',    icon: Users },
  { id: 'ledger',      label: 'Ledger',       icon: History },
  { id: 'predictions', label: 'AI Insights',  icon: BrainCircuit },
];

export default function Navbar({ activeTab, setActiveTab, onOpenStockIn, onOpenStockOut, backendStatus }) {
  const online = backendStatus?.status === 'healthy';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14 gap-6">

        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Package2 size={15} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">Sanchay</span>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${online ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-indigo-700 bg-indigo-50 border border-indigo-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`} />
            {online ? 'Live API' : 'AI Engine Active'}
          </span>
          <button onClick={onOpenStockIn} className="btn-primary text-xs py-1.5 px-3">
            <ArrowDownToLine size={13} /> Stock In
          </button>
          <button onClick={onOpenStockOut} className="btn-secondary text-xs py-1.5 px-3">
            <ArrowUpFromLine size={13} /> Stock Out
          </button>
        </div>

      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden overflow-x-auto border-t border-gray-100 px-4 py-1 gap-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
