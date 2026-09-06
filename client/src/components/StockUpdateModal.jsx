import React, { useState, useEffect } from "react";
import { X, RefreshCw, AlertCircle } from "lucide-react";
import inventoryService from "../services/inventoryService";

export default function StockUpdateModal({ item, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    currentStock: "",
    reorderThreshold: "",
    averageDailySales: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (item) {
      setFormData({
        currentStock: item.currentStock ?? "",
        reorderThreshold: item.reorderThreshold ?? "",
        averageDailySales: item.averageDailySales ?? "",
      });
      setError(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        currentStock: Number(formData.currentStock),
        reorderThreshold: Number(formData.reorderThreshold),
        averageDailySales: Number(formData.averageDailySales || 0),
        lastRestockedAt: new Date(),
      };

      if (
        isNaN(payload.currentStock) ||
        isNaN(payload.reorderThreshold) ||
        isNaN(payload.averageDailySales)
      ) {
        throw new Error("Please enter valid numbers.");
      }

      if (
        payload.currentStock < 0 ||
        payload.reorderThreshold < 0 ||
        payload.averageDailySales < 0
      ) {
        throw new Error("Values cannot be negative.");
      }

      await inventoryService.update(item._id, payload);
      onSuccess(`Updated stock values for "${item.name}"`);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Update Stock Levels
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {item.name}{" "}
              <span className="font-mono text-indigo-600 font-semibold">
                ({item.sku})
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Current Stock Quantity *
            </label>
            <input
              type="number"
              name="currentStock"
              required
              min="0"
              value={formData.currentStock}
              onChange={handleChange}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reorder Threshold *
            </label>
            <input
              type="number"
              name="reorderThreshold"
              required
              min="0"
              value={formData.reorderThreshold}
              onChange={handleChange}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Average Daily Sales
            </label>
            <input
              type="number"
              name="averageDailySales"
              min="0"
              step="0.1"
              value={formData.averageDailySales}
              onChange={handleChange}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <span>Updating...</span>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Update Stock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
