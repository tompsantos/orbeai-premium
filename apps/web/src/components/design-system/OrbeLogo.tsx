import { cn } from "@/lib/utils";

export function OrbeMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="orbeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.58 0.18 256)" />
          <stop offset="60%" stopColor="oklch(0.78 0.13 230)" />
          <stop offset="100%" stopColor="oklch(0.93 0.008 250)" />
        </linearGradient>
        <radialGradient id="orbeCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.93 0.008 250)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="oklch(0.58 0.18 256)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer orbital ring, open at lower-left */}
      <path
        d="M 32 6 A 26 26 0 1 1 10.5 47"
        fill="none"
        stroke="url(#orbeGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Inner thinner ring */}
      <path
        d="M 50 22 A 18 18 0 1 1 18 44"
        fill="none"
        stroke="url(#orbeGrad)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Core */}
      <circle cx="32" cy="32" r="9" fill="url(#orbeCore)" />
      <circle cx="32" cy="32" r="3.2" fill="oklch(0.99 0 0)" opacity="0.95" />
    </svg>
  );
}

export function OrbeWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <OrbeMark size={26} />
      <span className="text-[15px] font-semibold tracking-tight">
        orbe<span className="orbe-gradient-text">AI</span>
      </span>
    </div>
  );
}
