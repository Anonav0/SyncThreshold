import React, { useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  PackageOpen,
} from "lucide-react";
import inventoryService from "../services/inventoryService";
import InventoryModal from "../components/InventoryModal";
import StockUpdateModal from "../components/StockUpdateModal";

export default function Inventory({ items, loading, error, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stockModalItem, setStockModalItem] = useState(null);
  const [bannerMessage, setBannerMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Extract unique categories
  const categories = [
    "ALL",
    ...Array.from(new Set(items.map((i) => i.category))).filter(Boolean),
  ];

  // Filter items based on search query and category
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const showNotification = (msg, isError = false) => {
    setBannerMessage({ text: msg, isError });
    setTimeout(() => {
      setBannerMessage(null);
    }, 4000);
  };

  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${item.name}" (${item.sku})?`,
      )
    ) {
      return;
    }

    try {
      setDeletingId(item._id);
      await inventoryService.delete(item._id);
      showNotification(`Item "${item.name}" deleted successfully.`);
      onRefresh();
    } catch (err) {
      showNotification(err.message || "Failed to delete item", true);
    } finally {
      setDeletingId(null);
    }
  };

  const getStockStatusBadge = (stock, threshold) => {
    if (stock <= threshold * 0.2) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          Very Low Stock
        </span>
      );
    }
    if (stock <= threshold) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        Healthy
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
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

      {/* Header with Search & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inventory Catalog
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor and update catalog items, stock quantities, and reorder
            levels.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Inventory
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-sm font-medium">
              Loading inventory items from backend...
            </p>
          </div>
        ) : error && items.length === 0 ? (
          <div className="py-16 text-center text-rose-500 px-4">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-600 mb-2" />
            <p className="text-base font-semibold">Failed to load inventory</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {error}
            </p>
            <button
              onClick={onRefresh}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-500 px-4">
            <PackageOpen className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <h4 className="text-base font-semibold text-slate-700">
              No inventory items found
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {items.length === 0
                ? "Get started by creating your first inventory item or running the seed script."
                : "Try adjusting your search criteria or category filter."}
            </p>
            {items.length === 0 && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add First Item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Product & SKU</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Stock</th>
                  <th className="px-6 py-3.5">Threshold</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5">Daily Sales</th>
                  <th className="px-6 py-3.5">Supplier</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {filteredItems.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-slate-50/75 transition-colors"
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {item.currentStock}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.reorderThreshold}
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-medium">
                      ₹{item.unitPrice}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.averageDailySales ?? 0} / day
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.supplier}
                    </td>
                    <td className="px-6 py-4">
                      {getStockStatusBadge(
                        item.currentStock,
                        item.reorderThreshold,
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setStockModalItem(item)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                          title="Update stock levels"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Update
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item._id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <InventoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(msg) => {
          showNotification(msg);
          onRefresh();
        }}
      />

      {/* Update Stock Modal */}
      <StockUpdateModal
        item={stockModalItem}
        isOpen={!!stockModalItem}
        onClose={() => setStockModalItem(null)}
        onSuccess={(msg) => {
          showNotification(msg);
          onRefresh();
        }}
      />
    </div>
  );
}
