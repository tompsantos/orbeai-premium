/**
 * orbeAI — ApiClient
 * Cliente HTTP agnóstico.
 * Em mock mode, os services continuam usando dados locais.
 * Com VITE_MOCK_MODE=false e VITE_API_BASE_URL definido, usa backend real.
 */

import { clearAuthSession, ensureDevAuthSession, getAuthToken } from "../auth/session";

export interface ApiClientConfig {
  baseUrl?: string;
  mockMode: boolean;
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const apiConfig: ApiClientConfig = {
  baseUrl: env.VITE_API_BASE_URL ?? "",
  mockMode: (env.VITE_MOCK_MODE ?? "true") !== "false",
};

export class ApiClient {
  constructor(public readonly config: ApiClientConfig = apiConfig) {}

  get isMock() {
    return this.config.mockMode;
  }

  private buildUrl(path: string) {
    const baseUrl = this.config.baseUrl?.replace(/\/$/, "") ?? "";
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    if (!baseUrl) {
      throw new Error("VITE_API_BASE_URL não configurado.");
    }

    return `${baseUrl}${cleanPath}`;
  }

  private async resolveAuthToken() {
    return getAuthToken() ?? ensureDevAuthSession(this.config.baseUrl ?? "");
  }

  private async buildHeaders(init: RequestInit) {
    const headers = new Headers(init.headers);

    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (!headers.has("Authorization")) {
      const token = await this.resolveAuthToken();

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    return headers;
  }

  private async throwResponseError(response: Response): Promise<never> {
    const text = await response.text();
    let data: { detail?: unknown } | null = null;

    try {
      data = text ? (JSON.parse(text) as { detail?: unknown }) : null;
    } catch {
      data = null;
    }

    if (response.status === 401) {
      clearAuthSession();
    }

    const detail =
      typeof data?.detail === "string" ? data.detail : `Erro HTTP ${response.status}`;
    throw new Error(detail);
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (this.config.mockMode) {
      throw new Error(
        "ApiClient.request() não deve ser chamado em mock mode. Use VITE_MOCK_MODE=false para backend real.",
      );
    }

    const response = await fetch(this.buildUrl(path), {
      ...init,
      headers: await this.buildHeaders(init),
    });

    if (!response.ok) {
      return this.throwResponseError(response);
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  }

  async stream(path: string, init: RequestInit = {}): Promise<Response> {
    if (this.config.mockMode) {
      throw new Error("ApiClient.stream() não deve ser chamado em mock mode.");
    }

    const headers = await this.buildHeaders(init);
    if (!headers.has("Accept")) {
      headers.set("Accept", "text/event-stream");
    }

    const response = await fetch(this.buildUrl(path), {
      ...init,
      headers,
    });

    if (!response.ok) {
      return this.throwResponseError(response);
    }

    return response;
  }
}

export const apiClient = new ApiClient();
