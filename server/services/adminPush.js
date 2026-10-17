import webpush from "web-push";
import { z } from "zod";
import PushSubscription from "../models/adminPushSubscriptions.js";
import User from "../models/users.js";

export function allowedPushEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash
      && (["fcm.googleapis.com", "updates.push.services.mozilla.com", "push.services.mozilla.com", "web.push.apple.com"].includes(url.hostname)
        || url.hostname.endsWith(".notify.windows.com"));
  } catch { return false; }
}
export const pushSubscriptionInput = z.strictObject({
  endpoint: z.string().max(2048).refine(allowedPushEndpoint, "Use a supported browser push service."),
  expirationTime: z.number().nullable().optional(),
  keys: z.strictObject({ p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/), auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/) }),
  language: z.enum(["en", "es"]).default("en"),
});

export function pushConfiguration(env = process.env) {
  const publicKey = env.WEB_PUSH_PUBLIC_KEY || "", privateKey = env.WEB_PUSH_PRIVATE_KEY || "", subject = env.WEB_PUSH_SUBJECT || "";
  let configured = false;
  try {
    const url = new URL(subject);
    configured = /^[A-Za-z0-9_-]{87}$/.test(publicKey) && /^[A-Za-z0-9_-]{43}$/.test(privateKey) && ["mailto:", "https:"].includes(url.protocol);
  } catch { /* Missing configuration is reported without exposing keys. */ }
  return { configured, publicKey: configured ? publicKey : "", privateKey, subject };
}

export const pushRepository = {
  has: (userId, endpoint, publicKey) => PushSubscription.exists({ userId, endpoint, publicKey }),
  save: (userId, data, publicKey) => PushSubscription.findOneAndUpdate({ endpoint: data.endpoint }, { $set: { userId, endpoint: data.endpoint, keys: data.keys, language: data.language, publicKey } }, { upsert: true, returnDocument: "after", runValidators: true }),
  remove: (userId, endpoint) => PushSubscription.deleteOne({ userId, endpoint }),
  subscriptions: (publicKey, userId) => PushSubscription.find({ publicKey, ...(userId ? { userId } : {}) }).select("+endpoint +keys.p256dh +keys.auth +publicKey").lean().cursor(),
  eligibleAdmins: (ids) => User.find({ _id: { $in: ids }, role: "admin", accountStatus: "active", $or: [{ emailVerificationRequired: { $ne: true } }, { emailVerifiedAt: { $ne: null } }] }).select("_id").lean(),
};

// Await delivery to the push service before the registration request ends:
// serverless hosts do not guarantee completion of background promises.
// Messages intentionally contain no account identity or contact information.
export async function sendSignupPush({ repository = pushRepository, env = process.env, send = webpush.sendNotification.bind(webpush), userId, test = false } = {}) {
  const config = pushConfiguration(env);
  if (!config.configured) return { configured: false, sent: 0, failed: 0 };
  let sent = 0, failed = 0;
  const batch = [];
  async function deliver(items) {
    const admins = new Set((await repository.eligibleAdmins([...new Set(items.map((item) => item.userId))])).map((user) => String(user._id)));
    await Promise.all(items.map(async (item) => {
      if (!admins.has(item.userId)) { await repository.remove(item.userId, item.endpoint); return; }
      const spanish = item.language === "es";
      const payload = JSON.stringify({ title: test ? (spanish ? "Notificación de prueba de Aeviora" : "Aeviora test notification") : (spanish ? "Nuevo registro en Aeviora" : "New Aeviora signup"),
        body: test ? (spanish ? "Las notificaciones están listas en este navegador." : "Notifications are ready in this browser.") : (spanish ? "Una nueva cuenta se ha registrado. Abre las métricas para revisar los registros y su verificación." : "A new account has registered. Open metrics to review signups and verification."), url: "/admin/metrics/signups" });
      try {
        await send({ endpoint: item.endpoint, keys: item.keys }, payload, { vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey }, TTL: 86400, timeout: 3000, urgency: "normal" });
        sent++;
      } catch (error) {
        failed++;
        if ([404, 410].includes(error.statusCode)) await repository.remove(item.userId, item.endpoint);
      }
    }));
  }
  for await (const item of repository.subscriptions(config.publicKey, userId)) {
    if (userId && item.userId !== userId) continue;
    batch.push(item);
    if (batch.length === 20) { await deliver(batch.splice(0)); }
  }
  if (batch.length) await deliver(batch);
  return { configured: true, sent, failed };
}

export async function notifyNewSignup(options) {
  try { return await sendSignupPush(options); }
  catch { return { configured: true, sent: 0, failed: 1 }; }
}
