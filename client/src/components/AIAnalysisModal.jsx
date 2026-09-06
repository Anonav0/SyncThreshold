import React from "react";
import {
  X,
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Cpu,
  RefreshCw,
  Box,
} from "lucide-react";

export default function AIAnalysisModal({
  isOpen,
  onClose,
  data,
  loading,
  onRetry,
}) {
  if (!isOpen) return null;

  const inventory = data?.inventory || {};
  const deterministic = data?.deterministicAnalysis || {};
  const ai = data?.aiAnalysis || {};

  const getUrgencyConfig = (urgency) => {
    switch (urgency) {
      case "CRITICAL":
        return {
          bg: "bg-red-50 text-red-700 border-red-200",
          badge: "bg-red-600 text-white",
          icon: AlertTriangle,
          label: "CRITICAL RISK",
        };
      case "HIGH":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          badge: "bg-rose-600 text-white",
          icon: AlertTriangle,
          label: "HIGH RISK",
        };
      case "MEDIUM":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          badge: "bg-amber-500 text-white",
          icon: Clock,
          label: "MEDIUM RISK",
        };
      case "LOW":
      default:
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          badge: "bg-emerald-600 text-white",
          icon: CheckCircle2,
          label: "LOW RISK",
        };
    }
  };

  const urgencyConfig = getUrgencyConfig(ai.urgency);
  const UrgencyIcon = urgencyConfig.icon;

  const isGemini = ai.source === "gemini";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Gemini AI Risk Analysis
              </h3>
              <p className="text-xs text-indigo-200">
                Phase 4 Contextual Reorder Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-9 h-9 animate-spin text-indigo-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">
                Evaluating Inventory Intelligence with Gemini...
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Synthesizing sales velocity, stockout runway, and thresholds
                into a structured recommendation.
              </p>
            </div>
          ) : !data ? (
            <div className="py-10 text-center text-slate-500">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="text-sm">No analysis data available.</p>
            </div>
          ) : (
            <>
              {/* Product Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">
                    {inventory.name}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {inventory.sku}
                    </span>
                    {inventory.category && (
                      <span className="text-xs text-slate-500">
                        • {inventory.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Source Badge */}
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isGemini
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {isGemini ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                        Source: Gemini AI
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3.5 h-3.5 mr-1 text-slate-600" />
                        Source: Deterministic Fallback
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* AI Verdict Box */}
              <div
                className={`p-5 rounded-2xl border ${urgencyConfig.bg} space-y-4`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UrgencyIcon className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Assessed Urgency: {ai.urgency}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${urgencyConfig.badge}`}
                  >
                    {ai.recommendedAction?.replace("_", " ")}
                  </span>
                </div>

                <div className="bg-white/80 rounded-xl p-4 border border-white/60 shadow-xs">
                  <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
                    AI Business Reasoning
                  </p>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">
                    {ai.reason}
                  </p>
                </div>
              </div>

              {/* Underlying Deterministic Metrics */}
              <div>
                <h5 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                  Deterministic Baseline Metrics (Phase 3 Input)
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 font-medium">
                      Current Stock
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">
                      {deterministic.currentStock}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 font-medium">Threshold</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">
                      {deterministic.reorderThreshold}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 font-medium">
                      Sales Velocity
                    </div>
                    <div className="text-base font-bold text-indigo-700 mt-0.5">
                      {deterministic.salesVelocity || 0} /day
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 font-medium">
                      Stockout Runway
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">
                      {deterministic.daysUntilStockout !== null &&
                      deterministic.daysUntilStockout !== undefined
                        ? `${deterministic.daysUntilStockout}d`
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={loading}
                className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Re-analyze
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
