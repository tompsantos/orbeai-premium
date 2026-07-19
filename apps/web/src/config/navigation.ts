import {
  BookOpen,
  Brain,
  Building2,
  Cpu,
  FlaskConical,
  FolderKanban,
  Gauge,
  KeyRound,
  Library,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  exact?: boolean;
  mobile?: boolean;
};

export type NavigationGroup = {
  id: "main" | "lab" | "admin";
  label: string;
  items: NavigationItem[];
};

export const MAIN_NAV: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", to: "/app", icon: Gauge, exact: true, mobile: true },
  { id: "chat", label: "Chat", to: "/app/chat", icon: MessageSquare, mobile: true },
  { id: "projects", label: "Projetos", to: "/app/projects", icon: FolderKanban, mobile: true },
  { id: "memory", label: "Memória", to: "/app/memory", icon: Brain, mobile: true },
  { id: "knowledge", label: "Conhecimento", to: "/app/research", icon: BookOpen },
  { id: "library", label: "Biblioteca", to: "/app/artifacts", icon: Library },
  { id: "teams", label: "Equipes", to: "/app/agents", icon: Users },
  { id: "workspaces", label: "Espaços", to: "/app/orbeone", icon: Building2 },
];

export const LAB_NAV: NavigationItem[] = [
  { id: "laboratory", label: "Laboratório", to: "/app/models", icon: FlaskConical },
  { id: "model-profiles", label: "Perfis de modelos", to: "/app/model-profiles", icon: Cpu },
];

export const ADMIN_NAV: NavigationItem[] = [
  { id: "administration", label: "Administração", to: "/app/admin", icon: ShieldCheck },
  { id: "provider-credentials", label: "Credenciais de IA", to: "/app/provider-credentials", icon: KeyRound },
  { id: "settings", label: "Configurações", to: "/app/settings", icon: Settings, mobile: true },
];

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  { id: "main", label: "Principal", items: MAIN_NAV },
  { id: "lab", label: "Avançado", items: LAB_NAV },
  { id: "admin", label: "Gestão", items: ADMIN_NAV },
];

export const ALL_NAVIGATION_ITEMS = NAVIGATION_GROUPS.flatMap((group) => group.items);
export const MOBILE_NAVIGATION = ALL_NAVIGATION_ITEMS.filter((item) => item.mobile).slice(0, 5);

export function findNavigationItem(pathname: string) {
  return ALL_NAVIGATION_ITEMS
    .filter((item) => (item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];
}
