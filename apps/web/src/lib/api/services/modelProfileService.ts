import { apiClient } from "@/lib/api/client";
import type {
  ModelCostStatus,
  ModelLifecycle,
  ModelProfile,
  ModelProfileCatalog,
  ModelTelemetry,
  WorkspaceModelControl,
} from "@/types/modelProfiles";

interface BackendModelTelemetry {
  telemetry_version: string;
  window_days: number;
  window_started_at: string;
  attempt_sample_count: number;
  executed_attempt_count: number;
  success_count: number;
  failure_count: number;
  skipped_count: number;
  timeout_count: number;
  success_rate: number | null;
  timeout_rate: number | null;
  latency_p50_ms: number | null;
  latency_p95_ms: number | null;
  run_sample_count: number;
  token_sample_count: number;
  input_tokens_total: number;
  output_tokens_total: number;
  cost_status: string;
  cost_sample_count: number;
  estimated_cost_usd_total: number | null;
  last_attempt_at: string | null;
}

interface BackendModelProfile {
  profile_version: string;
  profile_id: string;
  provider_slug: string;
  provider_name: string;
  model_name: string;
  lifecycle: string;
  executable: boolean;
  workspace_enabled: boolean;
  provider_state: string;
  is_real: boolean;
  capabilities: string[];
  required_capabilities: string[];
  optional_capabilities: string[];
  input_formats: string[];
  output_formats: string[];
  streaming: string;
  tool_support: string;
  context_window_tokens: number | null;
  data_policy: string;
  validation_status: string;
  validated_at: string | null;
  evidence_sources: Record<string, string>;
  telemetry: BackendModelTelemetry | null;
}

interface BackendWorkspaceModelControl {
  control_version: string;
  control_key: string;
  provider_slug: string;
  provider_name: string;
  model_name: string;
  enabled: boolean;
  effective_state: string;
  state_reason: string;
  executable: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

function optionalNumber(value: number | null): number | undefined {
  return value ?? undefined;
}

function optionalText(value: string | null): string | undefined {
  return value ?? undefined;
}

function toCostStatus(value: string): ModelCostStatus {
  if (value === "configured") return "configured";
  if (value === "configured_no_samples") return "configured_no_samples";
  if (value === "not_applicable") return "not_applicable";
  return "not_configured";
}

function toLifecycle(value: string): ModelLifecycle {
  if (value === "approved") return "approved";
  if (value === "deprecated") return "deprecated";
  if (value === "mock") return "mock";
  return "experimental";
}

function toTelemetry(dto: BackendModelTelemetry): ModelTelemetry {
  return {
    telemetryVersion: dto.telemetry_version,
    windowDays: dto.window_days,
    windowStartedAt: dto.window_started_at,
    attemptSampleCount: dto.attempt_sample_count,
    executedAttemptCount: dto.executed_attempt_count,
    successCount: dto.success_count,
    failureCount: dto.failure_count,
    skippedCount: dto.skipped_count,
    timeoutCount: dto.timeout_count,
    successRate: optionalNumber(dto.success_rate),
    timeoutRate: optionalNumber(dto.timeout_rate),
    latencyP50Ms: optionalNumber(dto.latency_p50_ms),
    latencyP95Ms: optionalNumber(dto.latency_p95_ms),
    runSampleCount: dto.run_sample_count,
    tokenSampleCount: dto.token_sample_count,
    inputTokensTotal: dto.input_tokens_total,
    outputTokensTotal: dto.output_tokens_total,
    costStatus: toCostStatus(dto.cost_status),
    costSampleCount: dto.cost_sample_count,
    estimatedCostUsdTotal: optionalNumber(dto.estimated_cost_usd_total),
    lastAttemptAt: optionalText(dto.last_attempt_at),
  };
}

function toProfile(dto: BackendModelProfile): ModelProfile {
  return {
    profileVersion: dto.profile_version,
    profileId: dto.profile_id,
    providerSlug: dto.provider_slug,
    providerName: dto.provider_name,
    modelName: dto.model_name,
    lifecycle: toLifecycle(dto.lifecycle),
    executable: dto.executable,
    workspaceEnabled: dto.workspace_enabled,
    providerState: dto.provider_state,
    isReal: dto.is_real,
    capabilities: dto.capabilities,
    requiredCapabilities: dto.required_capabilities,
    optionalCapabilities: dto.optional_capabilities,
    inputFormats: dto.input_formats,
    outputFormats: dto.output_formats,
    streaming: dto.streaming,
    toolSupport: dto.tool_support,
    contextWindowTokens: optionalNumber(dto.context_window_tokens),
    dataPolicy: dto.data_policy,
    validationStatus: dto.validation_status,
    validatedAt: optionalText(dto.validated_at),
    evidenceSources: dto.evidence_sources,
    telemetry: dto.telemetry ? toTelemetry(dto.telemetry) : undefined,
  };
}

function toControl(dto: BackendWorkspaceModelControl): WorkspaceModelControl {
  return {
    controlVersion: dto.control_version,
    controlKey: dto.control_key,
    providerSlug: dto.provider_slug,
    providerName: dto.provider_name,
    modelName: dto.model_name,
    enabled: dto.enabled,
    effectiveState: dto.effective_state,
    stateReason: dto.state_reason,
    executable: dto.executable,
    updatedAt: optionalText(dto.updated_at),
    updatedBy: optionalText(dto.updated_by),
  };
}

export const modelProfileService = {
  async catalog(windowDays = 30): Promise<ModelProfileCatalog> {
    if (apiClient.isMock) {
      return { status: "mock", profiles: [] };
    }

    try {
      const profiles = await apiClient.request<BackendModelProfile[]>(
        `/v1/model-providers/profiles?window_days=${windowDays}`,
      );
      return { status: "ready", profiles: profiles.map(toProfile) };
    } catch (error) {
      if (error instanceof Error && error.message === "Model profiles are disabled") {
        return { status: "disabled", profiles: [] };
      }
      throw error;
    }
  },

  async controls(): Promise<WorkspaceModelControl[] | null> {
    if (apiClient.isMock) return null;
    try {
      const controls = await apiClient.request<BackendWorkspaceModelControl[]>(
        "/v1/model-providers/controls",
      );
      return controls.map(toControl);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Only workspace owners and admins can manage model controls"
      ) {
        return null;
      }
      throw error;
    }
  },

  async setControl(
    providerSlug: string,
    modelName: string,
    enabled: boolean,
  ): Promise<WorkspaceModelControl> {
    const control = await apiClient.request<BackendWorkspaceModelControl>(
      "/v1/model-providers/controls",
      {
        method: "PUT",
        body: JSON.stringify({
          provider_slug: providerSlug,
          model_name: modelName,
          enabled,
        }),
      },
    );
    return toControl(control);
  },
};
