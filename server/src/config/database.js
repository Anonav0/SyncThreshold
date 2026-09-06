const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Ensure environment variables are loaded
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

/**
 * Establishes connection to MongoDB using Mongoose.
 * Exits the process with an error code if the connection fails.
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      console.error(
        "FATAL DATABASE ERROR: MONGODB_URI is not defined in environment variables.",
      );
      console.error(
        "Please ensure MONGODB_URI is set in your root .env or server/.env file.",
      );
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoURI);

    console.log(
      `MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`,
    );
    return conn;
  } catch (error) {
    console.error(
      `FATAL DATABASE ERROR: Failed to connect to MongoDB: ${error.message}`,
    );
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
        '2. Ensure the user has "Read and write to any database" permissions.',
      );
      console.error(
        "3. Ensure the database name is in the connection string (e.g., ...mongodb.net/inventory_db?...).",
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;
