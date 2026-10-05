import mongoose from "mongoose";
import dotenv from "dotenv";
import MembershipPlan from "../models/membershipPlans.js";
import Benefit from "../models/benefits.js";
import { seedMembershipPlans } from "../services/membershipPlans.js";

dotenv.config({ path: "./server/.env", quiet: true });
try {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/aeviora_wellness");
  await MembershipPlan.init();
  await seedMembershipPlans(MembershipPlan, await Benefit.find().lean());
  console.log("Starter memberships initialized. Existing plans were preserved.");
} catch {
  console.error("Unable to initialize memberships. Check the database connection and benefit catalog.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
