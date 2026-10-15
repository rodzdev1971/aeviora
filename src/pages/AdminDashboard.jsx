import { t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { apiRequest } from "../util/api";
import AdminEmailForm from "../components/AdminEmailForm.jsx";

const pageSize = 25;

export default function AdminDashboard() {
  useLanguage();
  const { user } = useOutletContext();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busyUserId, setBusyUserId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [emailRecipient, setEmailRecipient] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/admin/users?page=${page}&limit=${pageSize}`, {
      signal: controller.signal,
    })
      .then(setResult)
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message);
      });
    return () => controller.abort();
  }, [page, reloadKey]);

  async function removeAdminAccess(account) {
    if (
      !window.confirm(
        t(`Remove admin access from ${account.firstName} ${account.lastName}?`),
      )
    ) {
      return;
    }
    setBusyUserId(account._id);
    setActionError("");
    setActionMessage("");
    try {
      const response = await apiRequest(
        `/api/admin/users/${encodeURIComponent(account._id)}/admin-access`,
        { method: "DELETE" },
      );
      setActionMessage(response.message);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusyUserId("");
    }
  }

  async function verifyAccount(account) {
    if (!window.confirm(t(`Manually verify and activate the account for ${account.email}? Only continue after confirming the account owner's identity.`))) return;
    setBusyUserId(account._id); setActionError(""); setActionMessage("");
    try {
      const response = await apiRequest(`/api/admin/users/${encodeURIComponent(account._id)}/verify`, { method: "POST" });
      setActionMessage(response.message);
      setReloadKey((key) => key + 1);
    } catch (requestError) { setActionError(requestError.message); }
    finally { setBusyUserId(""); }
  }

  return (
    <section className="mx-auto max-w-6xl">
      <header className="border-b border-aeviora-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-aeviora-gold">{t("Administration")}</p>
        <h1 className="mt-2 font-display text-3xl">{t("Account overview")}</h1>
        <Link to="/admin/payments" className="mt-4 inline-block btn-secondary">{t("Record Zelle payments")}</Link>
        <Link to="/admin/email-templates" className="mt-4 inline-block btn-secondary">{t("Manage email templates")}</Link>
        <Link to="/admin/benefits" className="mt-4 inline-block btn-secondary">{t("Manage benefits")}</Link>
        <Link to="/admin/fees" className="mt-4 ml-3 inline-block btn-secondary">{t("Manage fee catalogs")}</Link>
        <Link to="/admin/memberships" className="mt-4 ml-3 inline-block btn-secondary">{t("Manage memberships")}</Link>
        <p className="mt-2 text-sm text-aeviora-slate">
          {t(result ? `${result.total} accounts` : "Account records")}
        </p>
      </header>
      {emailRecipient && <AdminEmailForm key={emailRecipient._id} recipient={emailRecipient} onClose={() => setEmailRecipient(null)} />}

      {error ? (
        <div role="alert" className="mt-6 border-l-4 border-red-600 bg-red-50 p-4 text-red-800">
          <p>{t(error)}</p>
          <button
            type="button"
            className="mt-2 font-semibold underline"
            onClick={() => {
              setError("");
              setReloadKey((key) => key + 1);
            }}
          >{t("Try again")}</button>
        </div>
      ) : !result ? (
        <p role="status" className="py-8 text-sm text-aeviora-slate">{t("Loading accounts…")}</p>
      ) : (
        <>
          {actionError && (
            <p role="alert" className="mt-5 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-800">
              {t(actionError)}
            </p>
          )}
          {actionMessage && (
            <p role="status" className="mt-5 border-l-4 border-green-700 bg-green-50 p-3 text-sm text-green-900">
              {t(actionMessage)}
            </p>
          )}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-170 border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-aeviora-border text-xs uppercase text-aeviora-slate">
                  <th scope="col" className="px-3 py-3 font-semibold">{t("Name")}</th>
                  <th scope="col" className="px-3 py-3 font-semibold">{t("Email")}</th>
                  <th scope="col" className="px-3 py-3 font-semibold">{t("Phone")}</th>
                  <th scope="col" className="px-3 py-3 font-semibold">{t("Status")}</th>
                  <th scope="col" className="px-3 py-3 font-semibold">{t("Email verification")}</th>
                  <th scope="col" className="px-3 py-3 font-semibold">{t("Role")}</th>
                  <th scope="col" className="px-3 py-3 font-semibold">{t("Created")}</th>
                  <th scope="col" className="px-3 py-3 font-semibold">{t("Admin access")}</th>
                </tr>
              </thead>
              <tbody>
                {result.users.map((account) => (
                  <tr key={account._id} className="border-b border-aeviora-border/70">
                    <td className="px-3 py-4 font-medium">
                      {account.firstName} {account.lastName}
                    </td>
                    <td className="px-3 py-4">
                      {account.email}
                      <button type="button" disabled={Boolean(emailRecipient) || account.accountStatus === "deleted"} onClick={() => setEmailRecipient(account)} className="mt-2 block font-semibold text-aeviora-primary underline disabled:opacity-50">{t("Email user")}</button>
                    </td>
                    <td className="px-3 py-4">{account.phone}</td>
                    <td className="px-3 py-4 capitalize">{t(account.accountStatus)}</td>
                    <td className="px-3 py-4">
                      <span>{t(({ verified: "Verified", pending: "Awaiting verification", not_verified: "Not verified", legacy: "Existing account" })[account.verificationStatus] || "Not verified")}</span>
                      {account.emailVerificationMethod === "admin" && <span className="block text-xs text-aeviora-slate">{t("Verified by admin")}</span>}
                      {account.verificationStatus !== "verified" && ["pending", "active"].includes(account.accountStatus) && <button type="button" disabled={Boolean(busyUserId)} onClick={() => verifyAccount(account)} className="mt-2 block font-semibold text-aeviora-primary underline disabled:opacity-50">{t(busyUserId === account._id ? "Please wait…" : "Verify manually")}</button>}
                    </td>
                    <td className="px-3 py-4 capitalize">{t(account.role)}</td>
                    <td className="px-3 py-4">
                      {t(new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(account.createdAt)))}
                    </td>
                    <td className="px-3 py-4">
                      {account.role !== "admin" ? (
                        <span className="text-aeviora-slate">{t("Not admin")}</span>
                      ) : account._id === user?._id ? (
                        <span className="text-aeviora-slate">{t("Current account")}</span>
                      ) : (
                        <button
                          type="button"
                          className="font-semibold text-red-700 underline disabled:opacity-50"
                          disabled={Boolean(busyUserId)}
                          onClick={() => removeAdminAccess(account)}
                        >
                          {t(busyUserId === account._id
                            ? "Removing…"
                            : "Remove admin access")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {result.users.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-3 py-8 text-center text-aeviora-slate">{t("No accounts found.")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="mt-5 flex items-center justify-between border-t border-aeviora-border pt-4 text-sm">
            <p className="text-aeviora-slate">{t("Page ")}{t(result.page)}{t(" of ")}{t(Math.max(1, result.totalPages))}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >{t("Previous")}</button>
              <button
                type="button"
                className="btn-secondary disabled:opacity-50"
                disabled={page >= result.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >{t("Next")}</button>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}
