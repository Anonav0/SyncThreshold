const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const InventoryItem = require("../models/InventoryItem");

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

    await InventoryItem.deleteMany({});
    console.log("Cleared existing inventory items.");

    const createdItems = await InventoryItem.insertMany(seedItems);
    console.log(`Successfully seeded ${createdItems.length} inventory items!`);

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

    await mongoose.disconnect();
    console.log("Database disconnected cleanly.");
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
        "   (Note: Atlas Database User is different from your Atlas account/email login).",
      );
      console.error(
        "2. Ensure the user has 'Read and write to any database' permissions.",
      );
      console.error(
        "3. Ensure the database name is in the connection string (e.g., ...mongodb.net/inventory_db?...).",
      );
    }
    process.exit(1);
  }
};

seedDatabase();
