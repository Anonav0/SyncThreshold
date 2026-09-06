import React, { useState } from "react";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  Cpu,
  AlertCircle,
} from "lucide-react";
import InventoryIntelligenceTable from "../components/InventoryIntelligenceTable";
import AutomationStatusCard from "../components/AutomationStatusCard";
import AlertsSection from "../components/AlertsSection";
import NotificationSettingsCard from "../components/NotificationSettingsCard";

export default function Dashboard({
  items = [],
  sales = [],
  error = null,
  onNavigateToInventory,
  onNavigateToSales,
}) {
  const [alertRefreshKey, setAlertRefreshKey] = useState(0);
  const safeItems = Array.isArray(items) ? items : [];
  const safeSales = Array.isArray(sales) ? sales : [];

  const totalItems = safeItems.length;
  const lowStockCount = safeItems.filter(
    (item) => item && (item.currentStock ?? 0) <= (item.reorderThreshold ?? 0),
  ).length;
  const healthyCount = safeItems.filter(
    (item) => item && (item.currentStock ?? 0) > (item.reorderThreshold ?? 0),
  ).length;
  const totalValuation = safeItems.reduce(
    (sum, item) => sum + (item?.currentStock || 0) * (item?.unitPrice || 0),
    0,
  );
  const totalRevenue = safeSales.reduce(
    (sum, s) => sum + (s?.totalAmount || 0),
    0,
  );
  const totalUnitsSold = safeSales.reduce(
    (sum, s) => sum + (s?.quantitySold || 0),
    0,
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Backend Disconnection Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold">Backend Server Disconnected</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
          <span className="text-xs font-mono bg-rose-100 px-2.5 py-1 rounded-md text-rose-700">
            npm run dev:server
          </span>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/30 text-purple-100 border border-purple-400/30 mb-4">
            Phase 7 Active • Email Notifications & Alert Persistence
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            AI Inventory Automation System
          </h1>
          <p className="mt-3 text-indigo-100 text-sm sm:text-base leading-relaxed">
            Autonomous background inventory auditing with node-cron, real-time
            deterministic sales velocity projections, contextual Google Gemini
            AI reorder recommendations, persistent MongoDB alerts, and automated
            SMTP email notifications.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={onNavigateToInventory}
              className="inline-flex items-center px-4 py-2.5 bg-white text-indigo-700 font-semibold text-sm rounded-xl shadow hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              Manage Inventory
              <ArrowRight className="ml-2 w-4 h-4" />
            </button>
            <button
              onClick={onNavigateToSales}
              className="inline-flex items-center px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow transition-colors cursor-pointer"
            >
              <ShoppingCart className="mr-2 w-4 h-4" />
              Record Sale
            </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-8 translate-y-8">
          <Package className="w-80 h-80" />
        </div>
      </div>

      {/* Phase 5 Automated Background Monitoring Status Card */}
      <AutomationStatusCard
        onRunComplete={() => setAlertRefreshKey((k) => k + 1)}
      />

      {/* Phase 7 Email Notifications Control Card */}
      <NotificationSettingsCard
        onPendingDispatched={() => setAlertRefreshKey((k) => k + 1)}
      />

      {/* Phase 6 Persistent Inventory Alerts Section */}
      <AlertsSection key={alertRefreshKey} />

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
            {totalUnitsSold} units sold across {safeSales.length} transactions
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
            Below reorder threshold
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

      {/* Phase 3 Inventory Intelligence & Sales Velocity Table */}
      <InventoryIntelligenceTable onRecordSale={onNavigateToSales} />

      {/* Architecture & Phase 3 Integration Details */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          Phase 3 Architecture & Intelligence Foundation
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Sales Velocity Engine
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculates live units sold per day across configurable analysis
                windows (7d, 14d, 30d).
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Stockout Forecasting
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Estimates exact days until stockout, proactively flagging
                products before they run out.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Clean Input for Gemini
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Produces structured objective data ready for Gemini AI reasoning
                and reorder drafts in Phase 4.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
