const hints = {
  MISSING_CONFIGURATION: "Set MONGO_URI or MONGODB_URI for this Vercel environment, then redeploy.",
  INVALID_CONFIGURATION: "Use a plain MongoDB URI without quotes, Markdown, or mailto links.",
  AUTHENTICATION_FAILED: "Check the Atlas database user, password encoding, and authentication database.",
  DNS_FAILURE: "Check the cluster hostname and whether the Atlas cluster is running.",
  NETWORK_TIMEOUT: "Check Atlas network access and connectivity from the Vercel function.",
  NETWORK_FAILURE: "Check Atlas network access, cluster availability, and TLS connectivity.",
  SERVER_SELECTION_FAILED: "No suitable MongoDB server was reachable; check network access and cluster availability.",
  CONNECTION_FAILED: "MongoDB connection failed; review database configuration and cluster status.",
};

export function databaseFailureCategory(error) {
  const pending = [error];
  const seen = new Set();
  const errors = [];
  while (pending.length && seen.size < 50) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current); errors.push(current);
    pending.push(current.cause, current.reason, current.error);
    if (current.servers instanceof Map) pending.push(...current.servers.values());
  }
  const has = (check) => errors.some(check);
  // Inspect messages only for classification. Never include them in log output.
  if (has((e) => e.code === 18 || e.codeName === "AuthenticationFailed" || /authentication failed|bad auth|auth failed/i.test(e.message || ""))) return "AUTHENTICATION_FAILED";
  if (has((e) => ["ENOTFOUND", "EAI_AGAIN", "ENODATA"].includes(e.code) || /querySrv|queryTxt/i.test(e.syscall || ""))) return "DNS_FAILURE";
  if (has((e) => e.name === "MongoParseError" || e.name === "MongoInvalidArgumentError")) return "INVALID_CONFIGURATION";
  if (has((e) => e.code === "ETIMEDOUT" || e.name === "MongoNetworkTimeoutError" || /timed out|timeout/i.test(e.message || ""))) return "NETWORK_TIMEOUT";
  if (has((e) => ["ECONNREFUSED", "ECONNRESET", "ENETUNREACH", "EHOSTUNREACH"].includes(e.code) || e.name === "MongoNetworkError")) return "NETWORK_FAILURE";
  if (has((e) => ["MongoServerSelectionError", "MongooseServerSelectionError"].includes(e.name))) return "SERVER_SELECTION_FAILED";
  return "CONNECTION_FAILED";
}

export function logDatabaseFailure({ error, category, env, elapsedMs = 0, logger = console.error }) {
  const reason = category || databaseFailureCategory(error);
  // All strings are fixed/allowlisted. No URI, hostname, username, database name,
  // error message, stack, request headers, or arbitrary driver fields are emitted.
  logger(JSON.stringify({
    event: "database_connection_failed",
    category: Object.hasOwn(hints, reason) ? reason : "CONNECTION_FAILED",
    hint: hints[reason] || hints.CONNECTION_FAILED,
    uriVariable: env.MONGO_URI ? "MONGO_URI" : env.MONGODB_URI ? "MONGODB_URI" : "missing",
    mongoUriPresent: Boolean(env.MONGO_URI),
    mongodbUriPresent: Boolean(env.MONGODB_URI),
    databaseNameOverridePresent: Boolean(env.MONGO_DB_NAME),
    elapsedMs: Math.max(0, Math.round(elapsedMs)),
  }));
}
