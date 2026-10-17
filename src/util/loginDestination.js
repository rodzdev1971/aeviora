export function loginDestination(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  try {
    const url = new URL(value, "https://aeviora.invalid");
    return url.origin === "https://aeviora.invalid" ? url.pathname + url.search + url.hash : "/dashboard";
  } catch { return "/dashboard"; }
}
