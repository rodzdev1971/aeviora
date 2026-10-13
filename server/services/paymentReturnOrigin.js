// Keep host-only login cookies on the hostname that started checkout.
// Never use an arbitrary Origin or Host header as a payment redirect.
export function paymentReturnOrigin(req) {
  const configured = new URL(process.env.FRONTEND_ORIGIN || "http://localhost:5173").origin;
  const allowed = new Set([configured]);
  if (["https://aeviorawellness.com", "https://www.aeviorawellness.com"].includes(configured)) {
    allowed.add("https://aeviorawellness.com");
    allowed.add("https://www.aeviorawellness.com");
  }
  const origin = req.get("origin");
  return allowed.has(origin) ? origin : configured;
}
