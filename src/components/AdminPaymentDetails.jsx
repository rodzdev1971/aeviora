import { useId, useState } from "react";
import { apiRequest } from "../util/api";

const money = (cents, currency = "usd") => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

export default function AdminPaymentDetails({ user, onRecorded }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [reference, setReference] = useState("");
  async function load() {
    setBusy(true); setError(""); setData(null);
    try { setData(await apiRequest(`/api/membership-billing/${user._id}/details`)); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function record(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest(`/api/membership-billing/${user._id}/confirm-invoice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: invoice.id, reference, amountCents: invoice.pending ? invoice.amountCents : invoice.amountRemaining }) });
      setMessage(result.message); setInvoice(null); onRecorded(); await load();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  function toggle() {
    setOpen(!open);
    if (!open) load();
  }
  return <div className="space-y-3 border-t pt-3">
    <button type="button" className="btn-secondary" disabled={busy} aria-expanded={open} aria-controls={detailsId} onClick={toggle}>{open ? "Hide balances and Stripe payment history" : "View balances and Stripe payment history"}</button>
    <div id={detailsId} hidden={!open} className="space-y-3">
    {busy && <p role="status">Checking payments…</p>}
    {open && <button type="button" className="btn-secondary" disabled={busy} onClick={load}>Refresh balances</button>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {message && <p role="status">{message}</p>}
    {data && <>
      <p className="font-semibold">Zelle balance due: {data.zelleBalance.amount === null ? "Review canceled membership history; cancellation date is unavailable." : `${money(data.zelleBalance.amount * 100)} (${data.zelleBalance.periods} unpaid periods)`}</p>
      <p className="font-semibold">Stripe outstanding balance: {Object.entries(data.balances).map(([currency, amount]) => money(amount, currency)).join(" · ") || "$0.00"}</p>
      <p className="text-sm">Balances include unpaid periods or invoices, not future renewals. Stripe amounts include invoices marked uncollectible. Refresh before confirming a receipt.</p>
      {data.invoices.length === 0 && <p>No Stripe membership invoices.</p>}
      <ul className="space-y-3">{data.invoices.map((item) => <li key={item.id} className="rounded-lg border p-3 space-y-2">
        <p>{item.number || item.id} · {new Date(item.periodStart * 1000).toLocaleDateString()} – {new Date(item.periodEnd * 1000).toLocaleDateString()} · {item.status}</p>
        <p>Paid: {money(item.amountPaid, item.currency)} · Balance: {money(item.amountRemaining, item.currency)} · Payment: {item.method}{item.reference ? ` · Reference: ${item.reference}` : ""}</p>
        {(item.pending || (item.status === "open" && item.amountRemaining > 0 && item.currency === "usd")) && <button type="button" disabled={busy || user.accountStatus !== "active"} className="btn-primary" onClick={() => { setInvoice(item); setReference(item.reference || ""); setMessage(""); }}>{item.pending ? "Retry Zelle confirmation" : "Record Zelle for this invoice"}</button>}
      </li>)}</ul>
    </>}
    {invoice && <form className="card space-y-3" onSubmit={record}>
      <h3 className="font-semibold">Verify Zelle receipt for {invoice.number || invoice.id}</h3>
      <p>Amount: {money(invoice.pending ? invoice.amountCents : invoice.amountRemaining)}</p>
      <p>This records payment outside Stripe and settles this invoice. It does not cancel future automatic card payments or enroll the member in ongoing Zelle billing.</p>
      <fieldset disabled={busy} className="space-y-3">
        <label className="block">Bank reference<input className="input" required maxLength={150} readOnly={invoice.pending} value={reference} onChange={(event) => setReference(event.target.value)} /></label>
        <label className="flex gap-2"><input type="checkbox" required />I verified the full amount in the bank and the member chose Zelle for this payment.</label>
        <div className="flex flex-wrap gap-3"><button className="btn-primary" type="submit">Confirm Zelle receipt</button><button type="button" className="btn-secondary" onClick={() => setInvoice(null)}>Cancel</button></div>
      </fieldset>
    </form>}
    </div>
  </div>;
}
