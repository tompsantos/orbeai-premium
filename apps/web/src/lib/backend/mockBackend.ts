/**
 * orbeAI — Mock backend isomórfico.
 * Implementa BackendContract usando os services locais. Em mock mode é o backend.
 * Quando o backend real existir, backendClient passa a usar o transport HTTP.
 */
import type { BackendContract } from "./contracts";
import {
  chatService, memoryService, artifactService, auditService,
} from "@/lib/api";
import { resolveRoute } from "@/lib/ai/router";

export const mockBackend: BackendContract = {
  chat: {
    async send({ chatId, prompt, mode, model }) {
      const { decision, response } = await chatService.send(chatId, prompt, { mode, model });
      return {
        decision,
        content: response.content,
        provider: response.provider,
        model: response.model,
        latencyMs: response.latencyMs,
        hints: decision.taskHints,
      };
    },
  },
  router: {
    async resolve(input) { return resolveRoute(input); },
  },
  memory: {
    async save(input) {
      return memoryService.create({
        label: input.label, content: input.content, scope: input.scope,
        source: input.source, reason: input.reason, projectId: input.projectId,
        status: "ativa",
      });
    },
  },
  artifacts: {
    async save(input) {
      return artifactService.create({
        title: input.title, kind: input.kind, content: input.content, projectId: input.projectId,
      });
    },
  },
  audit: {
    async log(input) { auditService.log(input); },
  },
};
