# control-api

Destino do backend atual de `tompsantos/orbeai`.

Este serviço continuará sendo a API pública e a fonte oficial de autenticação, workspaces, chats, mensagens, memória, artifacts, auditoria e custos.

A primeira integração substituirá apenas a execução direta de providers por um cliente interno de `services/cognition`, mantendo fallback temporário para o caminho antigo.
