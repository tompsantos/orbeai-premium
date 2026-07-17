/**
 * orbeAI — service layer barrel.
 * Reexporta todos os services. Compatível com imports anteriores
 * (chatService, projectService, memoryService, etc.).
 */
export { meService } from "@/lib/api/services/meService";
export { projectService } from "@/lib/api/services/projectService";
export { chatService } from "@/lib/api/services/chatService";
export { artifactService } from "@/lib/api/services/artifactService";
export { memoryService } from "@/lib/api/services/memoryService";
export { agentService } from "@/lib/api/services/agentService";
export { integrationService } from "@/lib/api/services/integrationService";
export { modelService } from "@/lib/api/services/modelService";
export { researchService } from "@/lib/api/services/researchService";
export { adminService } from "@/lib/api/services/adminService";
export { orbeOneService } from "@/lib/api/services/orbeOneService";
export { auditService } from "@/lib/api/services/auditInternal";

export { apiClient, apiConfig } from "@/lib/api/client";
export { ENDPOINTS } from "@/lib/api/endpoints";
