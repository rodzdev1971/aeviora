export const zelleRecipient = { phone: "786-280-7650", name: "Aeviora Wellness by Health LIfeguide LLC" };
export function nextBillingDate(value) {
  return new Date(new Date(value).getTime() + 30 * 24 * 60 * 60 * 1000);
}
