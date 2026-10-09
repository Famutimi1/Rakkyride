import type { ReactNode, FormHTMLAttributes } from "react";
export function FilterToolbar({
  children,
  label = "Filter records",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="filter-bar" role="group" aria-label={label}>
      {children}
    </div>
  );
}
export function FilterForm({
  children,
  className = "",
  ...props
}: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form {...props} className={`report-filters ${className}`}>
      {children}
    </form>
  );
}
export function FormField({
  label,
  children,
  hint,
}: {
  label?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="form-label">
      {label && <span>{label}</span>}
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}
