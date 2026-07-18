# credenciais de providers da orbeAI

## objetivo

permitir que owners e administradores configurem OpenAI, Google Gemini e NVIDIA NIM pela interface sem copiar chaves para chats, commits, logs ou código-fonte.

## acesso

na interface:

```text
Gestão → Credenciais de IA
```

cada provider possui um card separado com:

- campo de chave sempre vazio;
- modelo padrão editável;
- ação `salvar e testar`;
- teste de conexão separado;
- remoção da credencial armazenada no espaço;
- estado sanitizado da última validação.

## segurança

- a chave é enviada somente ao control API autenticado;
- apenas owners e administradores podem listar, salvar, testar ou remover credenciais;
- o backend criptografa o valor antes de persistir;
- o valor criptografado fica no metadata reservado do `WorkspaceSettings`;
- endpoints genéricos de configurações não podem ler nem alterar esse metadata reservado;
- a chave completa nunca é devolvida ao frontend;
- a interface recebe somente origem, modelo, estado e os quatro últimos caracteres;
- auditorias registram provider, modelo, resultado e latência, nunca a chave;
- o campo do navegador é limpo depois do salvamento.

## chave mestre

em produção, configurar uma chave estável e exclusiva no ambiente do control API:

```text
PROVIDER_CREDENTIALS_MASTER_KEY=<valor longo e aleatório>
```

quando essa variável não existe, o backend usa `JWT_SECRET` como compatibilidade. produção deve preferir uma chave mestre dedicada antes de armazenar credenciais reais.

alterar a chave mestre depois de salvar credenciais torna os valores existentes ilegíveis. uma rotação futura deve descriptografar com a chave antiga e criptografar novamente com a nova em uma operação controlada.

## precedência

para cada workspace:

1. credencial do cofre do workspace;
2. credencial do ambiente do servidor;
3. provider indisponível e fallback explícito do router.

credenciais salvas no cofre podem ser usadas pelo workspace mesmo quando não existe chave global no ambiente. a feature flag `real_providers` continua podendo bloquear providers reais para o workspace.

## providers

### OpenAI

- adapter: Responses API;
- modelo inicial sugerido pelo ambiente: `gpt-5.5`;
- o modelo pode ser alterado no card.

### Google Gemini

- adapter: Google Gen AI;
- modelo inicial sugerido pelo ambiente: `gemini-3.5-flash`;
- o modelo pode ser alterado no card.

### NVIDIA NIM

- adapter: API compatível com OpenAI;
- endpoint padrão: `https://integrate.api.nvidia.com/v1`;
- modelo inicial: `nvidia/nemotron-3-super-120b-a12b`;
- o modelo pode ser substituído por outro slug disponível na conta NVIDIA.

## teste de conexão

o botão de teste envia uma solicitação curta ao provider e registra:

- sucesso ou falha;
- modelo que respondeu;
- latência observada;
- classe sanitizada do erro, quando houver.

o conteúdo da chave e a mensagem bruta do provider não entram na auditoria.

## chat

o cabeçalho do chat oferece quatro opções:

- automático;
- OpenAI;
- Gemini;
- NVIDIA.

a preferência escolhida é persistida na conversa existente e enviada ao orbeRouter em cada turno. o resultado final continua registrando decisão, tentativas, fallback, provider, modelo e `model_run_id`.
