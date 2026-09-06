import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Sparkles,
  Zap,
} from "lucide-react";
import automationService from "../services/automationService";

export default function AutomationStatusCard({ onRunComplete }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await automationService.getStatus();
      setStatus(data);
      if (data?.lastRunSummary) {
        setSummary(data.lastRunSummary);
      }
    } catch (err) {
      console.error("Failed to fetch automation status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Refresh status periodically
    const interval = setInterval(fetchStatus, 20000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleRunCheck = async () => {
    try {
      setTriggering(true);
      setError(null);
      const result = await automationService.triggerCheck();
      setSummary(result);
      await fetchStatus();
      if (onRunComplete) {
        onRunComplete(result);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to execute inventory automation check.",
      );
    } finally {
      setTriggering(false);
    }
  };

  const formatSchedule = (cron) => {
    if (!cron) return "Every 15 minutes";
    if (cron === "*/15 * * * *") return "Every 15 minutes";
    if (cron === "0 * * * *") return "Every hour";
    if (cron === "0 0 * * *") return "Daily at midnight";
    return cron;
  };

  const formatTime = (isoString) => {
    if (!isoString) return "Never";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getResultBadge = (resStatus) => {
    switch (resStatus) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            SUCCESS
          </span>
        );
      case "PARTIAL_SUCCESS":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
            PARTIAL SUCCESS
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1 text-rose-600" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="text-xs text-slate-400 italic font-medium">
            None
          </span>
        );
    }
  };

  const isRunning = triggering || status?.running;
  const isEnabled = status?.enabled !== false;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Automated Inventory Monitoring
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isEnabled
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    isEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                ></span>
                {isEnabled ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              node-cron background job periodically audits inventory, velocity &
              Gemini AI risk.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleRunCheck}
            disabled={isRunning}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-purple-100 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />
                Running Analysis...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-2 fill-current" />
                Run Inventory Check
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
          <div className="text-slate-500 font-medium">Cron Schedule</div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {formatSchedule(status?.schedule)}
          </div>
          <div className="text-2xs font-mono text-slate-400 mt-0.5">
            {status?.schedule || "*/15 * * * *"}
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
          <div className="text-slate-500 font-medium">Currently Running</div>
          <div className="text-sm font-bold text-slate-900 mt-1 flex items-center">
            {isRunning ? (
              <span className="text-indigo-600 flex items-center">
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Yes
              </span>
            ) : (
              <span className="text-slate-600">No (Idle)</span>
            )}
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">
            Single-process lock
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
          <div className="text-slate-500 font-medium">Last Run Time</div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {formatTime(status?.lastRunAt)}
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">
            {status?.lastRunAt
              ? new Date(status.lastRunAt).toLocaleDateString()
              : "No runs yet"}
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
          <div className="text-slate-500 font-medium">Last Result</div>
          <div className="mt-1">{getResultBadge(status?.lastRunStatus)}</div>
          <div className="text-2xs text-slate-400 mt-0.5">
            {status?.aiEnabled ? "AI Assisted" : "Deterministic Only"}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-600 font-bold hover:text-rose-800 text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Execution Summary Box */}
      {summary && (
        <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl p-4 border border-indigo-100/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center">
              <Zap className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Latest Automation Run Summary
            </span>
            <span className="text-2xs font-mono text-slate-500">
              Completed at {formatTime(summary.completedAt)}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-2xs">Items Checked</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {summary.itemsChecked ?? 0}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-2xs">Candidates</div>
              <div className="text-base font-bold text-amber-600 mt-0.5">
                {summary.candidatesFound ?? 0}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-2xs">AI Analyses</div>
              <div className="text-base font-bold text-indigo-600 mt-0.5">
                {summary.aiAnalyses ?? 0}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-2xs">Gemini AI</div>
              <div className="text-base font-bold text-purple-600 mt-0.5">
                {summary.geminiSuccesses ?? 0}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-2xs">Fallbacks</div>
              <div className="text-base font-bold text-slate-700 mt-0.5">
                {summary.fallbackAnalyses ?? 0}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-2xs">Alerts Created</div>
              <div className="text-base font-bold text-rose-600 mt-0.5">
                {summary.alertsCreated ?? 0}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-2xs">Alerts Reused</div>
              <div className="text-base font-bold text-amber-600 mt-0.5">
                {summary.alertsReused ?? 0}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-2xs">Alerts Resolved</div>
              <div className="text-base font-bold text-emerald-600 mt-0.5">
                {summary.alertsResolved ?? 0}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-2xs">Emails Sent</div>
              <div className="text-base font-bold text-indigo-600 mt-0.5">
                {summary.notificationsSent ?? 0}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-2xs">Email Failures</div>
              <div
                className={`text-base font-bold mt-0.5 ${(summary.notificationFailures ?? 0) > 0 ? "text-amber-600" : "text-slate-700"}`}
              >
                {summary.notificationFailures ?? 0}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-2xs">Errors</div>
              <div
                className={`text-base font-bold mt-0.5 ${summary.errors > 0 ? "text-rose-600" : "text-emerald-600"}`}
              >
                {summary.errors ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
