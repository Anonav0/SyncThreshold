import React, { useState, useEffect } from "react";
import { X, ShoppingCart, AlertCircle, CheckCircle2 } from "lucide-react";
import salesService from "../services/salesService";

export default function RecordSaleModal({
  isOpen,
  onClose,
  items = [],
  preselectedItem = null,
  onSuccess,
}) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (preselectedItem) {
      setSelectedItemId(preselectedItem._id);
    } else if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(items[0]._id);
    }
  }, [preselectedItem, items, selectedItemId]);

  if (!isOpen) return null;

  const currentItem = items.find((i) => i._id === selectedItemId);
  const availableStock = currentItem ? currentItem.currentStock : 0;
  const unitPrice = currentItem ? currentItem.unitPrice : 0;
  const qtyNumber = parseInt(quantity, 10) || 0;
  const totalAmount = qtyNumber * unitPrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedItemId) {
      setError("Please select a product.");
      return;
    }

    if (qtyNumber <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    if (qtyNumber > availableStock) {
      setError(
        `Cannot sell ${qtyNumber} units. Only ${availableStock} units available in stock.`,
      );
      return;
    }

    try {
      setLoading(true);
      const result = await salesService.recordSale({
        inventoryItemId: selectedItemId,
        quantitySold: qtyNumber,
      });

      onSuccess(
        `Successfully recorded sale of ${qtyNumber} × "${currentItem.name}" (Total: ₹${result.sale.totalAmount})`,
        result,
      );
      setQuantity("1");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to record sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Record Product Sale
            </h3>
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

          {/* Product Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Product *
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                setQuantity("1");
                setError(null);
              }}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              {items.map((item) => (
                <option
                  key={item._id}
                  value={item._id}
                  disabled={item.currentStock <= 0}
                >
                  {item.name} ({item.sku}) — Stock: {item.currentStock}{" "}
                  {item.currentStock <= 0 ? "(Out of Stock)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Product Info Card */}
          {currentItem && (
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Available Stock:</span>
                <span
                  className={`font-semibold ${availableStock <= 0 ? "text-rose-600" : availableStock <= currentItem.reorderThreshold ? "text-amber-600" : "text-slate-900"}`}
                >
                  {availableStock} units
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Unit Price:</span>
                <span className="font-semibold text-slate-900">
                  ₹{unitPrice}
                </span>
              </div>
            </div>
          )}

          {/* Quantity Sold */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Quantity Sold *
            </label>
            <input
              type="number"
              min="1"
              max={availableStock > 0 ? availableStock : 1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={availableStock <= 0}
              placeholder="1"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Total Amount Preview */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold uppercase text-emerald-800 tracking-wider">
                Total Amount
              </span>
              <p className="text-xs text-emerald-600 mt-0.5">
                Calculated by backend
              </p>
            </div>
            <span className="text-2xl font-bold text-emerald-700">
              ₹{totalAmount.toLocaleString()}
            </span>
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
              disabled={loading || availableStock <= 0}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <span>Recording...</span>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Confirm Sale</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
