import { apiClient } from "@/lib/api/client";

export type ProviderCredentialSlug = "openai" | "gemini" | "nvidia";

export interface ProviderCredentialStatus {
  providerSlug: ProviderCredentialSlug;
  displayName: string;
  configured: boolean;
  source: "workspace_vault" | "environment" | "none";
  keyHint?: string;
  modelName: string;
  baseUrl?: string;
  lastTestStatus?: "success" | "failed";
  lastTestedAt?: string;
  lastTestLatencyMs?: number;
  lastErrorCode?: string;
}

interface BackendProviderCredentialStatus {
  provider_slug: ProviderCredentialSlug;
  display_name: string;
  configured: boolean;
  source: "workspace_vault" | "environment" | "none";
  key_hint: string | null;
  model_name: string;
  base_url: string | null;
  last_test_status: "success" | "failed" | null;
  last_tested_at: string | null;
  last_test_latency_ms: number | null;
  last_error_code: string | null;
}

interface BackendProviderCredentialTest {
  provider: BackendProviderCredentialStatus;
  success: boolean;
  message: string;
  latency_ms: number | null;
  model_name: string | null;
}

export interface ProviderCredentialTestResult {
  provider: ProviderCredentialStatus;
  success: boolean;
  message: string;
  latencyMs?: number;
  modelName?: string;
}

const MOCK_PROVIDERS: ProviderCredentialStatus[] = [
  {
    providerSlug: "openai",
    displayName: "OpenAI",
    configured: false,
    source: "none",
    modelName: "gpt-5.5",
  },
  {
    providerSlug: "gemini",
    displayName: "Google Gemini",
    configured: false,
    source: "none",
    modelName: "gemini-3.5-flash",
  },
  {
    providerSlug: "nvidia",
    displayName: "NVIDIA NIM",
    configured: false,
    source: "none",
    modelName: "nvidia/nemotron-3-super-120b-a12b",
    baseUrl: "https://integrate.api.nvidia.com/v1",
  },
];

function toStatus(dto: BackendProviderCredentialStatus): ProviderCredentialStatus {
  return {
    providerSlug: dto.provider_slug,
    displayName: dto.display_name,
    configured: dto.configured,
    source: dto.source,
    keyHint: dto.key_hint ?? undefined,
    modelName: dto.model_name,
    baseUrl: dto.base_url ?? undefined,
    lastTestStatus: dto.last_test_status ?? undefined,
    lastTestedAt: dto.last_tested_at ?? undefined,
    lastTestLatencyMs: dto.last_test_latency_ms ?? undefined,
    lastErrorCode: dto.last_error_code ?? undefined,
  };
}

function requireConnectedBackend(): void {
  if (apiClient.isMock) {
    throw new Error("Conecte a prévia ao backend real antes de salvar credenciais.");
  }
}

export const providerCredentialService = {
  async list(): Promise<ProviderCredentialStatus[]> {
    if (apiClient.isMock) return MOCK_PROVIDERS;
    const response = await apiClient.request<BackendProviderCredentialStatus[]>(
      "/v1/provider-credentials",
    );
    return response.map(toStatus);
  },

  async save(
    providerSlug: ProviderCredentialSlug,
    apiKey: string,
    modelName: string,
  ): Promise<ProviderCredentialStatus> {
    requireConnectedBackend();
    const response = await apiClient.request<BackendProviderCredentialStatus>(
      `/v1/provider-credentials/${providerSlug}`,
      {
        method: "PUT",
        body: JSON.stringify({ api_key: apiKey, model_name: modelName }),
      },
    );
    return toStatus(response);
  },

  async test(providerSlug: ProviderCredentialSlug): Promise<ProviderCredentialTestResult> {
    requireConnectedBackend();
    const response = await apiClient.request<BackendProviderCredentialTest>(
      `/v1/provider-credentials/${providerSlug}/test`,
      { method: "POST" },
    );
    return {
      provider: toStatus(response.provider),
      success: response.success,
      message: response.message,
      latencyMs: response.latency_ms ?? undefined,
      modelName: response.model_name ?? undefined,
    };
  },

  async remove(providerSlug: ProviderCredentialSlug): Promise<void> {
    requireConnectedBackend();
    await apiClient.request<void>(`/v1/provider-credentials/${providerSlug}`, {
      method: "DELETE",
    });
  },
};
