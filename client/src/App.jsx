import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import inventoryService from "./services/inventoryService";
import salesService from "./services/salesService";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryService.getAll();
      setItems(data);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to backend server. Make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      setSalesLoading(true);
      setSalesError(null);
      const data = await salesService.getAllSales();
      setSales(data);
    } catch (err) {
      setSalesError(err.message || "Could not retrieve sales history.");
    } finally {
      setSalesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchSales();
  }, [fetchItems, fetchSales]);

  // When a sale is recorded, update both local states immediately
  const handleSaleRecorded = (result) => {
    if (result?.inventory) {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item._id === result.inventory._id ? result.inventory : item,
        ),
      );
    } else {
      fetchItems();
    }

    if (result?.sale) {
      setSales((prevSales) => [result.sale, ...prevSales]);
    } else {
      fetchSales();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" ? (
          <Dashboard
            items={items}
            sales={sales}
            error={error || salesError}
            onNavigateToInventory={() => setActiveTab("inventory")}
            onNavigateToSales={() => setActiveTab("sales")}
          />
        ) : activeTab === "sales" ? (
          <Sales
            sales={sales}
            items={items}
            loading={salesLoading}
            error={salesError}
            onRefresh={fetchSales}
            onSaleRecorded={handleSaleRecorded}
          />
        ) : (
          <Inventory
            items={items}
            loading={loading}
            error={error}
            onRefresh={() => {
              fetchItems();
              fetchSales();
            }}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>
            SyncThreshold — AI-Powered Inventory Reorder Automation System •
            Phase 5 Automated Inventory Monitoring
          </p>
        </div>
      </footer>
    </div>
  );
}
