import mongoose from "mongoose";
import dotenv from "dotenv";
import { configureServiceFees } from "../services/serviceFeeCollection.js";

dotenv.config({ path: "./server/.env", quiet: true });
try {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/aeviora_wellness");
  await configureServiceFees(mongoose.connection.db);
  console.log("Service fee collection supports fixed prices and percentage discounts.");
} catch {
  console.error("Unable to configure service fee validation.");
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
