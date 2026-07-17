# ADR 0001 — runtime cognitivo em serviço separado

## status

aceito

## decisão

O runtime derivado do Hermes será executado em `services/cognition`, separado do `control-api`, embora ambos vivam no mesmo repositório e no mesmo compose.

## razões

- o Hermes usa dependências fixadas e uma superfície grande;
- tarefas longas não devem travar autenticação e persistência;
- o runtime pode escalar de forma independente;
- a fronteira reduz o acoplamento ao upstream;
- a API interna permite evoluir o runtime sem alterar o frontend.

## consequências

- existe uma chamada interna adicional;
- contratos precisam ser versionados;
- streaming será retransmitido pelo `control-api`;
- observabilidade deve correlacionar `request_id`, `chat_id` e `workspace_id`.
