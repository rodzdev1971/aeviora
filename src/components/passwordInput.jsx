import { useState } from "react";
import ButtonPassword from "./buttonPassword";

export default function PasswordInput({ name = "password", label = "Password", error, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <div className="relative">
        <input id={name} name={name} className="input pr-12" type={showPassword ? "text" : "password"}
          minLength={12} autoComplete="new-password" required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? name + "-error" : undefined} {...props} />
        <ButtonPassword showPassword={showPassword} showTogglePassword={() => setShowPassword((visible) => !visible)} />
      </div>
      {error && <p id={name + "-error"} className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
