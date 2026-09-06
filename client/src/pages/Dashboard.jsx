import React from "react";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Database,
  Server,
  ShoppingCart,
  DollarSign,
  TrendingUp,
} from "lucide-react";

export default function Dashboard({
  items = [],
  sales = [],
  onNavigateToInventory,
  onNavigateToSales,
}) {
  const totalItems = items.length;
  const lowStockCount = items.filter(
    (item) => item.currentStock <= item.reorderThreshold,
  ).length;
  const healthyCount = items.filter(
    (item) => item.currentStock > item.reorderThreshold,
  ).length;
  const totalValuation = items.reduce(
    (sum, item) => sum + item.currentStock * (item.unitPrice || 0),
    0,
  );
  const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalUnitsSold = sales.reduce(
    (sum, s) => sum + (s.quantitySold || 0),
    0,
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 mb-4">
            Phase 2 Active • Sales System & Inventory Integration
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            AI Inventory Automation System
          </h1>
          <p className="mt-3 text-indigo-100 text-sm sm:text-base leading-relaxed">
            Record sales with automatic stock deduction, maintain transaction
            consistency, and track complete sales history in MongoDB Atlas.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={onNavigateToInventory}
              className="inline-flex items-center px-4 py-2.5 bg-white text-indigo-700 font-semibold text-sm rounded-xl shadow hover:bg-indigo-50 transition-colors"
            >
              Manage Inventory
              <ArrowRight className="ml-2 w-4 h-4" />
            </button>
            <button
              onClick={onNavigateToSales}
              className="inline-flex items-center px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow transition-colors"
            >
              <ShoppingCart className="mr-2 w-4 h-4" />
              View Sales History
            </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-8 translate-y-8">
          <Package className="w-80 h-80" />
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Total SKU Items
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{totalItems}</p>
          <span className="text-xs text-slate-500 mt-1 inline-block">
            Registered catalog items
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Total Sales Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            ₹{totalRevenue.toLocaleString()}
          </p>
          <span className="text-xs text-slate-500 mt-1 inline-block">
            {totalUnitsSold} units sold across {sales.length} transactions
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Needs Reorder
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-2">
            {lowStockCount}
          </p>
          <span className="text-xs text-slate-500 mt-1 inline-block">
            At or below reorder threshold
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Current Stock Value
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            ₹{totalValuation.toLocaleString()}
          </p>
          <span className="text-xs text-slate-500 mt-1 inline-block">
            Calculated from unit prices
          </span>
        </div>
      </div>

      {/* Architecture & Phase 2 Integration Details */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          Phase 2 Architecture & Integration Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Atomic Sales Updates
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Every sale atomically decrements stock with concurrency
                protection, preventing negative inventory.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Sales History Store
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                MongoDB Sale model captures timestamp, unit price, quantity, and
                calculates total amount.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Phase 3 Velocity Ready
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Sales logs are indexed and ready for velocity calculations and
                Gemini reorder analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
