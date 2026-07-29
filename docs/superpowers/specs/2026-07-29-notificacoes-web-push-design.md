# Notificações via Web Push + sininho in-app

Data: 2026-07-29

## Contexto

Hoje quem precisa agir em algo (aprovar um prazo especial, saber que um pedido faturou, que uma GNRE mudou de status, que um pedido novo entrou) só descobre abrindo o app e navegando até a tela certa. Isso já causou o caso do botão "Aprovar prazo" que existia mas ninguém via que precisava clicar nele ([2026-07-27-prazo-e-totalizador-es-design.md](2026-07-27-prazo-e-totalizador-es-design.md) já registrava isso como fora de escopo).

Objetivo: avisar em tempo real, mesmo com o app fechado, usando Web Push (Push API + Service Worker) — sem custo de serviço terceiro, sem exigir conta business (diferente de WhatsApp Business API). Cobre navegadores desktop e Android; iOS Safari só suporta Web Push a partir de PWA instalada na tela de início (fora de escopo verificar isso agora — degradação: sem push, o sininho in-app continua funcionando via polling).

## Eventos cobertos (v1)

| Evento | Quando dispara | Quem recebe |
|---|---|---|
| Prazo especial solicitado | `salvar` grava `prazo_status='pendente'` | admin, vagner, diretoria |
| Prazo decidido (aprovado/rejeitado) | `prazo-decidir` | quem solicitou (`prazo_solicitado_por`) |
| Pedido faturado (completo) | `faturar`, quando o pedido fica com `status==='faturado'` | coordenador dono do pedido |
| GNRE enviada/paga/isenta | `gnre-manage` (marcar enviada/paga/isenta) | coordenador dono do pedido |
| Pedido criado | `salvar` sem `id` (criação) | fabiano, admin |

Todos os destinatários acima são calculados no servidor, reaproveitando as mesmas funções de papel que já existem em `api/_lib/authz.js` (`isAdminLiteral`, `isVagner`, `isDiretoria`, `isFabiano`) — não é uma lista nova de permissões, é a mesma fonte de verdade.

## Banco de dados

Duas tabelas novas, RLS ligado, sem policy — mesmo padrão das 8 tabelas existentes (só `service_role` acessa):

```sql
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (usuario);

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  tipo text not null,
  titulo text not null,
  corpo text,
  url text,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notificacoes (usuario, lida);
```

`usuario` guarda o mesmo valor de `session.user` (`admin`, `vagner`, `fabiano`, `diretoria` ou o nome do coordenador) — é texto livre, igual `coordenador` em `pedidos_vendas`, não FK pra lugar nenhum.

Um usuário pode ter várias linhas em `push_subscriptions` (um por navegador/dispositivo onde aceitou notificação) — todas recebem o push.

## Backend

### Dependência nova

Projeto hoje não tem `package.json`. Cria um na raiz só com `web-push` (lib oficial do protocolo Web Push/VAPID):

```json
{ "dependencies": { "web-push": "^3.6.7" } }
```

Vercel detecta o `package.json` e instala a dependência no build das Functions automaticamente — não muda nada no deploy zero-config do resto do `api/`.

### Chaves VAPID

Geradas uma vez (`web-push.generateVAPIDKeys()`) e guardadas como env vars na Vercel: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:...`). A pública também precisa ser servida pro client (endpoint `GET /api/push/vapid-public-key` ou embutida na resposta de `/api/auth/me`) pra registrar a subscription no navegador.

### `api/_lib/push.js` (novo helper interno)

```js
async function notificar(usuarios, tipo, titulo, corpo, url) {
  // 1. INSERT em `notificacoes`, uma linha por usuário em `usuarios`
  // 2. SELECT push_subscriptions where usuario in (usuarios)
  // 3. Promise.allSettled — webpush.sendNotification() por subscription
  //    - em erro com statusCode 404/410 (subscription expirada/revogada), apaga a linha
  //    - outros erros: loga e segue (uma falha de push não deve derrubar o fluxo principal)
}
```

Chamado de dentro de `api/pedidos-vendas/[acao].js`, depois que a escrita no Supabase já foi confirmada (nunca antes — notificação é best-effort, não pode bloquear nem falhar a ação principal):

- `salvar` (sem `id`, criação nova) → `notificar(['fabiano','admin'], 'pedido_criado', ...)`
- `salvar` (`ped.prazo_status==='pendente'`) → `notificar(['admin','vagner','diretoria'], 'prazo_solicitado', ...)` — `'diretoria'` é o único login desse perfil em `api/_lib/senhas.js` (`SENHAS_HASH['diretoria']`), então `session.user==='diretoria'` já bate 1:1 com o valor gravado em `usuario`.
- `prazo-decidir` → `notificar([prazo_solicitado_por], 'prazo_decidido', ...)`
- `faturar`, quando o resultado fecha o pedido (`status` final `faturado`) → `notificar([pedido.coordenador], 'pedido_faturado', ...)`
- `gnre-manage` (ações que marcam enviada/paga/isenta) → `notificar([pedido.coordenador], 'gnre', ...)`

### Endpoints novos

- `POST /api/push/subscribe` — body `{endpoint, keys:{p256dh, auth}}` (formato padrão da `PushSubscription` do navegador); grava/atualiza em `push_subscriptions` com `usuario = session.user`.
- `POST /api/push/unsubscribe` — body `{endpoint}`; apaga a linha.
- `GET /api/notificacoes` — lista as últimas N (ex: 30) do usuário logado, mais um `count` de não lidas.
- `POST /api/notificacoes/marcar-lida` — body `{id}` ou `{todas:true}`.

Todos exigem sessão (`getSession`), igual o resto do `api/`. `usuario` sempre vem da sessão, nunca do body — mesmo padrão de `audit.js`.

## Frontend

### `sw.js` (novo arquivo na raiz do site)

Registra listener de `push` (mostra `Notification` do SO com `titulo`/`corpo`/`url` vindos do payload) e de `notificationclick` (foca aba existente ou abre `url`).

### Registro e permissão

No `boot()`/pós-login, se `'serviceWorker' in navigator && 'PushManager' in window` e o usuário ainda não decidiu (guardado em `localStorage`), mostra um prompt simples — "Ativar notificações?" — perguntando antes do navegador perguntar (padrão de UX recomendado, evita o usuário negar direto no prompt nativo). Se aceitar: `navigator.serviceWorker.register('/sw.js')` → `registration.pushManager.subscribe({userVisibleOnly:true, applicationServerKey: <VAPID pública>})` → `POST /api/push/subscribe`.

Se recusar ou o navegador não suportar: segue normal, sininho continua funcionando via polling.

### Sininho (`topbar`, ao lado do seletor de período)

Ícone com contador de não lidas (`GET /api/notificacoes` ao carregar o shell + poll a cada ~60s). Clique abre dropdown com a lista; clique numa notificação chama `marcar-lida` e navega pra `url` (reaproveita `navTo`/`show` existentes).

## Pontos em aberto (decidir na hora de implementar, não bloqueiam o design)

- **Lista de usuários "diretoria"**: hoje diretoria é uma flag de sessão (`isDiretoria`), não necessariamente um único `session.user` fixo — precisa confirmar com quantos logins de diretoria existem (`api/_lib/senhas.js`) pra saber se `notificar(['diretoria'], ...)` já resolve ou se precisa expandir pra uma lista.
- **Ícone/nome da notificação do SO**: usar um ícone genérico Clean Tobacco (precisa existir um `.png`/`.svg` servido estaticamente).

## Fora de escopo (v1)

- Preferências por usuário (silenciar um tipo específico de evento) — todos os eventos configurados acima disparam pra todo mundo elegível, sem opt-out granular.
- Notificação por e-mail ou WhatsApp — só Web Push + sininho.
- Retry de push falho além do best-effort do `Promise.allSettled`.
- Expiração/limpeza automática de notificações antigas em `notificacoes` (a tabela cresce indefinidamente; um `delete where created_at < now() - interval '90 days'` pode ser adicionado depois se virar problema).
