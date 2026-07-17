/**
 * orbeAI — Backend client.
 * Em mock mode (default) usa mockBackend. No futuro decidirá entre mock e backend real
 * via apiConfig.mockMode. Toda a UI deve passar por este client quando precisar de
 * lógica que vai eventualmente para o server.
 */
import { apiConfig } from "@/lib/api/client";
import { mockBackend } from "./mockBackend";
import type { BackendContract } from "./contracts";

// TODO Fase 1: criar realBackend que chama TanStack server functions
// (src/server/api/*) via createServerFn. Por enquanto, mock cobre tudo.
export const backendClient: BackendContract = apiConfig.mockMode ? mockBackend : mockBackend;
