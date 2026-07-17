/**
 * orbeAI — Catálogo de endpoints futuros.
 * Mantido como referência para a migração para backend real (Fase 1+).
 */
export const ENDPOINTS = {
  me: "/me",
  workspace: "/me/workspace",
  projects: "/projects",
  project: (id: string) => `/projects/${id}`,
  chats: "/chats",
  chat: (id: string) => `/chats/${id}`,
  chatMessages: (id: string) => `/chats/${id}/messages`,
  chatSend: (id: string) => `/chats/${id}/messages:send`,
  artifacts: "/artifacts",
  artifact: (id: string) => `/artifacts/${id}`,
  artifactVersions: (id: string) => `/artifacts/${id}/versions`,
  memory: "/memory",
  memoryItem: (id: string) => `/memory/${id}`,
  agents: "/agents",
  integrations: "/integrations",
  integration: (slug: string) => `/integrations/${slug}`,
  providers: "/models/providers",
  modelConfig: "/models/config",
  routerResolve: "/models/router:resolve",
  research: "/research",
  researchReport: (id: string) => `/research/${id}`,
  admin: {
    audit: "/admin/audit",
    usage: "/admin/usage",
    flags: "/admin/flags",
    users: "/admin/users",
    workspaces: "/admin/workspaces",
  },
  orbeOneProducts: "/orbeone/products",
} as const;
