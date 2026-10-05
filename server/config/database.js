import mongoose from "mongoose";

// One pool and one in-flight connection attempt per warm function instance.
export function createDatabaseConnector(client = mongoose, env = process.env) {
  let pending;
  return async function connectDatabase() {
    if (client.connection.readyState === 1) return client;
    if (!pending) {
      const uri = env.MONGO_URI || env.MONGODB_URI;
      if (!uri) throw new Error("MongoDB connection is not configured.");
      pending = client.connect(uri, {
        ...(env.MONGO_DB_NAME ? { dbName: env.MONGO_DB_NAME } : {}),
        maxPoolSize: 5, minPoolSize: 0, maxIdleTimeMS: 60000,
        serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000,
      });
    }
    try { return await pending; }
    finally { pending = undefined; }
  };
}

export const connectDatabase = createDatabaseConnector();
