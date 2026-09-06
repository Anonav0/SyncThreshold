import React, { useState, useEffect } from "react";
import {
  Layers,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Activity,
} from "lucide-react";
import inventoryService from "../services/inventoryService";

export default function Navbar({ activeTab, setActiveTab }) {
  const [isBackendHealthy, setIsBackendHealthy] = useState(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await inventoryService.checkHealth();
        setIsBackendHealthy(res.success === true);
      } catch {
        setIsBackendHealthy(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                SyncThreshold
              </span>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                Phase 6 • Alert Persistence
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "inventory"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Package className="w-4 h-4 mr-2" />
              Inventory
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "sales"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Sales
            </button>
          </nav>

          {/* Server Status Indicator */}
          <div className="flex items-center text-xs text-slate-500 space-x-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>API Status:</span>
            {isBackendHealthy === null ? (
              <span className="flex items-center text-slate-400 font-medium">
                Checking...
              </span>
            ) : isBackendHealthy ? (
              <span className="flex items-center text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                Connected
              </span>
            ) : (
              <span className="flex items-center text-rose-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>
                Disconnected
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
