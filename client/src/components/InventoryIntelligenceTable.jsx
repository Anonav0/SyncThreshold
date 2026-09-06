import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import inventoryService from "../services/inventoryService";
import AIAnalysisModal from "./AIAnalysisModal";

export default function InventoryIntelligenceTable({ onRecordSale }) {
  const [analysisData, setAnalysisData] = useState([]);
  const [daysWindow, setDaysWindow] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // AI Modal and Action states
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalData, setAiModalData] = useState(null);
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [aiItemCache, setAiItemCache] = useState({});

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryService.getAnalysis(daysWindow);
      setAnalysisData(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.message || "Failed to fetch inventory intelligence analysis.",
      );
      setAnalysisData([]);
    } finally {
      setLoading(false);
    }
  }, [daysWindow]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const safeData = Array.isArray(analysisData) ? analysisData : [];

  // Counts by status
  const counts = {
    total: safeData.length,
    healthy: safeData.filter((i) => i && i.status === "HEALTHY").length,
    stockoutRisk: safeData.filter((i) => i && i.status === "STOCKOUT_RISK")
      .length,
    lowStock: safeData.filter((i) => i && i.status === "LOW_STOCK").length,
  };

  const candidatesCount = counts.stockoutRisk + counts.lowStock;

  // Filter items safely
  const filteredData = safeData.filter((item) => {
    if (!item) return false;
    const name = item.name || "";
    const sku = item.sku || "";
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "ALL" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAnalyzeItem = async (itemId) => {
    try {
      setAiLoadingId(itemId);
      setAiModalOpen(true);
      setAiModalData(null);
      const result = await inventoryService.getAiAnalysis(itemId, daysWindow);
      setAiModalData(result);
      if (itemId) {
        setAiItemCache((prev) => ({ ...prev, [itemId]: result.aiAnalysis }));
      }
    } catch (err) {
      setAiModalData({
        inventory: { name: "Analysis Failed" },
        aiAnalysis: {
          urgency: "LOW",
          recommendedAction: "MONITOR",
          reason:
            err.message || "Failed to communicate with AI analysis service.",
          source: "fallback",
        },
      });
    } finally {
      setAiLoadingId(null);
    }
  };

  const handleBatchAnalyze = async () => {
    try {
      setAiLoadingId("batch");
      const results = await inventoryService.getBatchAiAnalysis(daysWindow);
      if (results && results.length > 0) {
        // Update local cache for all candidates
        const newCache = { ...aiItemCache };
        results.forEach((r) => {
          if (r?.inventory?.id) {
            newCache[r.inventory.id] = r.aiAnalysis;
          }
        });
        setAiItemCache(newCache);

        // Open modal displaying the highest risk candidate
        setAiModalData(results[0]);
        setAiModalOpen(true);
      } else {
        alert(
          "All catalog items are currently healthy. No items require AI reorder intervention.",
        );
      }
    } catch (err) {
      alert(`Batch AI Analysis failed: ${err.message}`);
    } finally {
      setAiLoadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "LOW_STOCK":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
            LOW STOCK
          </span>
        );
      case "STOCKOUT_RISK":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
            STOCKOUT RISK
          </span>
        );
      case "HEALTHY":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            HEALTHY
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Intelligence Header */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Inventory Intelligence & Gemini AI
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Deterministic stockout projections paired with contextual Google
                Gemini AI reasoning.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Batch AI, Days Window & Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          {candidatesCount > 0 && (
            <button
              onClick={handleBatchAnalyze}
              disabled={aiLoadingId !== null}
              className="inline-flex items-center px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              title="Evaluate all at-risk products with Gemini AI"
            >
              {aiLoadingId === "batch" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-200" />
              )}
              Analyze Candidates ({candidatesCount})
            </button>
          )}

          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
            <span className="px-2 text-slate-400">Period:</span>
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setDaysWindow(days)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  daysWindow === days
                    ? "bg-white text-indigo-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="p-2 text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            title="Recalculate Intelligence"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter / Status Tabs */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2 overflow-x-auto text-xs">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filterStatus === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Items ({counts.total})
          </button>
          <button
            onClick={() => setFilterStatus("LOW_STOCK")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filterStatus === "LOW_STOCK"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            Low Stock ({counts.lowStock})
          </button>
          <button
            onClick={() => setFilterStatus("STOCKOUT_RISK")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filterStatus === "STOCKOUT_RISK"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Stockout Risk ({counts.stockoutRisk})
          </button>
          <button
            onClick={() => setFilterStatus("HEALTHY")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filterStatus === "HEALTHY"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Healthy ({counts.healthy})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search product or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading && safeData.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-sm font-medium">
              Calculating sales velocity and stockout projections...
            </p>
          </div>
        ) : error && safeData.length === 0 ? (
          <div className="py-12 text-center text-rose-600 px-4">
            <AlertTriangle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
            <p className="text-sm font-semibold">{error}</p>
            <p className="text-xs text-slate-400 mt-1">
              Make sure the backend API server is running on port 5000.
            </p>
            <button
              onClick={fetchAnalysis}
              className="mt-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              Retry Analysis
            </button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p className="text-sm">No items match the selected filter.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Product & SKU</th>
                <th className="px-6 py-3.5">Current Stock</th>
                <th className="px-6 py-3.5">Reorder Threshold</th>
                <th className="px-6 py-3.5">{daysWindow}-Day Sales</th>
                <th className="px-6 py-3.5">Sales Velocity</th>
                <th className="px-6 py-3.5">Days Until Stockout</th>
                <th className="px-6 py-3.5">Deterministic Status</th>
                <th className="px-6 py-3.5 text-right">AI Risk Analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-normal">
              {filteredData.map((item) => {
                const isWarning = item.status === "STOCKOUT_RISK";
                const isDanger = item.status === "LOW_STOCK";
                const isAnalyzing = aiLoadingId === item.inventoryItemId;
                const cachedAi = aiItemCache[item.inventoryItemId];

                return (
                  <tr
                    key={item.inventoryItemId || item.sku}
                    className={`hover:bg-slate-50/75 transition-colors ${
                      isDanger
                        ? "bg-rose-50/20"
                        : isWarning
                          ? "bg-amber-50/20"
                          : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {item.name}
                      </div>
                      <div className="text-xs font-mono text-indigo-600">
                        {item.sku}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-bold ${isDanger ? "text-rose-600" : "text-slate-900"}`}
                      >
                        {item.currentStock}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">units</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {item.reorderThreshold} units
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {item.totalUnitsSold ?? 0} sold
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-indigo-700">
                        {item.salesVelocity ?? 0}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">/ day</span>
                    </td>
                    <td className="px-6 py-4">
                      {item.daysUntilStockout !== null &&
                      item.daysUntilStockout !== undefined ? (
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`font-mono font-bold ${
                              item.daysUntilStockout <= 7
                                ? "text-rose-600"
                                : item.daysUntilStockout <= 14
                                  ? "text-amber-600"
                                  : "text-emerald-700"
                            }`}
                          >
                            {item.daysUntilStockout} days
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          N/A (0 sales)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 text-right">
                      {cachedAi ? (
                        <button
                          onClick={() =>
                            handleAnalyzeItem(item.inventoryItemId)
                          }
                          disabled={isAnalyzing}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                          title="View or re-run AI recommendation"
                        >
                          <span className="font-bold mr-1">
                            {cachedAi.urgency}:
                          </span>
                          <span className="text-xs">
                            {cachedAi.recommendedAction?.replace("_", " ")}
                          </span>
                          <ArrowUpRight className="w-3 h-3 ml-1 text-purple-500" />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleAnalyzeItem(item.inventoryItemId)
                          }
                          disabled={isAnalyzing}
                          className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                            isDanger || isWarning
                              ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-indigo-100"
                              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                          } disabled:opacity-50`}
                          title="Trigger Google Gemini AI Risk Analysis"
                        >
                          {isAnalyzing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Sparkles
                              className={`w-3.5 h-3.5 mr-1.5 ${isDanger || isWarning ? "text-purple-200" : "text-purple-600"}`}
                            />
                          )}
                          Analyze with Gemini
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* AI Analysis Modal */}
      <AIAnalysisModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        data={aiModalData}
        loading={aiLoadingId !== null && !aiModalData}
        onRetry={
          aiModalData?.inventory?.id
            ? () => handleAnalyzeItem(aiModalData.inventory.id)
            : null
        }
      />
    </div>
  );
}
