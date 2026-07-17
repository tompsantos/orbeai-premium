import { createFileRoute } from "@tanstack/react-router";

import { ChatExperience } from "@/components/chat/ChatExperience";

export const Route = createFileRoute("/app/chat")({
  head: () => ({ meta: [{ title: "Chat · orbeAI" }] }),
  component: ChatExperience,
});
