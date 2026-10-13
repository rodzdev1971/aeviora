export const PLAN_CHANGE_WINDOW = 24 * 60 * 60 * 1000;
export function nextPlanChangeAt(user) {
  const time = new Date(user.lastMembershipChangeAt || 0).getTime();
  return time ? new Date(time + PLAN_CHANGE_WINDOW) : null;
}
export function planChangeBlocked(user, now = new Date()) {
  return nextPlanChangeAt(user) > now;
}
export function planChangeFilter(now = new Date()) {
  return { $or: [{ lastMembershipChangeAt: null }, { lastMembershipChangeAt: { $lte: new Date(now.getTime() - PLAN_CHANGE_WINDOW) } }] };
}
export function planChangeMessage(user) {
  return `You can upgrade or downgrade once every 24 hours. Your next plan change is available at ${nextPlanChangeAt(user).toISOString()}.`;
}
