import mongoose from "mongoose";
import { logDatabaseFailure } from "../utils/databaseDiagnostics.js";

// One pool and one in-flight connection attempt per warm function instance.
export function createDatabaseConnector(client = mongoose, env = process.env, logger = console.error) {
  let pending;
  return async function connectDatabase() {
    if (client.connection.readyState === 1) return client;
    if (!pending) {
      const uri = env.MONGO_URI || env.MONGODB_URI;
      if (!uri) {
        logDatabaseFailure({ category: "MISSING_CONFIGURATION", env, logger });
        throw new Error("MongoDB connection is not configured.");
      }
      const started = Date.now();
      pending = (async () => {
        try { return await client.connect(uri, {
        ...(env.MONGO_DB_NAME ? { dbName: env.MONGO_DB_NAME } : {}),
        maxPoolSize: 5, minPoolSize: 0, maxIdleTimeMS: 60000,
        serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000,
        }); }
        catch (error) {
          logDatabaseFailure({ error, env, logger, elapsedMs: Date.now() - started });
          throw error;
        }
      })();
    }
    try { return await pending; }
    finally { pending = undefined; }
  };
}

export const connectDatabase = createDatabaseConnector();
