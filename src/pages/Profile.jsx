import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../util/api";

const emptyProfile = {
  _id: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  preferredLanguage: "",
  communicationPreference: "",
  timeZone: "",
};

export default function Profile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [accountIdVisible, setAccountIdVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    apiRequest("/api/users/me")
      .then(({ user }) => setProfile({ ...emptyProfile, ...user }))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  function updateProfile(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    const formData = new FormData(event.currentTarget);
    const fields = Object.fromEntries(
      [
        "addressLine1",
        "addressLine2",
        "city",
        "state",
        "preferredLanguage",
        "timeZone",
      ].map((name) => [name, formData.get(name) || ""]),
    );
    fields.zipCode = formData.get("zipCode") || "";
    apiRequest("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    })
      .then(({ user }) => {
        setProfile({ ...emptyProfile, ...user });
        setMessage("Profile saved.");
      })
      .catch((requestError) => setError(requestError.message));
  }

  function changePassword(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    apiRequest("/api/users/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      }),
    })
      .then((result) => {
        sessionStorage.setItem("aeviora_notification", result.message);
        navigate("/dashboard");
      })
      .catch((requestError) => setError(requestError.message));
  }

  function togglePasswordVisibility(name) {
    setVisiblePasswords((current) => ({ ...current, [name]: !current[name] }));
  }

  if (loading) return <p role="status">Loading your profile...</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-aeviora-gold">
          Account profile
        </p>
        <h1 className="mt-2 font-display text-4xl">Manage Your Information</h1>
        {message && (
          <p role="status" className="mt-3 text-aeviora-primary">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-red-700">
            {error}
          </p>
        )}
      </div>

      <form onSubmit={updateProfile} className="card grid gap-5">
        <div>
          <label className="label" htmlFor="accountId">
            Account identifier
          </label>
          <div className="relative">
            <input
              id="accountId"
              className="input bg-gray-100 pr-12"
              type={accountIdVisible ? "text" : "password"}
              value={profile._id}
              readOnly
              aria-describedby="accountIdHelp"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-aeviora-primary"
              onClick={() => setAccountIdVisible((visible) => !visible)}
              aria-label={accountIdVisible ? "Hide account identifier" : "Show account identifier"}
            >
              {accountIdVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          <p id="accountIdHelp" className="mt-1 text-xs text-gray-500">
            Unique identifier for your account.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="firstName">
              First Name
            </label>
            <input
              id="firstName"
              className="input bg-gray-100"
              value={profile.firstName}
              readOnly
            />
          </div>
          <div>
            <label className="label" htmlFor="lastName">
              Last Name
            </label>
            <input
              id="lastName"
              className="input bg-gray-100"
              value={profile.lastName}
              readOnly
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            className="input bg-gray-100"
            type="email"
            value={profile.email}
            readOnly
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone Number
          </label>
          <input
            id="phone"
            className="input bg-gray-100"
            type="tel"
            value={profile.phone}
            readOnly
          />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {["addressLine1", "addressLine2", "city", "state", "zipCode"].map(
            (name) => (
              <div key={name}>
                <label className="label" htmlFor={name}>
                  {name
                    .replace("Line", " line ")
                    .replace(/^[a-z]/, (letter) => letter.toUpperCase())}
                </label>
                <input
                  id={name}
                  name={name}
                  className="input"
                  defaultValue={profile[name]}
                />
              </div>
            ),
          )}
          <div>
            <label className="label" htmlFor="preferredLanguage">
              Preferred Language
            </label>
            <select
              id="preferredLanguage"
              name="preferredLanguage"
              className="input"
              defaultValue={profile.preferredLanguage}
            >
              <option value="">No preference</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="timeZone">
              Time Zone
            </label>
            <input
              id="timeZone"
              name="timeZone"
              className="input"
              defaultValue={profile.timeZone}
            />
          </div>
        </div>
        <button type="submit" className="btn-primary">
          Save Profile
        </button>
      </form>

      <form onSubmit={changePassword} className="card mt-6 grid gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-aeviora-gold">
            Security
          </p>
          <h2 className="mt-2 font-display text-2xl">Change password</h2>
        </div>
        {["currentPassword", "newPassword", "confirmPassword"].map((name) => (
          <div key={name}>
            <label className="label" htmlFor={name}>
              {name === "currentPassword"
                ? "Current password"
                : name === "newPassword"
                  ? "New password"
                  : "Confirm new password"}
            </label>
            <div className="relative">
              <input
                id={name}
                name={name}
                className="input pr-12"
                type={visiblePasswords[name] ? "text" : "password"}
                minLength={name === "currentPassword" ? 1 : 12}
                autoComplete={
                  name === "currentPassword"
                    ? "current-password"
                    : "new-password"
                }
                value={passwords[name]}
                onChange={(event) =>
                  setPasswords({ ...passwords, [name]: event.target.value })
                }
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-aeviora-primary"
                onClick={() => togglePasswordVisibility(name)}
                aria-label={
                  visiblePasswords[name] ? `Hide ${name}` : `Show ${name}`
                }
              >
                {visiblePasswords[name] ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        ))}
        <button type="submit" className="btn-primary">
          Change password
        </button>
      </form>
    </div>
  );
}
