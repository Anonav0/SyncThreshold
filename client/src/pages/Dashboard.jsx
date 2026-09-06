import React from "react";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Database,
  Server,
} from "lucide-react";

export default function Dashboard({ items, onNavigateToInventory }) {
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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-100 border border-indigo-400/30 mb-4">
            Phase 1 Active • Foundation & Inventory Backend
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            AI Inventory Automation System
          </h1>
          <p className="mt-3 text-indigo-100 text-sm sm:text-base leading-relaxed">
            The foundation is running on Express.js and MongoDB Mongoose.
            Monitor real-time stock levels, record product thresholds, and
            prepare for upcoming AI reorder workflows.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={onNavigateToInventory}
              className="inline-flex items-center px-4 py-2.5 bg-white text-indigo-700 font-semibold text-sm rounded-xl shadow hover:bg-indigo-50 transition-colors"
            >
              Manage Inventory
              <ArrowRight className="ml-2 w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-8 translate-y-8">
          <Package className="w-80 h-80" />
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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
              Healthy Stock
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {healthyCount}
          </p>
          <span className="text-xs text-slate-500 mt-1 inline-block">
            Stock above threshold
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Needs Attention
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
              Total Stock Value
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

      {/* Architecture & Roadmap Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          Phase 1 Architecture Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Express.js API
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                RESTful endpoints with centralized error handling and clean
                service decoupling.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                MongoDB Atlas
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Mongoose ODM schema with timestamps, stock thresholds, and
                validation.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Future Gemini Ready
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Prepared architectural service stub ready for Phase 2
                automation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
