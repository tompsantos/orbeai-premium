import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon, title, description, action, className,
}: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("orbe-card p-10 text-center flex flex-col items-center gap-3", className)}>
      {icon && (
        <div className="size-12 rounded-2xl orbe-glass flex items-center justify-center text-[var(--orbe-blue)]">
          {icon}
        </div>
      )}
      <div>
        <div className="font-semibold">{title}</div>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>}
      </div>
      {action}
    </div>
  );
}
