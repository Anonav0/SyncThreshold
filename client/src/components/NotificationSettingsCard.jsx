import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Info,
} from "lucide-react";
import notificationService from "../services/notificationService";

export default function NotificationSettingsCard({ onPendingDispatched }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [dispatchingPending, setDispatchingPending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  const fetchStatus = useCallback(async () => {
    try {
      const data = await notificationService.getStatus();
      setStatus(data);
    } catch (err) {
      console.error("Failed to fetch notification status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    setFeedback(null);
    try {
      const res = await notificationService.sendTestNotification();
      setFeedback({
        type: "success",
        message:
          res.message || "Test email sent successfully! Check your inbox.",
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to send test email. Please check your server SMTP settings.";
      setFeedback({
        type: "error",
        message: msg,
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleDispatchPending = async () => {
    setDispatchingPending(true);
    setFeedback(null);
    try {
      const res = await notificationService.dispatchPendingAlerts();
      setFeedback({
        type: "success",
        message:
          res.message ||
          `Dispatched ${res.dispatchedCount || 0} alert email(s) to ${
            res.recipient || "configured recipient"
          }.`,
      });
      if (onPendingDispatched) {
        onPendingDispatched();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to dispatch pending alert emails.";
      setFeedback({
        type: "error",
        message: msg,
      });
    } finally {
      setDispatchingPending(false);
    }
  };

  const isEnabled = status?.emailEnabled !== false;
  const isConfigured = status?.emailConfigured === true;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Email Notifications
              </h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
                Phase 7
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated SMTP notifications dispatched when newly created active
              alerts are detected.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDispatchPending}
            disabled={dispatchingPending || loading}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {dispatchingPending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />
                Dispatching...
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                Dispatch Pending Alerts
              </>
            )}
          </button>

          <button
            onClick={handleSendTestEmail}
            disabled={sendingTest || loading}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-100 transition-all disabled:opacity-50 cursor-pointer"
          >
            {sendingTest ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />
                Sending Test Email...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 mr-2" />
                Test Email Notification
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-slate-500 font-medium">
              Notification Provider
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              SMTP (Nodemailer)
            </div>
            <div className="text-2xs text-slate-400 mt-0.5">
              Isolated service architecture
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              isEnabled
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                isEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            {isEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-slate-500 font-medium">SMTP Credentials</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {isConfigured
                ? "Configured & Active"
                : "Missing Environment Setup"}
            </div>
            <div className="text-2xs text-slate-400 mt-0.5">
              Kept securely on the server
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              isConfigured
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {isConfigured ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Configured
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Not Configured
              </>
            )}
          </span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:opacity-75 px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Helpful Footnote */}
      <div className="flex items-start space-x-2 text-2xs text-slate-500 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
        <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <span>
          <strong>Duplicate Prevention Rule:</strong> Only newly detected risks
          that create a new active alert will trigger an email notification.
          Reused active alerts from repeated audit cycles will never dispatch
          duplicate emails.
        </span>
      </div>
    </div>
  );
}
