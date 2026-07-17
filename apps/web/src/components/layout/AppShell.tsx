import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, Bot, Boxes, ChevronsLeft, Command, Compass, FlaskConical, Folders, Home, MessageSquare,
  Network, Search, Settings, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { OrbeWordmark, OrbeMark } from "@/components/design-system/OrbeLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth/authService";
import { getAuthToken, getStoredAuthUser } from "@/lib/auth/session";
import { useEffect, useMemo, useState } from "react";

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Trabalho",
    items: [
      { to: "/app", label: "Cockpit", icon: Home, exact: true },
      { to: "/app/chat", label: "Chat", icon: MessageSquare },
      { to: "/app/projects", label: "Projetos", icon: Folders },
      { to: "/app/artifacts", label: "Artifacts", icon: Sparkles },
      { to: "/app/research", label: "Pesquisa", icon: FlaskConical },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { to: "/app/agents", label: "Agentes", icon: Bot },
      { to: "/app/memory", label: "Memória", icon: Boxes },
      { to: "/app/models", label: "Modelos", icon: Network },
    ],
  },
  {
    label: "Plataforma",
    items: [
      { to: "/app/integrations", label: "Integrações", icon: Workflow },
      { to: "/app/orbeone", label: "Ecossistema", icon: Compass },
      { to: "/app/admin", label: "Admin", icon: ShieldCheck },
      { to: "/app/settings", label: "Ajustes", icon: Settings },
    ],
  },
];

const MOBILE_NAV: NavItem[] = [
  { to: "/app", label: "Cockpit", icon: Home, exact: true },
  { to: "/app/chat", label: "Chat", icon: MessageSquare },
  { to: "/app/projects", label: "Projetos", icon: Folders },
  { to: "/app/memory", label: "Memória", icon: Boxes },
  { to: "/app/settings", label: "Ajustes", icon: Settings },
];

export function AppShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [authUser, setAuthUser] = useState(() => getStoredAuthUser());

  useEffect(() => {
    if (!getAuthToken()) {
      void navigate({ to: "/login" });
      return;
    }

    setAuthUser(getStoredAuthUser());
  }, [navigate]);

  const userInitials = useMemo(() => {
    const source = authUser?.name || authUser?.email || "orbeAI";
    const parts = source
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  }, [authUser]);

  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-[width] duration-200 ease-out",
            collapsed ? "w-[72px]" : "w-[252px]",
          )}
        >
          <div className="h-16 flex items-center px-4 border-b border-[var(--sidebar-border)]">
            {collapsed ? (
              <Link to="/app" className="mx-auto" aria-label="orbeAI"><OrbeMark size={26} /></Link>
            ) : (
              <Link to="/app" aria-label="orbeAI"><OrbeWordmark /></Link>
            )}
          </div>

          <nav className="flex-1 px-2.5 py-4 overflow-y-auto">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label} className={cn(gi > 0 && "mt-5")}>
                {!collapsed && (
                  <div className="px-2.5 mb-1.5 orbe-eyebrow text-[10px]">{group.label}</div>
                )}
                {collapsed && gi > 0 && <div className="orbe-hairline mx-2 mb-3" />}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.to, item.exact);
                    const Icon = item.icon;
                    const link = (
                      <Link
                        key={item.to}
                        to={item.to as any}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-[color-mix(in_oklch,var(--orbe-blue)_12%,transparent)] text-foreground"
                            : "text-muted-foreground hover:bg-[var(--sidebar-accent)] hover:text-foreground",
                          collapsed && "justify-center px-0",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-[var(--orbe-blue)]" />
                        )}
                        <Icon className={cn("size-[18px] shrink-0 transition-colors", active ? "text-[var(--orbe-blue)]" : "group-hover:text-foreground")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                    return collapsed ? (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : link;
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-2.5 border-t border-[var(--sidebar-border)]">
            <Button
              variant="ghost"
              size="sm"
              className={cn("w-full text-muted-foreground hover:text-foreground", collapsed ? "justify-center px-0" : "justify-start")}
              onClick={() => setCollapsed((v) => !v)}
            >
              <ChevronsLeft className={cn("size-4 transition-transform duration-200", collapsed && "rotate-180")} />
              {!collapsed && <span className="ml-2">Recolher</span>}
            </Button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b bg-background/70 backdrop-blur-xl sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6">
            <div className="md:hidden"><OrbeWordmark /></div>

            <div className="hidden lg:flex items-center gap-1.5 text-xs">
              <WorkspaceChip label="workspace" value="orbeOne HQ" />
              <span className="text-muted-foreground/40">/</span>
              <WorkspaceChip label="projeto" value="orbeAI Core" />
              <span className="text-muted-foreground/40">/</span>
              <WorkspaceChip label="modo" value="strategist" tone="blue" />
            </div>

            <div className="relative ml-auto w-full max-w-sm hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos, chats, artifacts…"
                className="pl-9 pr-12 h-9 bg-card/60 border-border/70 focus-visible:bg-card"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Command className="size-2.5" />K
              </kbd>
            </div>

            <Button variant="ghost" size="icon" aria-label="Notificações" className="relative shrink-0">
              <Bell className="size-[18px]" />
              <span className="absolute top-2 right-2 size-1.5 rounded-full bg-[var(--orbe-blue)] ring-2 ring-background" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-1 ring-border hover:ring-[var(--orbe-blue)] transition shrink-0" aria-label="Conta">
                  <Avatar className="size-8"><AvatarFallback className="text-[11px] font-semibold tracking-wide bg-[var(--orbe-blue)]/15 text-[var(--orbe-blue)]">{userInitials}</AvatarFallback></Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span>{authUser?.name ?? "orbeAI"}</span>
                  <span className="text-xs font-normal text-muted-foreground">{authUser?.email ?? "sessão local"} · orbeOne HQ</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/app/settings">Ajustes</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/app/memory">Memória</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/app/admin">Admin cockpit</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      void handleLogout();
                    }}
                  >
                    Sair da orbeAI
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8 animate-orbe-fade">
            <Outlet />
          </main>
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/90 backdrop-blur-xl flex items-center justify-around px-2 py-2">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            return (
              <Link key={item.to} to={item.to as any} className={cn("flex flex-col items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors",
                active ? "text-[var(--orbe-blue)]" : "text-muted-foreground")}>
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
}

function WorkspaceChip({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "blue" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5",
        tone === "blue"
          ? "border-[color-mix(in_oklch,var(--orbe-blue)_26%,transparent)] bg-[color-mix(in_oklch,var(--orbe-blue)_8%,transparent)]"
          : "border-border/70 bg-card/60",
      )}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">{label}</span>
      <span className={cn("font-medium", tone === "blue" && "text-[var(--orbe-blue)]")}>{value}</span>
    </span>
  );
}
