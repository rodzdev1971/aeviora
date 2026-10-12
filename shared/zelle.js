export const zelleRecipient = { phone: "786-280-7650", name: "Aeviora Wellness by Health LIfeguide LLC" };
export function nextBillingDate(value) {
  const date = new Date(value);
  const day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + 1);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date;
}
