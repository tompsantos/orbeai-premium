export type ModelLifecycle = "experimental" | "approved" | "deprecated" | "mock";

export type ModelCostStatus =
  | "configured"
  | "configured_no_samples"
  | "not_configured"
  | "not_applicable";

export interface ModelTelemetry {
  telemetryVersion: string;
  windowDays: number;
  windowStartedAt: string;
  attemptSampleCount: number;
  executedAttemptCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  timeoutCount: number;
  successRate?: number;
  timeoutRate?: number;
  latencyP50Ms?: number;
  latencyP95Ms?: number;
  runSampleCount: number;
  tokenSampleCount: number;
  inputTokensTotal: number;
  outputTokensTotal: number;
  costStatus: ModelCostStatus;
  costSampleCount: number;
  estimatedCostUsdTotal?: number;
  lastAttemptAt?: string;
}

export interface ModelProfile {
  profileVersion: string;
  profileId: string;
  providerSlug: string;
  providerName: string;
  modelName: string;
  lifecycle: ModelLifecycle;
  executable: boolean;
  workspaceEnabled: boolean;
  providerState: string;
  isReal: boolean;
  capabilities: string[];
  requiredCapabilities: string[];
  optionalCapabilities: string[];
  inputFormats: string[];
  outputFormats: string[];
  streaming: string;
  toolSupport: string;
  contextWindowTokens?: number;
  dataPolicy: string;
  validationStatus: string;
  validatedAt?: string;
  evidenceSources: Record<string, string>;
  telemetry?: ModelTelemetry;
}

export interface WorkspaceModelControl {
  controlVersion: string;
  controlKey: string;
  providerSlug: string;
  providerName: string;
  modelName: string;
  enabled: boolean;
  effectiveState: string;
  stateReason: string;
  executable: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export type ModelProfileCatalogStatus = "ready" | "disabled" | "mock";

export interface ModelProfileCatalog {
  status: ModelProfileCatalogStatus;
  profiles: ModelProfile[];
}
