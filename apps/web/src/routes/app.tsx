import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { getAuthToken } from "@/lib/auth/session";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (!getAuthToken()) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: AppShell,
});
