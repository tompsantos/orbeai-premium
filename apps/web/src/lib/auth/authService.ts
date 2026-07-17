import {
  type AuthTokenResponse,
  clearAuthSession,
  getAuthToken,
  setAuthSession,
} from "./session";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const API_BASE_URL = env.VITE_API_BASE_URL ?? "";
const MOCK_MODE = (env.VITE_MOCK_MODE ?? "true") !== "false";

function buildUrl(path: string) {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (!baseUrl) {
    throw new Error("VITE_API_BASE_URL não configurado.");
  }

  return `${baseUrl}${cleanPath}`;
}

async function parseAuthResponse(response: Response): Promise<AuthTokenResponse> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : `Erro HTTP ${response.status}`;

    throw new Error(detail);
  }

  setAuthSession(data as AuthTokenResponse);

  return data as AuthTokenResponse;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
}

function createMockSession(email: string, name = "Tom"): AuthTokenResponse {
  const now = new Date();
  const data: AuthTokenResponse = {
    access_token: `mock_${crypto.randomUUID()}`,
    token_type: "bearer",
    expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    user: {
      id: "usr_mock_tom",
      email,
      name,
      status: "active",
      is_superuser: true,
      last_login_at: now.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  };

  setAuthSession(data);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthTokenResponse> {
  if (MOCK_MODE) {
    return createMockSession(payload.email);
  }

  const response = await fetch(buildUrl("/v1/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseAuthResponse(response);
}

export async function register(payload: RegisterPayload): Promise<AuthTokenResponse> {
  if (MOCK_MODE) {
    return createMockSession(payload.email, payload.name);
  }

  const response = await fetch(buildUrl("/v1/auth/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseAuthResponse(response);
}

export async function logout(): Promise<void> {
  if (MOCK_MODE) {
    clearAuthSession();
    return;
  }

  const token = getAuthToken();

  if (!token) {
    clearAuthSession();
    return;
  }

  try {
    await fetch(buildUrl("/v1/auth/logout"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } finally {
    clearAuthSession();
  }
}
