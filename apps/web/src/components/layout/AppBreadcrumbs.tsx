import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

import { findNavigationItem } from "@/config/navigation";

export function AppBreadcrumbs() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = findNavigationItem(pathname);

  if (!current || current.exact) return null;

  return (
    <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
      <Link to="/app" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="size-3.5" />
        Dashboard
      </Link>
      <ChevronRight className="size-3.5 text-muted-foreground/50" />
      <span className="font-medium text-foreground" aria-current="page">{current.label}</span>
    </nav>
  );
}
