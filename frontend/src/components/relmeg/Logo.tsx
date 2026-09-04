export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M4 34h40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <path
        d="M6 30c0-4.4 4.9-8 11-8s11 3.6 11 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M42 30c0-3.3-3.1-6-7-6s-7 2.7-7 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      <rect x="20" y="6" width="3" height="24" rx="1.5" fill="currentColor" />
      <rect x="25.5" y="12" width="3" height="18" rx="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="21.5" cy="4" r="2.5" fill="currentColor" />
      <circle cx="27" cy="10" r="2" fill="currentColor" opacity="0.7" />
      <path d="M8 42h32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

export function LogoLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary ring-1 ring-primary/25">
        <Logo className="h-6 w-6" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold tracking-tight">RelMeg</span>
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Inteligência legislativa
          </span>
        </span>
      )}
    </div>
  );
}