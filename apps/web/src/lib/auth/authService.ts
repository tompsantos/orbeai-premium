import {
  type AuthTokenResponse,
  clearAuthSession,
  getAuthToken,
  setAuthSession,
} from "./session";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const API_BASE_URL = env.VITE_API_BASE_URL ?? "";

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

export async function login(payload: LoginPayload): Promise<AuthTokenResponse> {
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
