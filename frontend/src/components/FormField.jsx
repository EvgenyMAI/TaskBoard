export default function FormField({
  label,
  error,
  children,
}) {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      {children}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
