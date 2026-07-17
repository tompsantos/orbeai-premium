type RawEnv = Record<string, string | boolean | undefined>;

const rawEnv = ((import.meta as unknown as { env?: RawEnv }).env ?? {}) as RawEnv;

export const AUTH_TOKEN_STORAGE_KEY = "orbeai.auth.access_token";
export const AUTH_USER_STORAGE_KEY = "orbeai.auth.user";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  status: string;
  is_superuser: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  user: AuthUser;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function envString(key: string) {
  const value = rawEnv[key];

  return typeof value === "string" ? value : "";
}

function isDevMode() {
  return rawEnv.DEV === true || rawEnv.DEV === "true";
}

function buildUrl(baseUrl: string, path: string) {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}

export function getAuthToken(): string | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getStoredAuthUser(): AuthUser | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthSession(data: AuthTokenResponse) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.access_token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user));
}

export function clearAuthSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

async function submitAuthRequest(
  baseUrl: string,
  path: "/v1/auth/login" | "/v1/auth/register",
  payload: Record<string, string>,
): Promise<Response> {
  return fetch(buildUrl(baseUrl, path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function parseAuthResponse(response: Response): Promise<AuthTokenResponse | null> {
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as AuthTokenResponse;

  if (!data.access_token) {
    return null;
  }

  setAuthSession(data);

  return data;
}

export async function ensureDevAuthSession(baseUrl: string): Promise<string | null> {
  const existingToken = getAuthToken();

  if (existingToken) {
    return existingToken;
  }

  const enabled = envString("VITE_ORBEAI_DEV_AUTH") === "true";

  if (!isDevMode() || !enabled) {
    return null;
  }

  const email = envString("VITE_ORBEAI_DEV_AUTH_EMAIL");
  const name = envString("VITE_ORBEAI_DEV_AUTH_NAME") || "orbeOne Admin";
  const password = envString("VITE_ORBEAI_DEV_AUTH_PASSWORD");

  if (!baseUrl || !email || !password) {
    return null;
  }

  const loginResponse = await submitAuthRequest(baseUrl, "/v1/auth/login", {
    email,
    password,
  });

  const loginData = await parseAuthResponse(loginResponse);

  if (loginData?.access_token) {
    return loginData.access_token;
  }

  const registerResponse = await submitAuthRequest(baseUrl, "/v1/auth/register", {
    email,
    name,
    password,
  });

  const registerData = await parseAuthResponse(registerResponse);

  if (registerData?.access_token) {
    return registerData.access_token;
  }

  return null;
}
