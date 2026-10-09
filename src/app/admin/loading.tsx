export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading staff data"
      className="loading-state"
    >
      <div className="skeleton title-skeleton" />
      <div className="skeleton metrics-skeleton" />
      <div className="skeleton table-skeleton" />
    </div>
  );
}
