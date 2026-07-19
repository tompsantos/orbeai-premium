# fechamento da fase 2 - segurança e acesso público

## estado

- código: concluído no `main` pelo PR #25;
- CI: concluída com sucesso nos jobs `web`, `control-api` e `cognition`;
- documentação: fechamento registrado neste documento;
- ambiente: publicação na `orbeone-center-01` deliberadamente adiada;
- rede: restauração da ACL permanece operação manual do proprietário.

Este fechamento encerra a fase 2 no fluxo de desenvolvimento do GitHub sem afirmar que a release já está ativa na center. Código, CI, publicação e validação no ambiente continuam sendo estados separados.

## escopo entregue

### backend

- `PUBLIC_REGISTRATION_ENABLED` existe com padrão seguro `false`;
- `POST /v1/auth/register` retorna HTTP 403 quando o cadastro público está desabilitado;
- login, sessão, logout e usuários existentes permanecem preservados;
- a habilitação do cadastro continua possível somente por configuração explícita em ambiente controlado.

### frontend

- a tela pública possui somente o fluxo de login;
- formulário e aba de cadastro foram removidos;
- credenciais de desenvolvimento preenchidas foram removidas;
- a interface informa que novos acessos são provisionados pela administração.

### testes

- existe teste específico para o bloqueio do cadastro;
- o teste comprova o retorno HTTP 403;
- o teste comprova que a tentativa bloqueada não cria um usuário utilizável;
- os testes que precisam criar usuários habilitam o cadastro somente no contexto controlado da suíte.

## evidências oficiais

- PR #25: `security: fecha cadastro público da orbeAI`;
- commit de merge: `4b652fda5b4b4a9356bfc1a4751e5a70c79aa450`;
- head validado pela CI: `7895928d59543f05c28dca09c992cc2e5267b05f`;
- workflow: `ci`, run 318, conclusão `success`;
- jobs aprovados: `web`, `control-api` e `cognition`.

Arquivos principais:

- `.env.example`;
- `apps/web/src/routes/login.tsx`;
- `services/control-api/app/core/config.py`;
- `services/control-api/app/routers/auth.py`;
- `services/control-api/tests/conftest.py`;
- `services/control-api/tests/test_auth_api.py`.

## rollout operacional pendente

A publicação não faz parte deste fechamento documental e não deve ser simulada. Quando a atualização da center for autorizada, executar como release imutável do commit exato do `main`.

Checklist de publicação:

1. registrar a release atualmente ativa;
2. criar nova release imutável a partir do commit escolhido do `main`;
3. reconstruir somente `orbeai-web` e `orbeai-control-api`;
4. preservar o serviço `orbeai-cognition` quando não houver alteração nele;
5. validar health dos serviços;
6. validar login de usuário existente;
7. validar que a página pública mostra somente login;
8. validar que `POST /v1/auth/register` retorna HTTP 403;
9. validar chat vivo, streaming SSE e persistência;
10. registrar relatório sanitizado com commit, release, containers e resultado;
11. manter a release anterior pronta para rollback.

## rede pendente

A ACL da Locaweb será restaurada manualmente pelo proprietário, fora do desenvolvimento do router. Depois da restauração, validar:

- SSH apenas pela origem autorizada;
- portas públicas 80 e 443 disponíveis;
- conexão privada da center para o PostgreSQL em `10.10.20.80:5432`;
- ausência de portas públicas desnecessárias;
- health da aplicação após a mudança.

## rollback

Se a publicação futura falhar:

1. reativar a release imutável anterior;
2. reconstruir somente os serviços alterados;
3. validar health, login e chat;
4. confirmar a conexão com o banco;
5. registrar o motivo sanitizado da reversão.

Nenhum arquivo avulso deve ser copiado sobre a release ativa.

## decisão de saída

A fase 2 está concluída no escopo de desenvolvimento do GitHub: implementação, testes, CI, merge e documentação. A publicação na center e a restauração da ACL permanecem tarefas operacionais explícitas e não bloqueiam o início da fase 4.
