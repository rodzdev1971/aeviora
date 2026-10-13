export function upgradeFailure(error) {
  if (error.code === "STRIPE_CONFIG") return { status: 503, category: "stripe_configuration", message: "Card upgrades are not configured on the server. Contact support." };
  if (["StripeAuthenticationError", "StripePermissionError"].includes(error.type)) return { status: 503, category: "stripe_authorization", message: "The server cannot access Stripe billing. An administrator must check the Stripe key and permissions." };
  if (["StripeConnectionError", "StripeAPIError", "StripeRateLimitError"].includes(error.type)) return { status: 502, category: "stripe_unavailable", message: "Stripe could not complete the billing request. Please try again shortly." };
  if (error.type === "StripeInvalidRequestError") return { status: 409, category: "stripe_request_rejected", message: "Stripe could not calculate this upgrade for the current subscription. Contact support with the error reference below." };
  if (error.type === "StripeCardError") return { status: 402, category: "payment_required", message: "Stripe could not complete payment. Review your payment method in billing management." };
  if (["CastError", "ValidationError", "StrictModeError"].includes(error.name)) return { status: 409, category: "invalid_billing_data", message: "The membership billing record could not be validated. Refresh your membership or contact support." };
  return { status: 500, category: "upgrade_failed", message: "The upgrade request could not finish. Contact support with the error reference below." };
}

export function upgradeDiagnostics(error, stage, reference) {
  // Never include messages, bodies, customer IDs, or raw Stripe error objects.
  const knownParams = ["subscription_details.proration_date", "subscription_details.billing_cycle_anchor", "subscription_details.items", "proration_date", "billing_cycle_anchor", "recurring.interval", "recurring.interval_count", "product_data", "subscription", "customer"];
  return { event: "membership_upgrade_failed", category: upgradeFailure(error).category, stage, reference, parameter: knownParams.includes(error.param) ? error.param : undefined };
}
