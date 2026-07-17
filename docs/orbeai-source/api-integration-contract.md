# orbeAI — contrato inicial da API de integração

> objetivo: definir como os produtos da orbeOne devem conversar com a orbeAI.  
> status: contrato inicial, sujeito a ajustes durante implementação do backend.

## 1. visão geral

A API de integração da orbeAI permite que produtos internos da orbeOne enviem eventos, solicitem contexto, pesquisem memória, criem artifacts e peçam análises inteligentes.

Produtos consumidores previstos:

- orbeRadar
- orbeRisk
- orbeVault
- orbeAuto
- orbeGov
- orbeCorp
- orbeZen
- orbeX
- orbeScience

## 2. domínios sugeridos

Staging:

```text
https://staging-api.ai.orbeone.com.br
```

Produção:

```text
https://api.ai.orbeone.com.br
```

Frontend:

```text
https://ai.orbeone.com.br
```

## 3. autenticação

Integrações usam API key com escopos.

Header:

```http
Authorization: Bearer orbe_live_xxxxxxxxxxxxxxxxx
X-Orbe-Product: orbeRadar
X-Orbe-Workspace: w_1
```

As API keys devem ser armazenadas no backend apenas como hash. O token completo aparece apenas na criação.

## 4. formato padrão de resposta

Sucesso:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "requestId": "req_123",
    "latencyMs": 241,
    "modelRunId": "run_123"
  }
}
```

Erro:

```json
{
  "ok": false,
  "error": {
    "code": "invalid_scope",
    "message": "A API key não possui permissão para esta ação."
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

## 5. códigos de erro iniciais

| código | significado |
| --- | --- |
| `unauthorized` | API key ausente ou inválida. |
| `invalid_scope` | API key sem permissão suficiente. |
| `not_found` | Recurso não encontrado. |
| `validation_error` | Payload inválido. |
| `provider_unavailable` | Provedor de IA indisponível. |
| `rate_limited` | Limite de requisições atingido. |
| `internal_error` | Erro interno inesperado. |

## 6. escopos iniciais

| escopo | uso |
| --- | --- |
| `chat:send` | Enviar mensagens para chat/orbeRouter. |
| `memory:read` | Buscar memórias. |
| `memory:write` | Criar/sugerir memórias. |
| `artifacts:create` | Criar artifacts. |
| `projects:read` | Ler projetos. |
| `integrations:event` | Registrar eventos de produtos. |
| `orberadar:write` | Enviar contexto/eventos do orbeRadar. |
| `orberisk:analyze` | Solicitar análise de risco. |
| `orbevault:secure` | Solicitar classificação/ação segura. |
| `orbeauto:assist` | Solicitar assistência operacional para oficina. |

## 7. endpoints iniciais

### 7.1 healthcheck

```http
GET /health
```

Resposta:

```json
{
  "ok": true,
  "service": "orbeAI API",
  "status": "healthy",
  "version": "0.1.0"
}
```

---

### 7.2 enviar mensagem ao chat

```http
POST /v1/chat/send
```

Escopo necessário:

```text
chat:send
```

Payload:

```json
{
  "workspaceId": "w_1",
  "projectId": "p_1",
  "chatId": "c_1",
  "mode": "strategist",
  "model": "auto",
  "message": "Crie uma abordagem comercial para esta empresa.",
  "context": {
    "product": "orbeRadar",
    "source": "lead_detail",
    "metadata": {
      "leadId": "lead_123"
    }
  }
}
```

Resposta:

```json
{
  "ok": true,
  "data": {
    "chatId": "c_1",
    "messageId": "m_200",
    "responseMessageId": "m_201",
    "content": "Abordagem sugerida...",
    "routerDecision": {
      "provider": "openai",
      "model": "gpt-example",
      "reason": "tarefa estratégica com contexto comercial",
      "fallbackChain": ["anthropic", "gemini", "mock"],
      "qualityTier": "high"
    }
  },
  "meta": {
    "requestId": "req_123",
    "latencyMs": 1340,
    "modelRunId": "run_123"
  }
}
```

---

### 7.3 registrar evento de integração

```http
POST /v1/integrations/events
```

Escopo necessário:

```text
integrations:event
```

Payload:

```json
{
  "workspaceId": "w_1",
  "product": "orbeRadar",
  "event": "lead_scored",
  "entityType": "lead",
  "entityId": "lead_123",
  "summary": "Lead com sinais de dor comercial e baixa maturidade digital.",
  "signals": [
    "site desatualizado",
    "vaga para SDR aberta",
    "crescimento recente no LinkedIn"
  ],
  "payload": {
    "companyName": "Empresa Exemplo LTDA",
    "score": 87,
    "recommendedOffer": "orbe map"
  }
}
```

Resposta:

```json
{
  "ok": true,
  "data": {
    "eventId": "evt_123",
    "memorySuggestions": [
      {
        "label": "Lead com dor comercial detectada",
        "content": "Empresa Exemplo LTDA apresentou sinais de oportunidade para orbe map.",
        "scope": "project",
        "status": "pending"
      }
    ]
  },
  "meta": {
    "requestId": "req_124"
  }
}
```

---

### 7.4 construir contexto

```http
POST /v1/context/build
```

Escopos recomendados:

```text
projects:read
memory:read
```

Payload:

```json
{
  "workspaceId": "w_1",
  "product": "orbeRisk",
  "projectId": "p_3",
  "goal": "analisar risco reputacional de fornecedor",
  "inputs": {
    "companyName": "Fornecedor Exemplo",
    "documentSummary": "Resumo do documento enviado pelo orbeRisk"
  },
  "include": {
    "memories": true,
    "artifacts": true,
    "recentChats": false
  }
}
```

Resposta:

```json
{
  "ok": true,
  "data": {
    "contextId": "ctx_123",
    "summary": "Contexto consolidado para análise de fornecedor.",
    "memories": [],
    "artifacts": [],
    "promptContext": "Texto consolidado para uso no modelo."
  },
  "meta": {
    "requestId": "req_125"
  }
}
```

---

### 7.5 buscar memória

```http
POST /v1/memory/search
```

Escopo necessário:

```text
memory:read
```

Payload:

```json
{
  "workspaceId": "w_1",
  "query": "estratégia comercial da orbeOne para oficinas",
  "product": "orbeAuto",
  "projectId": "p_4",
  "limit": 10,
  "scope": ["global", "project", "product"]
}
```

Resposta:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "mem_123",
        "label": "Estratégia orbeAuto",
        "content": "orbeAuto deve competir com papel e WhatsApp...",
        "scope": "product",
        "product": "orbeAuto",
        "confidence": 0.91
      }
    ]
  },
  "meta": {
    "requestId": "req_126"
  }
}
```

---

### 7.6 criar artifact

```http
POST /v1/artifacts
```

Escopo necessário:

```text
artifacts:create
```

Payload:

```json
{
  "workspaceId": "w_1",
  "projectId": "p_2",
  "product": "orbeRadar",
  "title": "Plano de abordagem — Empresa Exemplo",
  "kind": "plano comercial",
  "content": "# Plano de abordagem\n\n...",
  "source": {
    "type": "integration",
    "product": "orbeRadar",
    "entityId": "lead_123"
  }
}
```

Resposta:

```json
{
  "ok": true,
  "data": {
    "artifactId": "art_123",
    "versionId": "ver_123",
    "title": "Plano de abordagem — Empresa Exemplo"
  },
  "meta": {
    "requestId": "req_127"
  }
}
```

---

### 7.7 análise genérica

```http
POST /v1/analyze
```

Escopos dependem do produto:

```text
orberisk:analyze
orberadar:write
orbevault:secure
orbeauto:assist
```

Payload:

```json
{
  "workspaceId": "w_1",
  "product": "orbeRisk",
  "analysisType": "risk_summary",
  "mode": "document",
  "model": "auto",
  "input": {
    "title": "Análise de fornecedor",
    "text": "Conteúdo resumido do documento ou evidências.",
    "signals": ["CNPJ recém-aberto", "reclamações públicas", "certidão vencida"]
  },
  "outputPreference": {
    "format": "structured_json",
    "createArtifact": true
  }
}
```

Resposta:

```json
{
  "ok": true,
  "data": {
    "summary": "Fornecedor apresenta risco moderado.",
    "riskLevel": "medium",
    "signals": [
      {
        "label": "Certidão vencida",
        "severity": "medium",
        "explanation": "Documento informado está fora da validade."
      }
    ],
    "recommendation": "Solicitar documentação atualizada antes de avançar.",
    "artifactId": "art_456"
  },
  "meta": {
    "requestId": "req_128",
    "modelRunId": "run_456",
    "latencyMs": 1820
  }
}
```

## 8. exemplos por produto

### orbeRadar

Uso principal:

- enviar lead pontuado;
- gerar abordagem personalizada;
- criar plano comercial;
- salvar sinais relevantes como memória.

Endpoints prioritários:

- `POST /v1/integrations/events`
- `POST /v1/chat/send`
- `POST /v1/artifacts`

### orbeRisk

Uso principal:

- consolidar contexto de risco;
- analisar documento/empresa;
- gerar relatório;
- manter evidências auditáveis.

Endpoints prioritários:

- `POST /v1/context/build`
- `POST /v1/analyze`
- `POST /v1/artifacts`

### orbeVault

Uso principal:

- classificar documentos sensíveis;
- sugerir política de armazenamento;
- gerar memória segura;
- apoiar assinatura/organização documental.

Endpoints prioritários:

- `POST /v1/analyze`
- `POST /v1/memory/search`
- `POST /v1/integrations/events`

### orbeAuto

Uso principal:

- ajudar no atendimento;
- resumir orçamento;
- gerar checklist;
- criar mensagens para cliente/seguradora;
- organizar histórico operacional.

Endpoints prioritários:

- `POST /v1/chat/send`
- `POST /v1/artifacts`
- `POST /v1/memory/search`

## 9. versionamento da API

A primeira versão pública interna será `/v1`.

Regras:

- mudanças compatíveis permanecem em `/v1`;
- mudanças incompatíveis devem virar `/v2`;
- payloads devem ser validados por Pydantic;
- erros devem manter formato padrão.

## 10. requisitos de segurança

- Nunca aceitar API key via query string.
- Nunca logar API key completa.
- Salvar hash de API key.
- Validar escopo por endpoint.
- Registrar `requestId` em todo request.
- Registrar produto consumidor.
- Criar rate limit por API key.
- Separar staging e produção.
- Manter chaves de modelo apenas no backend.

## 11. requisitos de observabilidade

Cada chamada relevante deve registrar:

- `requestId`;
- `workspaceId`;
- `product`;
- `apiKeyId`;
- endpoint;
- status;
- latência;
- provider/modelo, se usar IA;
- custo estimado, se aplicável;
- erro, se houver.

## 12. próximos passos do contrato

- Criar backend FastAPI.
- Criar modelos Pydantic para cada payload.
- Criar OpenAPI automaticamente.
- Criar exemplos reais para orbeRadar primeiro.
- Criar collection de teste futuramente.
