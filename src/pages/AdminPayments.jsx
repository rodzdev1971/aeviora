import { t, getLocale } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { useEffect, useState } from "react";
import { apiRequest } from "../util/api";
import AdminPaymentDetails from "../components/AdminPaymentDetails";

export default function AdminPayments() {
  useLanguage();
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [reference, setReference] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/membership-billing/plans", { signal: controller.signal }).then((data) => setPlans(data.plans)).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, []);
  const matchingUsers = users.filter((user) => `${user.firstName} ${user.lastName} ${user.email} ${user.phone || ""}`.toLowerCase().includes(search.toLowerCase()));
  async function assignZelle(user) {
    setBusy(true); setError(""); setMessage("");
    try {
      await apiRequest(`/api/membership-billing/${user._id}/zelle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }) });
      setMessage("Zelle membership assigned. Select Record Zelle payment below to enter the verified bank receipt.");
      setPlanId(""); setRevision((value) => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/membership-billing/accounts", { signal: controller.signal }).then((data) => setUsers(data.users)).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [revision]);
  async function action(user, kind) {
    if (kind === "confirm" && !reference.trim()) return;
    if (kind === "cancel" && !window.confirm(t("Stop Zelle renewal and reminders? Confirmed paid access will continue until its period ends."))) return;
    setBusy(true); setError(""); setMessage("");
    try { const result = await apiRequest(`/api/membership-billing/${user._id}/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kind === "confirm" ? { dueAt: user.zelle.dueAt, reference } : {}) }); setMessage(result.message); setConfirming(null); setReference(""); setRevision((value) => value + 1); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function confirmUpgrade(user) {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest("/api/membership-upgrades/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user._id, quoteId: user.upgradeQuote.id, reference }) });
      setMessage(result.message); setReference(""); setRevision((value) => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function remind() {
    if (!window.confirm(t("Send payment reminders to eligible active members with due, unpaid payments? All accounts are checked, regardless of the search filter. Canceled and paid memberships will be skipped."))) return;
    setBusy(true); setError("");
    const counts = { sent: 0, skipped: 0, failed: 0 };
    try {
      const latest = await apiRequest("/api/membership-billing/accounts");
      for (const user of latest.users) {
        const result = await apiRequest(`/api/membership-billing/${user._id}/remind`, { method: "POST" });
        counts[result.outcome] += 1;
        setMessage(`Reminders: ${counts.sent} accepted, ${counts.skipped} skipped, ${counts.failed} failed. Keep this page open until complete.`);
      }
      setMessage(`Finished: ${counts.sent} accepted by SMTP, ${counts.skipped} skipped, ${counts.failed} failed.`);
    } catch (failure) { setError(`Stopped: ${failure.message} Completed: ${counts.sent} accepted, ${counts.skipped} skipped, ${counts.failed} failed. You can resume later; recently attempted recipients are skipped.`); }
    finally { setBusy(false); setRevision((value) => value + 1); }
  }
  return <section className="mx-auto max-w-6xl space-y-5">
    <h1 className="font-display text-3xl">{t("Membership payments")}</h1>
    <p>{t("Verify Zelle receipt in your bank before confirming a 30-day period. Reminders check current records and skip paid, canceled, pending, and inactive accounts. Stripe reminders require a current unpaid invoice.")}</p>
    <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} className="btn-primary" onClick={remind}>{t(busy ? "Working…" : "Send reminders")}</button><button type="button" disabled={busy} className="btn-secondary" onClick={() => setRevision((value) => value + 1)}>{t("Refresh payments")}</button></div>
    {error && <p role="alert" className="text-red-700">{t(error)}</p>}{message && <p role="status">{t(message)}</p>}
    {confirming && <form className="card space-y-4 border-2 border-aeviora-primary" onSubmit={(event) => { event.preventDefault(); action(confirming, "confirm"); }}>
      <h2 className="font-display text-2xl">{t("Record verified Zelle payment")}</h2>
      <p>{confirming.firstName} {confirming.lastName} · {confirming.email}</p>
      <p>{t("Plan: ")}<strong>{confirming.zelle.name}</strong>{t(" · 30-day amount: ")}<strong>${t(confirming.zelle.price.toFixed(2))}</strong></p>
      <p>{t("Payment applies to the 30-day period starting ")}{t(new Date(confirming.zelle.dueAt).toLocaleDateString(getLocale()))}.</p>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block">{t("Bank payment reference")}<input autoFocus required maxLength={150} className="input mt-1" value={reference} onChange={(event) => setReference(event.target.value)} /></label>
        <label className="flex items-start gap-2"><input required type="checkbox" className="mt-1" />{t("I verified receipt of the full 30-day amount in the bank account.")}</label>
        <p className="text-sm">{t("Saving activates the Zelle membership and advances its next unpaid period by 30 days. The payment history records your administrator account and confirmation time.")}</p>
        <div className="flex flex-wrap gap-3"><button type="submit" className="btn-primary">{t(busy ? "Recording…" : "Confirm payment received")}</button><button type="button" className="btn-secondary" onClick={() => setConfirming(null)}>{t("Cancel")}</button></div>
      </fieldset>
    </form>}
    <label className="block">{t("Search by name, email, or phone")}<input className="input" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedUser(""); setConfirming(null); }} /></label>
    <label className="block">{t("Select a user to manage")}<select className="input" value={selectedUser} onChange={(event) => { setSelectedUser(event.target.value); setConfirming(null); setPlanId(""); setMessage(""); }}><option value="">{t("Choose a user (")}{t(matchingUsers.length)}{t(" found)")}</option>{matchingUsers.map((user) => <option key={user._id} value={user._id}>{user.firstName} {user.lastName} — {user.email}</option>)}</select></label>
    {!matchingUsers.length && <p>{t("No matching accounts found.")}</p>}
    {users.filter((user) => user._id === selectedUser).map((user) => <article key={user._id} className="card space-y-3">
      <h2 className="font-semibold">{user.firstName} {user.lastName} · {user.email}</h2>
      <p>{t("Account: ")}{t(user.accountStatus)}</p>
      {user.upgradeQuote?.method === "zelle" && user.upgradeQuote.state === "quoted" && <form className="card space-y-3" onSubmit={(event) => { event.preventDefault(); confirmUpgrade(user); }}>
        <h3 className="font-semibold">{t("Verify Zelle upgrade to ")}{user.upgradeQuote.name}</h3>
        <p>{t("Required receipt: $")}{t((user.upgradeQuote.amountCents / 100).toFixed(2))}{t(" after $")}{t((user.upgradeQuote.creditCents / 100).toFixed(2))}{t(" credit. Quote expires ")}{t(new Date(user.upgradeQuote.expiresAt).toLocaleString(getLocale()))}.</p>
        <fieldset disabled={busy} className="space-y-3"><label className="block">{t("Bank reference")}<input required maxLength={150} className="input" value={reference} onChange={(event) => setReference(event.target.value)} /></label>
        <label className="flex gap-2"><input required type="checkbox" />{t("I verified receipt of the full upgrade amount.")}</label>
        <button className="btn-primary" type="submit">{t("Confirm upgrade payment")}</button></fieldset>
      </form>}
      {user.accountStatus !== "active" && <p>{t("Activate this account before recording a payment.")}</p>}
      {!["pending", "active"].includes(user.zelle?.status) && !(user.zellePaidThrough && new Date(user.zellePaidThrough) > new Date()) && !user.stripeSubscriptionId && <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); assignZelle(user); }}>
        <h3 className="font-semibold">{t("Set up membership paid by Zelle")}</h3>
        <p>{t("Choose the user's plan, then record their bank receipt. Assigning a plan alone does not mark it paid.")}</p>
        <fieldset disabled={busy || user.accountStatus !== "active"} className="space-y-3">
          <label className="block">{t("Membership plan")}<select className="input" required value={planId} onChange={(event) => setPlanId(event.target.value)}><option value="">{t("Choose a paid plan")}</option>{plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name} — ${t(plan.price.toFixed(2))}{t(" per 30 days")}</option>)}</select></label>
          <button type="submit" className="btn-primary">{t("Assign Zelle membership")}</button>
        </fieldset>
      </form>}
      <p className="font-semibold">{t("Zelle balance due: ")}{t(user.zelleBalance?.amount === null ? "Review canceled membership history" : `$${(user.zelleBalance?.amount || 0).toFixed(2)} · ${user.zelleBalance?.periods || 0} unpaid periods`)}</p>
      {user.zelle?.planId && <><p>{t("Zelle: ")}{user.zelle.name} · {t(user.zelle.status)} · ${t(user.zelle.price.toFixed(2))}{t(" 30-day")}</p><p>{t("Next unpaid period: ")}{t(new Date(user.zelle.dueAt).toLocaleDateString(getLocale()))}</p>
        {user.zellePaidThrough && <p>{t("Confirmed paid through: ")}{t(new Date(user.zellePaidThrough).toLocaleString(getLocale()))}{t(". Cancellation does not remove this paid period.")}</p>}
        {user.zelle.status === "canceled" && !user.stripeSubscriptionId && <button disabled={busy || user.accountStatus !== "active"} className="btn-primary" onClick={() => action(user, "reactivate")}>{t("Reactivate Zelle renewal")}</button>}
        {["pending", "active"].includes(user.zelle.status) && <div className="flex gap-3"><button disabled={busy || user.accountStatus !== "active"} className="btn-primary" onClick={() => { setConfirming(user); setReference(""); setError(""); }}>{t("Record Zelle payment")}</button><button disabled={busy} className="btn-secondary" onClick={() => action(user, "cancel")}>{t("Cancel Zelle membership")}</button></div>}
        <details><summary>{t("Zelle payment history (")}{t(user.zelle.payments?.length || 0)})</summary><ul>{(user.zelle.payments || []).map((payment) => <li key={payment._id}>{t(new Date(payment.periodStart).toLocaleDateString(getLocale()))} – {t(new Date(payment.periodEnd).toLocaleDateString(getLocale()))}: ${t(payment.amount.toFixed(2))}{t(" · Zelle · ")}{payment.reference}</li>)}</ul></details>
      </>}
      {user.stripeSubscriptionId && <p>{t("Stripe: ")}{t(user.membershipName || "Membership")} · {t(user.subscriptionStatus)}{t(". Payments are verified through Stripe.")}</p>}
      {user.stripeCustomerId && <AdminPaymentDetails user={user} onRecorded={() => setRevision((value) => value + 1)} />}
    </article>)}
  </section>;
}
