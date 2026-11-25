export function PublicFilterCheck({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`public-filter-check h-3 w-3 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 8 3 3 7-7" pathLength="1" strokeDasharray="1" />
    </svg>
  );
}
