import mongoose from "mongoose";
import dotenv from "dotenv";
import { createApp } from "./app.js";

dotenv.config({ path: "./server/.env" });
const app = createApp();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/aeviora_wellness";

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    app.listen(PORT, () => console.log("Aeviora Wellness API running on port " + PORT));
  } catch {
    console.error("Unable to connect to MongoDB.");
    process.exitCode = 1;
  }
}
startServer();
