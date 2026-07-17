import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { getAuthToken } from "@/lib/auth/session";

const rawEnv =
  ((import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env ?? {});
const mockMode = (rawEnv.VITE_MOCK_MODE ?? "true") !== "false";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (!mockMode && !getAuthToken()) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: AppShell,
});
