import { useState } from "react";
import ButtonPassword from "./buttonPassword";

export default function PasswordInput({ name = "password", label = "Password", ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <div className="relative">
        <input id={name} name={name} className="input pr-12" type={showPassword ? "text" : "password"}
          minLength={12} autoComplete="new-password" required {...props} />
        <ButtonPassword showPassword={showPassword} showTogglePassword={() => setShowPassword((visible) => !visible)} />
      </div>
    </div>
  );
}
