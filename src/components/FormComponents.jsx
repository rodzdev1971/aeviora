import React from "react";

export function FieldError({ error }) {
  if (!error) return null;

  return (
    <p className="mt-1 text-sm font-medium text-red-600">
      {error.message}
    </p>
  );
}

export function Section({ number, title, description, children }) {
  return (
    <section className="rounded-3xl border border-[#c8a55b]/40 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 border-b border-[#c8a55b]/40 pb-4">
        <div className="flex items-center gap-3">
          {number && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-sm font-bold text-[#c8a55b]">
              {number}
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold tracking-wide text-slate-900">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}

export function TextInput({
  label,
  register,
  name,
  error,
  type = "text",
  required = false,
  placeholder = "",
  disabled = false,
  autoComplete,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-sm font-medium text-slate-700"
      >
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      <input
        id={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        {...register(name)}
        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-slate-300 focus:border-[#c8a55b] focus:ring-2 focus:ring-[#c8a55b]/20"
        }`}
      />

      <FieldError error={error} />
    </div>
  );
}

export function TextArea({
  label,
  register,
  name,
  error,
  required = false,
  placeholder = "",
  rows = 4,
  disabled = false,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-sm font-medium text-slate-700"
      >
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      <textarea
        id={name}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name)}
        className={`w-full resize-y rounded-2xl border px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-slate-300 focus:border-[#c8a55b] focus:ring-2 focus:ring-[#c8a55b]/20"
        }`}
      />

      <FieldError error={error} />
    </div>
  );
}

export function SelectInput({
  label,
  register,
  name,
  error,
  required = false,
  children,
  disabled = false,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-sm font-medium text-slate-700"
      >
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      <select
        id={name}
        disabled={disabled}
        {...register(name)}
        className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-slate-300 focus:border-[#c8a55b] focus:ring-2 focus:ring-[#c8a55b]/20"
        }`}
      >
        {children}
      </select>

      <FieldError error={error} />
    </div>
  );
}

export function CheckboxGrid({
  title,
  options,
  register,
  name,
  error,
  columns = "sm:grid-cols-2 lg:grid-cols-3",
}) {
  return (
    <div>
      {title && (
        <p className="mb-3 text-sm font-semibold text-slate-800">
          {title}
        </p>
      )}

      <div
        className={`grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 ${columns}`}
      >
        {options.map((option) => (
          <label
            key={option}
            className="flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-slate-700 shadow-sm transition hover:border-[#c8a55b]/40 hover:bg-[#f7f3ea]"
          >
            <input
              type="checkbox"
              value={option}
              {...register(name)}
              className="mt-1 h-4 w-4 accent-[#c8a55b]"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>

      <FieldError error={error} />
    </div>
  );
}