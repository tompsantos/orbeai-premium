from __future__ import annotations

import json
import secrets
from collections.abc import Callable
from typing import Any

from app.services.router_real_case_review import (
    CRITICAL_REAL_CASE_CATEGORIES,
    ReviewUpdate,
    RouterRealCaseReviewSession,
)
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse


def _review_html(token: str) -> str:
    token_json = json.dumps(token)
    categories_json = json.dumps(CRITICAL_REAL_CASE_CATEGORIES)
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>revisão local do orbeRouter</title>
  <style>
    :root {{ color-scheme: dark; font-family: system-ui, sans-serif; }}
    body {{ margin: 0; background: #0d1117; color: #e6edf3; }}
    header {{ padding: 16px 20px; border-bottom: 1px solid #30363d; }}
    main {{ display: grid; grid-template-columns: 320px 1fr; min-height: calc(100vh - 74px); }}
    aside {{ border-right: 1px solid #30363d; padding: 12px; overflow: auto; }}
    section {{ padding: 20px; overflow: auto; }}
    button, input, select, textarea {{ font: inherit; }}
    button {{ cursor: pointer; }}
    .candidate {{ width: 100%; text-align: left; margin-bottom: 8px; padding: 10px;
      background: #161b22; color: inherit; border: 1px solid #30363d; border-radius: 8px; }}
    .candidate.accept {{ border-color: #238636; }}
    .candidate.reject {{ border-color: #8b949e; }}
    pre {{ white-space: pre-wrap; background: #161b22; padding: 14px; border-radius: 8px;
      border: 1px solid #30363d; }}
    label {{ display: block; margin-top: 12px; margin-bottom: 4px; }}
    input, select, textarea {{ width: 100%; box-sizing: border-box; padding: 9px;
      background: #0d1117; color: inherit; border: 1px solid #30363d; border-radius: 6px; }}
    input[type="checkbox"] {{ width: auto; margin-right: 8px; }}
    textarea {{ min-height: 110px; }}
    .row {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
    .actions {{ display: flex; gap: 10px; margin-top: 16px; }}
    .primary {{ background: #238636; color: white; border: 0; border-radius: 6px; padding: 10px 14px; }}
    .danger {{ background: #da3633; color: white; border: 0; border-radius: 6px; padding: 10px 14px; }}
    .muted {{ color: #8b949e; }}
    .error {{ color: #ff7b72; white-space: pre-wrap; }}
    @media (max-width: 900px) {{ main {{ grid-template-columns: 1fr; }} aside {{ border-right: 0; }} }}
  </style>
</head>
<body>
<header>
  <strong>revisão local dos casos reais</strong>
  <div class="muted">o conteúdo bruto fica apenas nesta sessão loopback e não é salvo.</div>
</header>
<main>
  <aside>
    <div id="summary" class="muted">carregando...</div>
    <hr>
    <div id="candidates"></div>
  </aside>
  <section>
    <div id="empty">selecione um candidato.</div>
    <div id="editor" hidden>
      <h2 id="candidate-title"></h2>
      <div id="candidate-meta" class="muted"></div>
      <h3>fonte bruta, somente leitura</h3>
      <pre id="raw-source"></pre>
      <div class="row">
        <div>
          <label for="disposition">decisão da revisão</label>
          <select id="disposition">
            <option value="reject">rejeitar</option>
            <option value="accept">aceitar</option>
          </select>
        </div>
        <div>
          <label for="category">classe crítica</label>
          <select id="category"></select>
        </div>
      </div>
      <label for="reviewer">alias do revisor</label>
      <input id="reviewer" value="qa-router">
      <label for="rationale">justificativa</label>
      <textarea id="rationale"></textarea>
      <label for="sanitized">paráfrase sanitizada</label>
      <textarea id="sanitized"></textarea>
      <label for="expected">override de expectativa em json, opcional</label>
      <textarea id="expected" placeholder="null"></textarea>
      <h3>atestes obrigatórios para aceitar</h3>
      <label><input type="checkbox" id="att-personal"> removi nomes pessoais e identificadores desnecessários</label>
      <label><input type="checkbox" id="att-infra"> removi infraestrutura interna e caminhos privados</label>
      <label><input type="checkbox" id="att-verbatim"> a paráfrase não copia o conteúdo original</label>
      <label><input type="checkbox" id="att-expectation"> revisei a expectativa, sem tratar o observado como verdade automática</label>
      <div id="error" class="error"></div>
      <div class="actions">
        <button class="primary" id="save">salvar revisão</button>
        <button class="danger" id="finish">encerrar sessão</button>
      </div>
    </div>
  </section>
</main>
<script>
const token = {token_json};
const categories = {categories_json};
const base = `/session/${{token}}`;
let candidates = [];
let selected = null;

function escapeText(value) {{ return String(value ?? ""); }}

async function request(path, options = {{}}) {{
  const response = await fetch(base + path, {{
    ...options,
    headers: {{ "content-type": "application/json", ...(options.headers || {{}}) }},
    cache: "no-store"
  }});
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || JSON.stringify(payload));
  return payload;
}}

function renderList() {{
  const root = document.getElementById("candidates");
  root.innerHTML = "";
  for (const item of candidates) {{
    const button = document.createElement("button");
    button.className = `candidate ${{item.review.disposition}}`;
    button.textContent = `${{item.source_day}} · ${{item.observed.classification.intent || "sem intenção"}} · ${{item.content_metrics.character_count}} chars`;
    button.onclick = () => selectCandidate(item.candidate_id);
    root.appendChild(button);
  }}
}}

async function refreshSummary() {{
  const summary = await request("/api/summary");
  document.getElementById("summary").textContent =
    `${{summary.accepted_count}} aceitos · ${{summary.reviewed_count}} revisados · cobertura: ${{summary.phase5_coverage_ready ? "pronta" : "pendente"}}`;
}}

async function selectCandidate(candidateId) {{
  selected = candidates.find(item => item.candidate_id === candidateId);
  const source = await request(`/api/source/${{candidateId}}`);
  document.getElementById("empty").hidden = true;
  document.getElementById("editor").hidden = false;
  document.getElementById("candidate-title").textContent = candidateId;
  document.getElementById("candidate-meta").textContent =
    `${{selected.source_action}} · ${{selected.observed.route_kind}} · ${{selected.observed.execution_strategy}}`;
  document.getElementById("raw-source").textContent = source.content;
  document.getElementById("disposition").value = selected.review.disposition;
  document.getElementById("reviewer").value = selected.review.reviewer_alias;
  document.getElementById("rationale").value = selected.review.rationale;
  document.getElementById("sanitized").value = selected.review.sanitized_content || "";
  document.getElementById("category").value = selected.review.category || "";
  document.getElementById("expected").value =
    selected.review.expected_override ? JSON.stringify(selected.review.expected_override, null, 2) : "";
  document.getElementById("att-personal").checked =
    selected.attestation.no_personal_names_or_identifiers;
  document.getElementById("att-infra").checked =
    selected.attestation.no_internal_infrastructure;
  document.getElementById("att-verbatim").checked =
    selected.attestation.not_verbatim;
  document.getElementById("att-expectation").checked =
    selected.attestation.expectation_reviewed;
  document.getElementById("error").textContent = "";
}}

async function saveReview() {{
  if (!selected) return;
  const rawExpected = document.getElementById("expected").value.trim();
  let expected = null;
  try {{
    expected = rawExpected ? JSON.parse(rawExpected) : null;
  }} catch (error) {{
    document.getElementById("error").textContent = "override de expectativa não é json válido.";
    return;
  }}
  const payload = {{
    disposition: document.getElementById("disposition").value,
    reviewer_alias: document.getElementById("reviewer").value,
    rationale: document.getElementById("rationale").value,
    sanitized_content: document.getElementById("sanitized").value || null,
    category: document.getElementById("category").value || null,
    expected_override: expected,
    attestation: {{
      no_personal_names_or_identifiers: document.getElementById("att-personal").checked,
      no_internal_infrastructure: document.getElementById("att-infra").checked,
      not_verbatim: document.getElementById("att-verbatim").checked,
      expectation_reviewed: document.getElementById("att-expectation").checked
    }}
  }};
  try {{
    const saved = await request(`/api/review/${{selected.candidate_id}}`, {{
      method: "PUT",
      body: JSON.stringify(payload)
    }});
    selected.review = saved;
    selected.attestation = payload.attestation;
    renderList();
    await refreshSummary();
    document.getElementById("error").textContent = "salvo.";
  }} catch (error) {{
    document.getElementById("error").textContent = escapeText(error.message);
  }}
}}

async function finishSession() {{
  try {{
    const summary = await request("/api/finish", {{ method: "POST", body: "{{}}" }});
    document.getElementById("error").textContent =
      summary.phase5_coverage_ready ? "sessão encerrada com cobertura pronta." : "sessão encerrada com cobertura pendente.";
  }} catch (error) {{
    document.getElementById("error").textContent = escapeText(error.message);
  }}
}}

async function boot() {{
  const category = document.getElementById("category");
  category.innerHTML = '<option value="">selecione</option>';
  for (const value of categories) {{
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    category.appendChild(option);
  }}
  candidates = await request("/api/candidates");
  renderList();
  await refreshSummary();
}}

document.getElementById("save").onclick = saveReview;
document.getElementById("finish").onclick = finishSession;
boot().catch(error => {{
  document.getElementById("summary").textContent = escapeText(error.message);
}});
</script>
</body>
</html>"""


def create_review_app(
    *,
    session: RouterRealCaseReviewSession,
    token: str,
    shutdown_callback: Callable[[], None] | None = None,
) -> FastAPI:
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware("http")
    async def security_headers(request, call_next):  # type: ignore[no-untyped-def]
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
            "connect-src 'self'; img-src 'none'; frame-ancestors 'none'; base-uri 'none'"
        )
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        return response

    def require_token(provided: str) -> None:
        if not secrets.compare_digest(provided, token):
            raise HTTPException(status_code=404, detail="not found")

    @app.get("/session/{provided}", response_class=HTMLResponse)
    def index(provided: str) -> HTMLResponse:
        require_token(provided)
        return HTMLResponse(_review_html(token))

    @app.get("/session/{provided}/api/candidates")
    def candidates(provided: str) -> list[dict[str, Any]]:
        require_token(provided)
        return session.safe_candidates()

    @app.get("/session/{provided}/api/source/{candidate_id}")
    def source(provided: str, candidate_id: str) -> dict[str, str]:
        require_token(provided)
        try:
            content = session.raw_source(candidate_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="candidate not found") from exc
        return {"candidate_id": candidate_id, "content": content}

    @app.put("/session/{provided}/api/review/{candidate_id}")
    def save_review(
        provided: str,
        candidate_id: str,
        update: ReviewUpdate,
    ) -> dict[str, Any]:
        require_token(provided)
        try:
            review = session.save_review(candidate_id, update)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="candidate not found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return review.model_dump(mode="json")

    @app.get("/session/{provided}/api/summary")
    def summary(provided: str) -> dict[str, Any]:
        require_token(provided)
        return session.summary()

    @app.post("/session/{provided}/api/finish")
    def finish(provided: str) -> dict[str, Any]:
        require_token(provided)
        result = session.finish()
        if shutdown_callback is not None:
            shutdown_callback()
        return result

    return app
