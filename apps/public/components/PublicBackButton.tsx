import { ChevronLeft } from "lucide-react";

export function PublicBackButton({ label, onClick, className = "" }: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground ${className}`}>
      <ChevronLeft className="h-4 w-4" aria-hidden />
    </button>
  );
}
