import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function controlApiTarget(requestUrl: URL): URL {
  const configuredBase = process.env.ORBE_CONTROL_API_BASE_URL?.trim();
  const target = new URL(configuredBase || "http://orbeai-control-api:8000");
  const upstreamPath = requestUrl.pathname.slice("/api".length) || "/";

  target.pathname = `${target.pathname.replace(/\/$/, "")}${upstreamPath}`;
  target.search = requestUrl.search;

  return target;
}

async function proxyControlApi(request: Request, requestUrl: URL): Promise<Response> {
  try {
    const target = controlApiTarget(requestUrl);
    return await fetch(new Request(target, request));
  } catch (error) {
    console.error("control API proxy failed", error);
    return Response.json(
      { detail: "control API indisponível" },
      { status: 502 },
    );
  }
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const requestUrl = new URL(request.url);

    if (requestUrl.pathname === "/healthz") {
      return new Response("ok\n", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (requestUrl.pathname === "/api" || requestUrl.pathname.startsWith("/api/")) {
      return proxyControlApi(request, requestUrl);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
