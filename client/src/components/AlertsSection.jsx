import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldAlert,
  Archive,
  ArrowRightCircle,
  Cpu,
  Mail,
  Send,
} from "lucide-react";
import alertService from "../services/alertService";
import notificationService from "../services/notificationService";

export default function AlertsSection() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ACTIVE"); // 'ALL', 'ACTIVE', 'RESOLVED'
  const [emailLoadingId, setEmailLoadingId] = useState(null);
  const [emailFeedback, setEmailFeedback] = useState(null);

  const handleSendAlertEmail = async (alertId) => {
    setEmailLoadingId(alertId);
    setEmailFeedback(null);
    try {
      const res = await notificationService.sendAlertNotification(alertId);
      setEmailFeedback({
        alertId,
        type: "success",
        message: res.message || "Alert email dispatched successfully!",
      });
      setAlerts((prev) =>
        prev.map((a) =>
          a._id === alertId
            ? {
                ...a,
                emailSent: true,
                emailSentAt: new Date().toISOString(),
              }
            : a,
        ),
      );
    } catch (err) {
      setEmailFeedback({
        alertId,
        type: "error",
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to dispatch alert email.",
      });
    } finally {
      setEmailLoadingId(null);
    }
  };

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const data = await alertService.getAlerts(params);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      setError(
        err.response?.data?.message || err.message || "Failed to load alerts",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const activeCount = alerts.filter((a) => a.status === "ACTIVE").length;

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            MEDIUM
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            LOW
          </span>
        );
    }
  };

  const getAlertTypeBadge = (type) => {
    if (type === "STOCKOUT_RISK") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <Clock className="w-3 h-3 mr-1 text-rose-500" />
          Stockout Risk
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />
        Low Stock
      </span>
    );
  };

  const getActionBadge = (action) => {
    switch (action) {
      case "REORDER_NOW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-600 text-white">
            Reorder Now
          </span>
        );
      case "REORDER_SOON":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-500 text-white">
            Reorder Soon
          </span>
        );
      case "PLAN_REORDER":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500 text-white">
            Plan Reorder
          </span>
        );
      case "MONITOR":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-200 text-slate-700">
            Monitor
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-slate-900">
                Persistent Inventory Alerts
              </h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
                Phase 6
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              MongoDB alert tracking with DB-level duplicate prevention and
              automatic resolution.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Status Filter Tabs */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("RESOLVED")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "RESOLVED"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Resolved
            </button>
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Alerts
            </button>
          </div>

          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh alerts"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="p-4 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchAlerts}
              className="text-xs font-semibold text-rose-800 underline ml-3 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {loading && alerts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium text-slate-500">
              Loading inventory alerts...
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-3 rounded-full bg-slate-50 border border-slate-100 text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800 mt-2">
              {statusFilter === "ACTIVE"
                ? "No Active Alerts"
                : statusFilter === "RESOLVED"
                  ? "No Resolved Alerts in History"
                  : "No Inventory Alerts Found"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm">
              {statusFilter === "ACTIVE"
                ? "All products are currently healthy or resolved. When low stock or stockout risks are detected during an audit, alerts appear here."
                : "Alerts resolved during inventory audits or restocks will be archived here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const item = alert.inventoryItemId || {};
              const isResolved = alert.status === "RESOLVED";

              return (
                <div
                  key={alert._id}
                  className={`p-4 rounded-xl border transition-all ${
                    isResolved
                      ? "bg-slate-50/60 border-slate-200 text-slate-600"
                      : "bg-white border-slate-200/90 shadow-xs hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    {/* Item Info & Badges */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">
                          {item.name || "Unknown Item"}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {item.sku || "NO-SKU"}
                        </span>
                        {getAlertTypeBadge(alert.alertType)}
                        {getUrgencyBadge(alert.urgency)}
                        {getActionBadge(alert.recommendedAction)}
                      </div>

                      {/* Reason Description */}
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {alert.reason}
                      </p>
                    </div>

                    {/* Status & Metadata */}
                    <div className="flex flex-wrap md:flex-col md:items-end gap-2 shrink-0 text-xs">
                      <div className="flex items-center space-x-1.5">
                        {isResolved ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            RESOLVED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse mr-1.5" />
                            ACTIVE
                          </span>
                        )}

                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 border border-slate-200">
                          {alert.source === "gemini" ? (
                            <>
                              <Sparkles className="w-3 h-3 mr-1 text-purple-600" />
                              gemini
                            </>
                          ) : (
                            <>
                              <Cpu className="w-3 h-3 mr-1 text-slate-500" />
                              fallback
                            </>
                          )}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                        <span>
                          Created:{" "}
                          {new Date(alert.createdAt).toLocaleDateString()}{" "}
                          {new Date(alert.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isResolved && alert.resolvedAt && (
                          <span className="text-emerald-600 font-medium">
                            • Resolved:{" "}
                            {new Date(alert.resolvedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Phase 7 Email Status & Dispatch Controls */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      {alert.emailSent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Mail className="w-3 h-3 mr-1 text-emerald-600" />
                          Email Dispatched
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Mail className="w-3 h-3 mr-1 text-amber-600" />
                          Pending Email Dispatch
                        </span>
                      )}

                      {alert.emailSentAt && (
                        <span className="text-[11px] text-slate-400">
                          • Dispatched at{" "}
                          {new Date(alert.emailSentAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {emailFeedback?.alertId === alert._id && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            emailFeedback.type === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {emailFeedback.message}
                        </span>
                      )}

                      {!isResolved && (
                        <button
                          onClick={() => handleSendAlertEmail(alert._id)}
                          disabled={emailLoadingId === alert._id}
                          className="inline-flex items-center px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors border border-indigo-200 disabled:opacity-50 cursor-pointer"
                        >
                          {emailLoadingId === alert._id ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin mr-1.5" />
                              Sending Email...
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3 mr-1.5" />
                              {alert.emailSent
                                ? "Resend Alert Email"
                                : "Send Alert Email"}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
