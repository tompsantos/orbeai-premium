import { cn } from "@/lib/utils";
import type { ComponentType, ReactNode } from "react";

export function GlassCard({ className, children, hoverable = true }: { className?: string; children: ReactNode; hoverable?: boolean }) {
  return (
    <div className={cn("orbe-card", hoverable && "orbe-card-hover", "p-5", className)}>
      {children}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div className="min-w-0">
        {eyebrow && <div className="orbe-eyebrow mb-2">{eyebrow}</div>}
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-balance">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl text-pretty leading-relaxed">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusDot({ tone = "neutral", pulse = true }: { tone?: "success" | "warn" | "danger" | "neutral" | "info"; pulse?: boolean }) {
  const map: Record<string, string> = {
    success: "bg-[var(--success)]",
    warn: "bg-[var(--warning)]",
    danger: "bg-destructive",
    info: "bg-[var(--orbe-blue)]",
    neutral: "bg-muted-foreground/50",
  };
  return (
    <span className="relative inline-flex size-2 items-center justify-center">
      {pulse && tone !== "neutral" && (
        <span className={cn("absolute inline-flex size-full rounded-full opacity-60 animate-orbe-pulse", map[tone])} />
      )}
      <span className={cn("relative inline-block size-1.5 rounded-full", map[tone])} />
    </span>
  );
}

const pillMap: Record<string, string> = {
  default: "bg-secondary text-secondary-foreground",
  blue: "bg-[color-mix(in_oklch,var(--orbe-blue)_12%,transparent)] text-[var(--orbe-blue)] border border-[color-mix(in_oklch,var(--orbe-blue)_26%,transparent)]",
  muted: "bg-muted text-muted-foreground border border-transparent",
  success: "bg-[color-mix(in_oklch,var(--success)_14%,transparent)] text-[oklch(0.45_0.12_155)] dark:text-[var(--success)] border border-[color-mix(in_oklch,var(--success)_24%,transparent)]",
  warn: "bg-[color-mix(in_oklch,var(--warning)_18%,transparent)] text-[oklch(0.45_0.1_75)] dark:text-[var(--warning)] border border-[color-mix(in_oklch,var(--warning)_28%,transparent)]",
  danger: "bg-[color-mix(in_oklch,var(--destructive)_12%,transparent)] text-destructive border border-[color-mix(in_oklch,var(--destructive)_26%,transparent)]",
};

export function Pill({ children, tone = "default", className }: { children: ReactNode; tone?: keyof typeof pillMap; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium leading-5", pillMap[tone], className)}>
      {children}
    </span>
  );
}

/** Square glass icon chip used across cards / headers. */
export function IconBadge({
  icon: Icon, size = "md", tone = "blue", className,
}: {
  icon: ComponentType<{ className?: string }>;
  size?: "sm" | "md" | "lg";
  tone?: "blue" | "muted";
  className?: string;
}) {
  const box = size === "sm" ? "size-8 rounded-lg" : size === "lg" ? "size-12 rounded-2xl" : "size-10 rounded-xl";
  const ic = size === "sm" ? "size-4" : size === "lg" ? "size-5" : "size-[18px]";
  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0",
        box,
        tone === "blue"
          ? "orbe-glass text-[var(--orbe-blue)]"
          : "bg-muted/60 text-muted-foreground border border-border/60",
        className,
      )}
    >
      <Icon className={ic} />
    </div>
  );
}

/** Compact metric tile with optional icon + trend. */
export function StatCard({
  label, value, hint, icon: Icon, className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("orbe-card orbe-card-hover p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="orbe-eyebrow">{label}</div>
        {Icon && <Icon className="size-4 text-muted-foreground/70" />}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("orbe-skeleton rounded-md", className)} />;
}
