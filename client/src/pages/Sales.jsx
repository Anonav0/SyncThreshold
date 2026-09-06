import React, { useState } from "react";
import {
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Package,
} from "lucide-react";
import RecordSaleModal from "../components/RecordSaleModal";

export default function Sales({
  sales = [],
  items = [],
  loading = false,
  error = null,
  onRefresh,
  onSaleRecorded,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(null);

  const showNotification = (msg, isError = false) => {
    setBannerMessage({ text: msg, isError });
    setTimeout(() => {
      setBannerMessage(null);
    }, 4000);
  };

  // Metrics
  const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalUnitsSold = sales.reduce(
    (sum, s) => sum + (s.quantitySold || 0),
    0,
  );
  const totalSalesCount = sales.length;

  // Search filter
  const filteredSales = sales.filter((sale) => {
    const item = sale.inventoryItemId;
    const name = item?.name || "";
    const sku = item?.sku || "";
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Toast Notification */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between shadow-sm animate-in fade-in duration-150 ${
            bannerMessage.isError
              ? "bg-rose-50 text-rose-800 border border-rose-200"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {bannerMessage.isError ? (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            )}
            <span className="font-medium">{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sales Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Log product sales with automatic stock deduction and track sales
            history.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Sales"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Sale
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Total Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            ₹{totalRevenue.toLocaleString()}
          </p>
          <span className="text-xs text-slate-500 mt-1 inline-block">
            From all recorded sales
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Units Sold
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {totalUnitsSold.toLocaleString()}
          </p>
          <span className="text-xs text-slate-500 mt-1 inline-block">
            Total inventory items sold
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Transactions
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {totalSalesCount}
          </p>
          <span className="text-xs text-slate-500 mt-1 inline-block">
            Completed sales entries
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search sales by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Sales History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && sales.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-sm font-medium">Loading sales records...</p>
          </div>
        ) : error && sales.length === 0 ? (
          <div className="py-16 text-center text-rose-500 px-4">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-600 mb-2" />
            <p className="text-base font-semibold">Failed to load sales</p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="py-16 text-center text-slate-500 px-4">
            <ShoppingCart className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <h4 className="text-base font-semibold text-slate-700">
              No sales records found
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {sales.length === 0
                ? "Record your first sale to start tracking sales history."
                : "No sales match your search query."}
            </p>
            {sales.length === 0 && (
              <button
                onClick={() => setIsRecordModalOpen(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Record First Sale
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">SKU</th>
                  <th className="px-6 py-3.5">Quantity Sold</th>
                  <th className="px-6 py-3.5">Unit Price</th>
                  <th className="px-6 py-3.5">Total Amount</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {filteredSales.map((sale) => {
                  const item = sale.inventoryItemId;
                  const productName = item?.name || "Deleted Product";
                  const sku = item?.sku || "N/A";
                  const dateStr = sale.soldAt
                    ? new Date(sale.soldAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "N/A";

                  return (
                    <tr
                      key={sale._id}
                      className="hover:bg-slate-50/75 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {productName}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-indigo-600 font-semibold">
                        {sku}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {sale.quantitySold} units
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        ₹{sale.unitPrice}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-700">
                        ₹{sale.totalAmount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Sale Modal */}
      <RecordSaleModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        items={items}
        onSuccess={(msg, result) => {
          showNotification(msg);
          if (onSaleRecorded) onSaleRecorded(result);
        }}
      />
    </div>
  );
}
