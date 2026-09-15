import { ExternalLink, Mail, Phone, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest } from "../util/api";

const clinicalPortals = [
  {
    name: "Labcorp Patient",
    description: "Sign in to view Labcorp test results and reports.",
    href: "https://patient.labcorp.com/",
  },
  {
    name: "MyQuest",
    description: "Sign in to access Quest Diagnostics laboratory results.",
    href: "https://myquest.questdiagnostics.com/",
  },
  {
    name: "MyChart",
    description:
      "Use your healthcare organization’s MyChart portal for medical records.",
    href: "https://www.mychart.com/",
  },
];

export default function MainDashboard() {
  const [subscriptionEnabled] = useState(true);
  const [pendingSubscriptionState, setPendingSubscriptionState] =
    useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [notification] = useState(() => {
    const savedNotification = sessionStorage.getItem("aeviora_notification");
    if (savedNotification) sessionStorage.removeItem("aeviora_notification");
    return savedNotification || "";
  });
  const [account, setAccount] = useState(null);
  const [patients, setPatients] = useState([]);
  const [staffError, setStaffError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientUpdate, setPatientUpdate] = useState({ addressLine1: "", city: "", state: "", zipCode: "", timeZone: "" });

  useEffect(() => {
    apiRequest("/api/users/me")
      .then(({ user }) => {
        setAccount(user);
        if (["provider", "admin"].includes(user.role)) return apiRequest("/api/users");
        return null;
      })
      .then((result) => { if (result) setPatients(result.users.filter((user) => ["patient", "user"].includes(user.role))); })
      .catch((error) => setStaffError(error.message));
  }, []);

  function selectPatient(patient) {
    setSelectedPatient(patient);
    setPatientUpdate({ addressLine1: patient.addressLine1 || "", city: patient.city || "", state: patient.state || "", zipCode: patient.zipCode || "", timeZone: patient.timeZone || "" });
  }

  async function updatePatient(event) {
    event.preventDefault();
    try {
      await apiRequest(`/api/users/${selectedPatient._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patientUpdate) });
      setPatients((current) => current.map((patient) => patient._id === selectedPatient._id ? { ...patient, ...patientUpdate } : patient));
      setSelectedPatient(null);
    } catch (error) { setStaffError(error.message); }
  }

  function requestSubscriptionChange(nextState) {
    setPendingSubscriptionState(nextState);
  }

  async function confirmSubscriptionChange() {
    setPaymentLoading(true);
    setPaymentError("");
    try {
      const endpoint = pendingSubscriptionState
        ? "/api/payments/checkout-session"
        : "/api/payments/billing-portal";
      const result = await apiRequest(endpoint, { method: "POST" });
      window.location.assign(result.url);
    } catch (error) {
      setPaymentError(error.message);
      setPendingSubscriptionState(null);
    } finally {
      setPaymentLoading(false);
    }
  }

  async function openBillingPortal() {
    setPaymentLoading(true);
    setPaymentError("");
    try {
      const result = await apiRequest("/api/payments/billing-portal", {
        method: "POST",
      });
      window.location.assign(result.url);
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-aeviora-gold">
          Aeviora account
        </p>
        <h1 className="mt-2 font-display text-4xl">Your account dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Manage your account, payments, and subscription here. Clinical
          information is accessed through your authorized healthcare portals.
        </p>
      </div>
      {notification && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-aeviora-primary/30 bg-aeviora-primary/10 p-4 text-sm text-aeviora-primary"
        >
          {notification}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
                Account profile
              </p>
              <h2 className="mt-2 font-display text-2xl">Your information</h2>
            </div>
            <ShieldCheck className="text-aeviora-primary" aria-hidden="true" />
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Name</dt>
              <dd className="font-semibold">Your profile</dd>
            </div>
            <div>
              <dt className="text-gray-500">Contact</dt>
              <dd className="font-semibold">Your saved details</dd>
            </div>
          </dl>
          <Link to="/profile" className="btn-outline mt-6 inline-flex">
            Manage profile
          </Link>
        </section>

        <section className="card">
          <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
            Payments
          </p>
          <h2 className="mt-2 font-display text-2xl">Payment information</h2>
          <p className="mt-4 text-sm leading-6 text-gray-600">
            Payment methods and receipts will appear here when billing is
            connected to your account.
          </p>
          <button
            type="button"
            onClick={openBillingPortal}
            disabled={paymentLoading}
            className="btn-outline mt-6 disabled:opacity-60"
          >
            Manage payment method
          </button>
        </section>

        <section className="card lg:col-span-2">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
                Subscription
              </p>
              <h2 className="mt-2 font-display text-2xl">
                Aeviora wellness subscription
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Status: <strong>{subscriptionEnabled ? "On" : "Off"}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => requestSubscriptionChange(!subscriptionEnabled)}
              className="btn-primary"
            >
              Turn {subscriptionEnabled ? "off" : "on"} subscription
            </button>
          </div>
        </section>

        <section className="card lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
            External clinical portals
          </p>
          <h2 className="mt-2 font-display text-2xl">
            Get your lab reports and medical records
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            Aeviora does not collect or display clinical records here. Sign in
            directly to the portal used by your laboratory or healthcare
            organization.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {clinicalPortals.map((portal) => (
              <a
                key={portal.name}
                href={portal.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-aeviora-border p-5 transition hover:border-aeviora-primary hover:shadow-sm"
              >
                <span className="flex items-center justify-between gap-3 font-semibold">
                  {portal.name}
                  <ExternalLink size={17} aria-hidden="true" />
                </span>
                <span className="mt-2 block text-sm leading-6 text-gray-600">
                  {portal.description}
                </span>
              </a>
            ))}
          </div>
        </section>

        {account && ["provider", "admin"].includes(account.role) && <section className="card lg:col-span-2">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">{account.role === "admin" ? "Administrator" : "Provider"} workspace</p><h2 className="mt-2 font-display text-2xl">Patient directory</h2></div><span className="text-sm text-gray-500">{patients.length} patient accounts</span></div>
          <p className="mt-3 text-sm leading-6 text-gray-600">{account.role === "admin" ? "Review account details and apply verified profile updates received from authorized sources." : "Select a patient to contact by email or phone. Clinical records remain in their assigned external portals."}</p>
          {staffError && <p role="alert" className="mt-4 text-sm text-red-700">{staffError}</p>}
          <div className="mt-6 grid gap-3">{patients.map((patient) => <div key={patient._id} className="flex flex-col justify-between gap-4 rounded-2xl border border-aeviora-border p-4 sm:flex-row sm:items-center"><div><p className="font-semibold">{patient.firstName} {patient.lastName}</p><p className="text-sm text-gray-500">{patient.email} · {patient.phone}</p></div><div className="flex flex-wrap gap-2"><a href={`mailto:${patient.email}`} className="btn-outline inline-flex items-center gap-2" aria-label={`Email ${patient.firstName} ${patient.lastName}`}><Mail size={16} aria-hidden="true" />Email</a><a href={`tel:${patient.phone}`} className="btn-outline inline-flex items-center gap-2" aria-label={`Call ${patient.firstName} ${patient.lastName}`}><Phone size={16} aria-hidden="true" />Call</a>{account.role === "admin" && <button type="button" onClick={() => selectPatient(patient)} className="btn-secondary">Update profile</button>}</div></div>)}</div>
        </section>}
      </div>

      {pendingSubscriptionState !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-aeviora-black/60 p-6"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscription-confirmation"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
          >
            <h2
              id="subscription-confirmation"
              className="font-display text-2xl"
            >
              Confirm subscription change
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Are you sure you want to turn this subscription{" "}
              {pendingSubscriptionState ? "on" : "off"}?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingSubscriptionState(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSubscriptionChange}
                disabled={paymentLoading}
                className="btn-primary disabled:opacity-60"
              >
                {paymentLoading
                  ? "Opening secure billing..."
                  : "Confirm change"}
              </button>
            </div>
          </div>
        </div>
      )}
      {paymentError && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {paymentError}
        </p>
      )}
      {selectedPatient && <div className="fixed inset-0 z-50 flex items-center justify-center bg-aeviora-black/60 p-6" role="presentation"><form onSubmit={updatePatient} role="dialog" aria-modal="true" aria-labelledby="patient-update-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"><h2 id="patient-update-title" className="font-display text-2xl">Update patient profile</h2><p className="mt-2 text-sm text-gray-600">{selectedPatient.firstName} {selectedPatient.lastName}</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{Object.keys(patientUpdate).map((name) => <label key={name} className="label">{name.replace("Line", " line ").replace(/^[a-z]/, (letter) => letter.toUpperCase())}<input className="input mt-2" value={patientUpdate[name]} onChange={(event) => setPatientUpdate({ ...patientUpdate, [name]: event.target.value })} /></label>)}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setSelectedPatient(null)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Save update</button></div></form></div>}
    </div>
  );
}
