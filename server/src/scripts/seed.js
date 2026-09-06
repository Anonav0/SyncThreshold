const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const InventoryItem = require("../models/InventoryItem");
const Sale = require("../models/Sale");

// Load environment variables from current working directory, server directory, or project root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const seedItems = [
  // Healthy Stock
  {
    name: "Cotton Yarn Spools",
    sku: "YARN-001",
    category: "Raw Material",
    currentStock: 250,
    reorderThreshold: 50,
    unitPrice: 120,
    averageDailySales: 10,
    supplier: "ABC Textiles",
    lastRestockedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    name: "Heavyweight Denim Fabric",
    sku: "DENIM-002",
    category: "Raw Material",
    currentStock: 180,
    reorderThreshold: 40,
    unitPrice: 350,
    averageDailySales: 6,
    supplier: "Blue Horizon Mills",
    lastRestockedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  },
  {
    name: "Polyester Thread Cones",
    sku: "THRD-003",
    category: "Accessories",
    currentStock: 500,
    reorderThreshold: 100,
    unitPrice: 45,
    averageDailySales: 25,
    supplier: "Apex Stitching Supplies",
    lastRestockedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },

  // Low Stock
  {
    name: "Antique Brass Metal Zippers (20cm)",
    sku: "ZIP-004",
    category: "Hardware",
    currentStock: 35,
    reorderThreshold: 50,
    unitPrice: 15,
    averageDailySales: 8,
    supplier: "YKK Fasteners",
    lastRestockedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
  },
  {
    name: "Natural Wooden Buttons (15mm)",
    sku: "BTN-005",
    category: "Accessories",
    currentStock: 28,
    reorderThreshold: 60,
    unitPrice: 5,
    averageDailySales: 12,
    supplier: "EcoCraft Supplies",
    lastRestockedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  {
    name: "Corrugated Shipping Boxes (Medium)",
    sku: "BOX-006",
    category: "Packaging",
    currentStock: 45,
    reorderThreshold: 50,
    unitPrice: 22,
    averageDailySales: 15,
    supplier: "PackWell Containers",
    lastRestockedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  },

  // Very Low Stock
  {
    name: "Knitted Elastic Band (1 inch)",
    sku: "ELST-007",
    category: "Accessories",
    currentStock: 4,
    reorderThreshold: 40,
    unitPrice: 30,
    averageDailySales: 9,
    supplier: "FlexiGrip Textiles",
    lastRestockedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    name: "Industrial Needles 90/14 (Pack of 10)",
    sku: "NDL-008",
    category: "Tools",
    currentStock: 2,
    reorderThreshold: 30,
    unitPrice: 8,
    averageDailySales: 5,
    supplier: "Schmetz Industrial",
    lastRestockedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
  },
];

const seedDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      console.error("FATAL: MONGODB_URI is required to run seed script.");
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB for seeding...");

    // Clear collections
    await InventoryItem.deleteMany({});
    await Sale.deleteMany({});
    console.log("Cleared existing inventory items and sales records.");

    // Insert Inventory Items
    const createdItems = await InventoryItem.insertMany(seedItems);
    console.log(`Successfully seeded ${createdItems.length} inventory items!`);

    // Generate realistic historical sales records
    const itemMap = new Map();
    createdItems.forEach((item) => itemMap.set(item.sku, item));

    const salesToInsert = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Helper to push sale
    const addSale = (sku, qty, daysAgo) => {
      const item = itemMap.get(sku);
      if (!item) return;
      salesToInsert.push({
        inventoryItemId: item._id,
        quantitySold: qty,
        unitPrice: item.unitPrice,
        totalAmount: qty * item.unitPrice,
        soldAt: new Date(
          now - daysAgo * dayMs + Math.floor(Math.random() * 3600000),
        ),
      });
    };

    // Sales history for Cotton Yarn (YARN-001)
    addSale("YARN-001", 5, 4);
    addSale("YARN-001", 8, 3);
    addSale("YARN-001", 6, 2);
    addSale("YARN-001", 7, 1);
    addSale("YARN-001", 10, 0);

    // Sales history for Denim Fabric (DENIM-002)
    addSale("DENIM-002", 2, 5);
    addSale("DENIM-002", 3, 3);
    addSale("DENIM-002", 1, 1);

    // Sales history for Polyester Thread (THRD-003)
    addSale("THRD-003", 20, 3);
    addSale("THRD-003", 35, 2);
    addSale("THRD-003", 25, 1);

    // Sales history for Zippers (ZIP-004)
    addSale("ZIP-004", 12, 4);
    addSale("ZIP-004", 10, 2);
    addSale("ZIP-004", 8, 0);

    // Sales history for Wooden Buttons (BTN-005)
    addSale("BTN-005", 15, 3);
    addSale("BTN-005", 25, 1);

    // Sales history for Needles (NDL-008)
    addSale("NDL-008", 5, 2);
    addSale("NDL-008", 3, 1);

    const createdSales = await Sale.insertMany(salesToInsert);
    console.log(
      `Successfully seeded ${createdSales.length} historical sales records!`,
    );

    console.log("\n--- Inventory Summary ---");
    console.table(
      createdItems.map((item) => ({
        SKU: item.sku,
        Name: item.name,
        Stock: item.currentStock,
        Threshold: item.reorderThreshold,
        DailySales: item.averageDailySales,
        Status:
          item.currentStock <= item.reorderThreshold * 0.2
            ? "Very Low"
            : item.currentStock <= item.reorderThreshold
              ? "Low"
              : "Healthy",
      })),
    );

    console.log("\n--- Recent Sales Summary ---");
    console.table(
      createdSales.slice(0, 8).map((sale) => {
        const item = createdItems.find((i) =>
          i._id.equals(sale.inventoryItemId),
        );
        return {
          Product: item ? item.name : "Unknown",
          Qty: sale.quantitySold,
          UnitPrice: `₹${sale.unitPrice}`,
          Total: `₹${sale.totalAmount}`,
          SoldAt: sale.soldAt.toISOString().split("T")[0],
        };
      }),
    );

    await mongoose.disconnect();
    console.log("\nDatabase disconnected cleanly.");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error.message);
    if (
      error.message.includes("bad auth") ||
      error.message.includes("authentication failed")
    ) {
      console.error("\n[MongoDB Atlas Authentication Diagnostic]");
      console.error("1. Check MongoDB Atlas > Security > Database Access.");
      console.error(
        "   Ensure a Database User exists with this exact username and password.",
      );
      console.error(
        '2. Ensure the user has "Read and write to any database" permissions.',
      );
      console.error(
        "3. Ensure the database name is in the connection string (e.g., ...mongodb.net/inventory_db?...).",
      );
    }
    process.exit(1);
  }
};

seedDatabase();
