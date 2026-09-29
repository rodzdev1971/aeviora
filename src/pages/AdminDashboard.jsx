import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../util/api";

const pageSize = 25;

export default function AdminDashboard() {
  const { user } = useOutletContext();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busyUserId, setBusyUserId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
        `Remove admin access from ${account.firstName} ${account.lastName}?`,
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

  return (
    <section className="mx-auto max-w-6xl">
      <header className="border-b border-aeviora-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-aeviora-gold">
          Administration
        </p>
        <h1 className="mt-2 font-display text-3xl">Account overview</h1>
        <p className="mt-2 text-sm text-aeviora-slate">
          {result ? `${result.total} accounts` : "Account records"}
        </p>
      </header>

      {error ? (
        <div role="alert" className="mt-6 border-l-4 border-red-600 bg-red-50 p-4 text-red-800">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 font-semibold underline"
            onClick={() => {
              setError("");
              setReloadKey((key) => key + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : !result ? (
        <p role="status" className="py-8 text-sm text-aeviora-slate">
          Loading accounts…
        </p>
      ) : (
        <>
          {actionError && (
            <p role="alert" className="mt-5 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-800">
              {actionError}
            </p>
          )}
          {actionMessage && (
            <p role="status" className="mt-5 border-l-4 border-green-700 bg-green-50 p-3 text-sm text-green-900">
              {actionMessage}
            </p>
          )}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-170 border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-aeviora-border text-xs uppercase text-aeviora-slate">
                  <th scope="col" className="px-3 py-3 font-semibold">Name</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Phone</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Role</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Created</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Admin access</th>
                </tr>
              </thead>
              <tbody>
                {result.users.map((account) => (
                  <tr key={account._id} className="border-b border-aeviora-border/70">
                    <td className="px-3 py-4 font-medium">
                      {account.firstName} {account.lastName}
                    </td>
                    <td className="px-3 py-4">{account.email}</td>
                    <td className="px-3 py-4">{account.phone}</td>
                    <td className="px-3 py-4 capitalize">{account.accountStatus}</td>
                    <td className="px-3 py-4 capitalize">{account.role}</td>
                    <td className="px-3 py-4">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(account.createdAt))}
                    </td>
                    <td className="px-3 py-4">
                      {account.role !== "admin" ? (
                        <span className="text-aeviora-slate">Not admin</span>
                      ) : account._id === user?._id ? (
                        <span className="text-aeviora-slate">Current account</span>
                      ) : (
                        <button
                          type="button"
                          className="font-semibold text-red-700 underline disabled:opacity-50"
                          disabled={Boolean(busyUserId)}
                          onClick={() => removeAdminAccess(account)}
                        >
                          {busyUserId === account._id
                            ? "Removing…"
                            : "Remove admin access"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {result.users.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-3 py-8 text-center text-aeviora-slate">
                      No accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="mt-5 flex items-center justify-between border-t border-aeviora-border pt-4 text-sm">
            <p className="text-aeviora-slate">
              Page {result.page} of {Math.max(1, result.totalPages)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary disabled:opacity-50"
                disabled={page >= result.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}