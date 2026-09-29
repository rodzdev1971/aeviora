import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/users.js";

dotenv.config({ path: "./server/.env" });

async function grantAdminAccess() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error("Pass the email address of an existing active account.");
  }

  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/aeviora_wellness",
  );
  const user = await User.findOneAndUpdate(
    { email, accountStatus: "active" },
    { $set: { role: "admin" } },
    { returnDocument: "after", runValidators: true },
  ).select("_id");
  if (!user) {
    throw new Error("No active account was found for that email.");
  }
  console.log("Admin access granted to the active account.");
}

grantAdminAccess()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
