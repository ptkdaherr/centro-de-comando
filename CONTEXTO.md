# Centro de Comando — versão .exe (contexto do projeto)

> ⚠️ **Manter este arquivo atualizado.** Toda vez que mudarmos algo relevante aqui (nova tela, decisão de arquitetura, escolha de framework pro .exe, etc.), atualizar a seção correspondente e registrar no changelog no final. Não deixar esse arquivo ficar desatualizado.

## O que é isso

Esta pasta é uma **segunda linha de desenvolvimento** do projeto "Centro de Comando" (ERP/PSA da agência do usuário). A pasta oficial é `C:\Users\patri\Desktop\SITE\CENTRO-DE-COMANDO` (HTML/CSS/JS vanilla, já com git e em produção incremental). Esta pasta (`Centro de comando - exe`) nasceu de uma versão mais avançada visualmente — `Centro de Comando.dc.html` — feita num framework single-file diferente, com a meta explícita de **virar um executável (.exe)** que abre no PC (e eventualmente no boot).

As duas pastas evoluem em paralelo por enquanto. Não foi decidido ainda se esta substitui a oficial ou se ficam como protótipos separados — tratar como decisão aberta.

## Stack / Framework: "DC"

`Centro de Comando.dc.html` não é HTML puro: é um arquivo único que usa um framework próprio chamado **DC** (Design Component), rodado via `support.js` (53 KB, runtime compilado de TypeScript).

Como funciona:
- Dentro do HTML existe um bloco `<x-dc>` com uma sintaxe XML customizada: `<sc-if>`, `<sc-for>` (controle de fluxo), `<dc-import>` (referência a componentes), `<sc-helmet>` (gerência de `<head>`).
- Interpolação estilo mustache: `{{ variavel }}`, `{{ caminho.aninhado }}`, comparações (`===`, `!==`).
- Handlers de evento (`onClick`, `onChange`, `onInput`...) compilados para eventos React.
- Estilo via `style="{{ objetoCss }}"` ou CSS inline com variáveis interpoladas; pseudo-classes (`style-hover`, `style-focus-within`) viram classes CSS geradas.
- Lógica de componente: classes que estendem `DCLogic` (alias de `StreamableLogic`), com `state`, `setState()`, `renderVals()` — modelo parecido com React clássico, sem Redux/MobX.
- **Sem build step.** O `support.js` faz todo o trabalho em runtime: parse do template, compilação para funções de render React, carregamento de React 18.3.1 / ReactDOM via CDN (unpkg, com SRI hash), hot-reload de componentes (`window.__dcUpdate`), registry de componentes (`window.__dcRegistry`).
- APIs globais expostas: `window.DCLogic`, `window.__dcBoot()`, `window.__dcUpdate(...)`, `window.getDC(nome)`.

Avaliar: é uma dependência de um framework não-padrão (não é Next/Vite/CRA). Isso facilita edição "sem build" mas dificulta portar pra ecossistema React convencional se algum dia quisermos.

## Telas já construídas (no `.dc.html`)

1. **Início** — KPIs (demandas ativas, taxa de entrega, a receber, urgentes), tarefas de hoje, próximas demandas, feed de atividade recente.
2. **Demandas** — Kanban por status (A fazer → Em produção → Em revisão → Entregue) ou por cliente (lanes coloridas). 12 demandas de exemplo.
3. **Pessoal** — Projetos próprios (vlog, portfólio, estudo de AE) + rascunhos de ideias.
4. **Calendário** — Toggle mês/semana, eventos com bolinhas coloridas por cliente.
5. **Clientes** — Cards de clientes ativos (nome, status, próximo vencimento, dia de pagamento), funil de prospecção (Prospecção → Proposta → Ativo → Pausa), lista de prospects.
6. **Financeiro** — KPIs (recebido, a receber, custos, líquido), gráfico de barras de 6 meses, lista de transações.
7. **Salário** — Calculadora de recomendação (58% do disponível), breakdown (recebido − custos − 20% reserva), histórico de 5 meses.
8. **Metas** — 4 cards de progresso (faturamento, entrega no prazo, clientes ativos, horas produtivas).
9. **Ideias** — 6 cards com tags/status/data, botão "transformar em projeto".
10. **Workflow** — Canvas tipo node-graph (7 nós, linhas SVG conectando ENTRADA → TAREFAS → REVISÃO → SAÍDA).
11. **Assistente (chat IA)** — Layout split: sidebar de contexto/sugestões + chat à direita, input com envio (ainda sem IA real conectada — é teaser/mock).

Design: tema escuro, fonte Geist (display + corpo) e Geist Mono, paleta neutra (bg/surface/text em variações) + cores semânticas (accent azul, ok verde, warn âmbar, crit vermelho, info ciano). Visual "macOS app" — bem mais polido que a versão vanilla da pasta oficial.

## Modelo de dados (tudo mockado, em memória)

```
Clients: { id, nome, initials, color, tipo (fixo/freela), valor, pagDia, servico, since }
Demands: { id, title, clientId, status, type, due, flag }
Prospects: { nome, segmento, obs, etapa }
PersonalProjects: { title, status, type, due }
Ideas: { title, status, tags, date }
WorkflowNodes: { left, top, type, title, statusLabel }
```

**Nenhuma persistência implementada ainda** — os dados são state em memória e resetam ao recarregar a página. Isso é a lacuna mais importante antes de qualquer release.

## O que falta implementar (atualizado em 2026-06-17 — pós Fase 1)

**Resolvido na Fase 1:**
- ✅ **Persistência via `localStorage`.** `_persistKeys`/`_storageKey` + `componentDidMount` (restaura) e `setState` sobrescrito (salva a cada mudança). Chave `cdc-exe-state-v1`. Cobre `clients`, `prospectos`, `demands`, `ideias`, `lancamentos`, `wfNodesExtra`.
- ✅ **Bug do drawer corrigido.** `submitDrawer` agora tem branches `lancamento` e `ideia` que de fato adicionam aos arrays `lancamentos`/`ideias` (antes só fechava o drawer e mostrava toast falso).
- ✅ **Ideias com formulário funcional.** Campos título/categoria/observações do drawer de ideia agora têm `value`/`onInput`/`onClick` ligados a state real (antes eram inputs soltos, sem handler nenhum).
- ✅ **Alerta de cliente atrasado.** `clientCards` agora calcula `isLate` com base em `cl.pagDia` (clientes fixos) vs. dia atual (`todayReal`) — status muda pra "Atrasado" com cor `var(--crit)`. Heurística simples (sem histórico de pagamento real ainda).
- ✅ Posição dos nós extras do Workflow: confirmado que já funcionava corretamente (não era bug).

**Resolvido na Fase 2:**
- ✅ **Editar/excluir demandas, clientes, prospectos, lançamentos e ideias.** Padrão `drawerEditId` (null = criar, id = editar) em `submitDrawer`. Cada entidade tem `editX`/`deleteX` (com `window.confirm` antes de apagar). Demandas: edição funciona tanto no kanban por status quanto nas lanes por cliente (cards "Pessoal" continuam não-editáveis via `mkLane(d, false)`).
- ✅ **Drag-and-drop real no kanban** (visão por status). `draggable="true"` + `onDragStart`/`onDragOver`/`onDrop` nativos (HTML5 DnD), atualiza `status` da demanda ao soltar numa coluna.
- ✅ **Busca ⌘K funcional.** Badge do topo agora abre modal (clique ou `Cmd/Ctrl+K`); pesquisa por título/nome em demandas, clientes e prospectos; clicar num resultado abre o drawer de edição já preenchido e navega pra tela certa. `Esc` ou clique fora fecha.

**Resolvido na Fase 3a:**
- ✅ **Backend local real.** `server/index.mjs` substitui o `tools/dev-server.mjs` como forma principal de rodar o app: serve os arquivos estáticos (com o mesmo live reload de sempre) **e** expõe API REST autenticada. `localStorage` deixou de ser fonte de verdade — agora é só cache visual durante a sessão; os dados reais vivem em SQLite no servidor.
- ✅ **Login obrigatório.** Tela de senha antes de qualquer dado carregar (`showLogin`/`authed` no state). Sem sessão válida, `/api/state` responde 401 e nada é exibido.
- ✅ **Banco SQLite** (`server/data/cdc.sqlite`, fora do git) com uma tabela (`state_store`) guardando cada entidade (`clients`, `prospectos`, `demands`, `ideias`, `lancamentos`, `wfNodesExtra`) como uma linha JSON — mesma semântica de "snapshot completo" que já existia no localStorage, só que persistente e compartilhada entre dispositivos.
- ✅ **Senha com hash `scrypt`** (`node:crypto`, zero deps), nunca texto puro. Configurada via `npm run setup` (escreve em `server/.env`, gitignored).
- ✅ **Sessão HTTP-only.** Cookie `cdc_session` (`HttpOnly; SameSite=Lax`), token opaco aleatório guardado em memória no servidor (não sobrevive a restart — reinício do processo força novo login, decisão deliberada pela "segurança máxima").
- ✅ **Rate limit de login.** 5 tentativas erradas por IP → bloqueio de 5 minutos.
- ✅ **`.gitignore`** ganhou `server/.env` e `server/data/*.sqlite` — confirmado via `git status --ignored` que nenhum dos dois aparece como rastreável.

**Resolvido na Fase 3b:**
- ✅ **Assistente conectado a uma IA de verdade (Gemini).** O chat (`Centro de Comando.dc.html`) agora envia o histórico pra `POST /api/chat`, que chama a API do Gemini com *function calling* — o modelo pode responder em texto (perguntas sobre os dados) ou propor uma ação (criar/editar/excluir).
- ✅ **Confirmação obrigatória pra toda ação** (criar, editar OU excluir — não só excluir). O backend nunca executa nada: só decide *o quê* fazer e devolve um `pendingAction` com um resumo em português. O frontend mostra um card com "Confirmar"/"Cancelar" no próprio chat; só depois de clicar em Confirmar a ação é de fato aplicada (`aiApplyAction`, reaproveitando os mesmos helpers de `submitDrawer`/`editX`/`deleteX` já existentes) e salva (mesmo `PUT /api/state` debounced da Fase 3a).
- ✅ **Log de auditoria** (tabela `audit_log` no SQLite): toda ação proposta pela IA é gravada com status `proposed` → `applied` ou `rejected`, com timestamp, nome da ferramenta, argumentos e resumo. Painel "Histórico de ações" na sidebar do Assistente lista isso (`GET /api/audit`).
- ✅ **Resumo das ações sempre identifica o registro pelo nome**, não só pelo id — inclusive em edições (ex: `Editar cliente "Luso Automóveis" → "Luso Automóveis Premium"`), pra quem for confirmar entender exatamente o que vai mudar antes de clicar.
- ✅ **Chave do Gemini nunca chega ao navegador** — fica só em `server/.env` (gitignored), o frontend nunca a vê; todas as chamadas à API do Gemini saem do servidor.
- ✅ **Rate limit do chat:** no máx. 50 mensagens/hora por IP, separado do rate limit de login — protege contra estourar a cota grátis da API por engano (loop, clique acidental repetido, etc.).
- ✅ **Sem chave configurada, o app não trava:** servidor sobe normal, e o chat só avisa (mensagem amigável) que falta configurar, ao tentar enviar uma mensagem.
- ✅ **`npm run setup` estendido** — agora também pergunta (de forma opcional, pode pular com Enter) a chave do Gemini, e preserva a chave existente se você rodar de novo só pra trocar a senha.
- **Desvios conscientes em relação ao plano original:** o plano citava o modelo `gemini-2.5-flash` e autenticação via `?key=` na URL; na implementação usei **`gemini-3.5-flash`** (mais novo, confirmado disponível no tier grátis, e o próprio plano já previa o modelo ser trocável via `GEMINI_MODEL` no `.env`) e autenticação via header `x-goog-api-key` (forma atual recomendada pela documentação oficial, em vez de colocar a chave na URL — mais seguro contra a chave aparecer em logs de acesso).

**Bom ter / próximas sub-fases da Fase 3:**
- 3c — PWA (manifest + service worker) pra acesso mobile mais robusto que só abrir a URL.
- 3d — Empacotamento Tauri (.exe) consumindo o mesmo backend local.
- Heurística de cliente atrasado pode evoluir pra modelo de pagamento real (hoje é só dia-do-mês vs `pagDia`, sem registrar se aquele mês já foi pago).

## Arquitetura de backend (Fase 3a, 2026-06-17)

O app deixou de ser "só frontend com localStorage" e passou a ter um **backend local único** que serve tanto o navegador (PC ou celular, mesma rede) quanto, futuramente, o executável Tauri (Fase 3d) — todos conversando com a mesma fonte de dados.

```
server/
  index.mjs       servidor HTTP: estáticos + live reload + API REST
  db.mjs          SQLite (node:sqlite nativo) — schema + getState()/saveState()
  auth.mjs        hash/verify de senha (scrypt), sessão em cookie HTTP-only, rate limit
  setup.mjs       script de uso único ("npm run setup") — define a senha inicial
  .env            gitignored — guarda APP_PASSWORD_HASH (e, na Fase 3b, GEMINI_API_KEY)
  .env.example    comitado — só os nomes das chaves, sem valores
  data/
    cdc.sqlite    gitignored — banco real, fonte única de verdade dos dados
```

**Rotas da API:**
- `POST /api/login` — `{ password }` → seta cookie de sessão ou 401 (429 se rate-limited).
- `POST /api/logout` — limpa a sessão.
- `GET /api/me` — `{ ok: true|false }`, usado no boot do app pra decidir login vs. dashboard.
- `GET /api/state` — (autenticado) devolve o snapshot salvo (`clients`, `demands`, etc.).
- `PUT /api/state` — (autenticado) grava o snapshot enviado pelo frontend (debounced no cliente, 400ms).

**Decisão de simplificação consciente:** o plano original previa "uma tabela por entidade" no sentido relacional; na prática, como o frontend já trata cada entidade como um array que substitui por completo a cada mudança (nunca faz update parcial de um registro), implementei como uma única tabela `state_store` com uma linha JSON por entidade — mesmo comportamento do `localStorage` de antes, agora durável e compartilhado, sem inventar um mapeamento relacional que nada no app usa hoje. Fácil de evoluir pra tabelas relacionais de verdade se um dia precisar de queries cruzadas (ex: relatórios por cliente).

**Pendência conhecida e deliberada:** como a hospedagem por enquanto é só local/LAN (decisão "local primeiro, decide depois"), o cookie de sessão não tem a flag `Secure` (exigiria HTTPS). Isso é seguro no contexto atual (tráfego não sai da rede local) e fica documentado como algo a resolver junto da decisão de hospedagem pública.

## Arquitetura do Assistente IA (Fase 3b, 2026-06-17)

**Por que a execução da ação acontece no frontend, não no backend:** criar/editar/excluir já é lógica do `Component` em `Centro de Comando.dc.html` (`submitDrawer`, `editCliente`, `deleteDemanda` etc.), que sabe gerar `id`, cores de cliente, ícones de tipo de demanda etc. Em vez de duplicar essa lógica em Node, o backend só decide **o quê** fazer (via Gemini); o frontend, depois da confirmação do usuário, executa a ação reaproveitando essas mesmas funções.

```
Usuário digita no chat
  → frontend envia histórico pra POST /api/chat (autenticado, rate-limited)
  → backend monta contexto (estado atual + data de hoje) + chama Gemini com 15 "tools"
      (create/edit/delete para demanda, cliente, prospecto, lançamento, ideia)
  → Gemini responde com texto e/ou um pedido de function call
  → backend NÃO executa a ação; grava em audit_log (status 'proposed') e devolve
      { reply, pendingAction: { id, tool, args, summary } } pro frontend
  → frontend mostra a resposta da IA + (se houver) um card de ação com Confirmar/Cancelar
  → Confirmar → aiApplyAction(tool, args) → setState → persiste via PUT /api/state
      → POST /api/chat/resolve {id, status:'applied'}
  → Cancelar → POST /api/chat/resolve {id, status:'rejected'}, nada é salvo
```

```
server/
  tools.mjs       15 function declarations (create/edit/delete × 5 entidades) + summarizeAction()
  gemini.mjs      askGemini() — chama generativelanguage.googleapis.com via fetch nativo
  db.mjs          + tabela audit_log (id, created_at, tool, args, summary, status)
  index.mjs       + POST /api/chat, POST /api/chat/resolve, GET /api/audit, rate limit do chat
```

**Modelo:** `gemini-2.5-flash` (configurável via `GEMINI_MODEL` no `.env`, sem alterar código). Auth via header `x-goog-api-key` (não na URL). Sem SDK — só `fetch` nativo do Node, mantendo a filosofia zero-dependências da 3a.

**Histórico da escolha do modelo (2026-06-17):** inicialmente usei `gemini-3.5-flash` (mais novo, encontrado na documentação oficial). No teste em produção com a chave real do usuário, esse modelo retornou erro 503 ("sobrecarregado") de forma consistente — testei direto contra a API do Google com 4 nomes de modelo diferentes e só `gemini-2.5-flash` respondeu 200 de forma estável. Voltei o padrão pra `gemini-2.5-flash` (que é, aliás, o modelo do plano original) e confirmei com testes reais: resposta de texto simples, function calling resolvendo nome→id corretamente ("cliente Luso" → `clientId` certo), e o guard-rail contra invenção de id (perguntou "Padaria do Zé" inexistente → modelo pediu confirmação em vez de inventar um id). Se no futuro `gemini-3.5-flash` se estabilizar, é só trocar `GEMINI_MODEL` no `.env`, sem mexer em código.

**Anti-alucinação:** o `systemInstruction` envia o JSON completo do estado atual e instrui explicitamente "nunca invente um id que não apareça nos dados — se não tiver certeza, pergunte". Vale revisar na prática (pedir uma ação citando cliente/id inexistente) e ajustar esse texto se o modelo inventar algo.

## Roadmap até o .exe

**Empacotamento desktop: decidido — Tauri** (2026-06-17). Núcleo Rust, sem Node exposto ao frontend (menor superfície de ataque) — só falta instalar o toolchain Rust + build tools no Windows (não estavam instalados na máquina até o momento desta decisão). Eletron e NW.js foram descartados.

Pendências antes do .exe:
1. ~~Persistência real~~ ✅ resolvido na Fase 3a (SQLite via backend).
2. ~~Decidir framework de empacotamento~~ ✅ Tauri.
3. ~~Conectar o Assistente a uma IA de fato~~ ✅ resolvido na Fase 3b (Gemini).
4. Acesso mobile robusto via PWA (Fase 3c).
5. Empacotar com Tauri consumindo o backend local (Fase 3d) — exige instalar Rust + build tools antes.
6. Ícone, nome do app, splash, talvez abrir no boot do Windows.

## Arquivos da pasta

- `Centro de Comando.dc.html` — app principal.
- `support.js` — runtime do framework DC.
- `server/` — backend local (Fase 3a): API + SQLite + autenticação. Ver seção "Arquitetura de backend" acima.
- `Canvas.dc.html`, `Canvas-2.dc.html` — templates vazios, provavelmente reservados pra novas telas/testes.
- `ideias/` — 8 prints de referência visual (dashboard, sidebar, calendário, cor, etc.) que guiaram o design.
- `screenshots/` — 2 prints de demonstração do estado atual.
- `.gitignore` — exclui `Timed out questions defaults.zip` (arquivo solto sem relação com o projeto), lixo de OS, pastas de build futuras e os segredos/dados do backend (`server/.env`, `server/data/*.sqlite`).
- `package.json` — scripts: `npm run dev` (servidor estático antigo, sem backend, útil pra ajuste visual rápido), `npm run setup` (define a senha inicial), `npm run server` (servidor principal a partir da Fase 3a — estáticos + API + auth, porta 5174).

## Plano de implementação em fases (decidido em 2026-06-17)

Ordem do mais simples/rápido pro mais difícil/complexo. Cada fase/sub-fase termina com checkpoint: reporto o que mudou e peço OK antes de seguir pra próxima.

**Fase 1 — correções rápidas e fundação de dados** ✅ concluída
**Fase 2 — CRUD completo e interações** ✅ concluída

**Fase 3 — assistente IA real, backend seguro, mobile e .exe** (dividida em sub-fases)
- **3a — Backend local + autenticação + migração de dados** ✅ concluída.
- **3b — Assistente IA real** (Gemini, function calling, confirmação obrigatória de toda ação, log de auditoria) ✅ concluída (esta seção).
- **3c — Acesso mobile** (PWA: manifest + service worker).
- **3d — Empacotamento Tauri (.exe)** consumindo o mesmo backend local.
- *(fora do escopo por enquanto)* hospedagem pública (VPS vs PaaS) — só quando quiser acesso de fora da rede local; aí entra TLS real, domínio, hardening de servidor.

## Changelog

- **2026-06-17** — Repositório git inicializado (branch `main`), `.gitignore` criado, este `CONTEXTO.md` criado, commit inicial com o estado atual do projeto como baseline.
- **2026-06-17** — Lida a fundo a lógica do `.dc.html` e mapeados os gaps reais (seção "O que falta implementar" acima): zero persistência, assistente decorativo, bug no save de lançamento/ideia, sem editar/excluir, sem drag-and-drop no kanban, ⌘K decorativo.
- **2026-06-17** — Dev server local criado (`npm run dev`, porta 5174, live reload) e plano de implementação em 3 fases definido.
- **2026-06-17 — Fase 1 entregue:**
  - Persistência via `localStorage` (chave `cdc-exe-state-v1`): restaura estado ao abrir, salva a cada `setState`. Cobre clientes, prospectos, demandas, ideias, lançamentos e nós extras do workflow.
  - `lancamentos` e `ideias` migrados pro padrão `state` com fallback (`s.X || xDefault`), igual já era feito com `clients`/`demands`/`prospectos`.
  - `submitDrawer` ganhou os branches `lancamento` e `ideia` (antes só fechavam o drawer e mentiam que salvaram). Lançamento calcula label/cor/ícone pelo tipo (receita/despesa); ideia usa a categoria escolhida pra colorir a tag.
  - Drawer de ideia: título, categoria (chips Pessoal/Produto/Conteúdo/Cliente) e observações agora têm handlers reais (`ideiaTituloChange`, `ideiaObsChange`, `ideiaCatSetX`) — antes eram inputs sem `value`/`onInput`.
  - Botões "Nova ideia"/"Capturar ideia" corrigidos pra chamar `openDrawerIdeia` (antes chamavam `openDrawer`, abrindo no modo errado).
  - `clientCards` ganhou alerta de cliente atrasado: clientes fixos com `pagDia` vencido no mês (dia atual > `pagDia`) mostram status "Atrasado" em vermelho (`var(--crit)`).
  - Sintaxe do bloco JS validada via `new Function(...)` sem erros; testado rodando no dev server local (`npm run dev`, porta 5174) com live reload.
- **2026-06-17 — Fase 2 entregue:**
  - **Editar/excluir** em todas as 5 entidades (demanda, cliente, prospecto, lançamento, ideia). Novo campo `drawerEditId` no state: `null` = criando, `id` = editando — `submitDrawer` ramifica update vs. create pra cada modo. Cada card/linha ganhou botão de excluir (ícone X reaproveitado, sem ícone de lixeira no kit) com `window.confirm(...)` antes de remover.
  - **Demandas:** clicar num card (kanban por status ou lanes por cliente) abre o drawer já preenchido pra editar. Cards fixos da tela "Pessoal" (não fazem parte do state real) ficam não-editáveis via segundo parâmetro `mkLane(d, false)`.
  - **Lançamentos:** seed ganhou `id`/`tipo`/`valorRaw`/`dataRaw`; novo `buildLancamento(...)` compartilhado entre criar/editar evita parsear texto já formatado.
  - **Ideias:** seed ganhou `id`/`obs`; nova `ideiasView` (derivada de `ideias`) injeta os handlers de editar/excluir no template.
  - **Drag-and-drop real no kanban** (visão por status): `draggable`, `onDragStart` (card), `onDragOver`/`onDrop` (coluna) via HTML5 DnD nativo — solta o card numa coluna e o `status` da demanda muda de fato.
  - **Busca ⌘K funcional:** `Cmd/Ctrl+K` (listener global em `componentDidMount`, removido em `componentWillUnmount` novo) ou clique no badge do topo abrem um modal central; busca por título/nome em demandas, clientes e prospectos; clicar num resultado abre o drawer de edição certo e troca de tela; `Esc` ou clique no scrim fecha.
  - Sintaxe validada via `node --check` no bloco da classe `Component` (duas vezes, sem erros). Servido e confirmado via dev server local (porta 5174, live reload).
- **2026-06-17 — Fase 3a entregue (backend + autenticação + migração de dados):**
  - Novos arquivos: `server/index.mjs` (HTTP: estáticos + live reload + API), `server/db.mjs` (SQLite via `node:sqlite`, tabela `state_store`), `server/auth.mjs` (hash `scrypt`, sessão em cookie HTTP-only, rate limit por IP), `server/setup.mjs` (`npm run setup`, define a senha inicial), `server/.env.example` (comitado, só nomes de chave).
  - `Centro de Comando.dc.html`: novo gate de login (`showLogin`/`authed`/`loginPassword`/`loginError` no state) — nada do app renderiza sem sessão válida. `componentDidMount` agora chama `/api/me` e, se autenticado, `/api/state`; `setState` sobrescrito faz `PUT /api/state` debounced (400ms) em vez de gravar no `localStorage`.
  - `.gitignore`: adicionado `server/.env` e `server/data/*.sqlite`.
  - `package.json`: novos scripts `npm run setup` e `npm run server` (porta 5174, mesma de sempre); `npm run dev` (servidor antigo, sem backend) continua disponível pra ajustes visuais rápidos.
  - **Verificação completa (todos os 7 passos do plano), rodada ao vivo:** `npm run setup` gravou o hash em `server/.env`; `npm run server` subiu normalmente; 5 senhas erradas bloquearam a 6ª tentativa (429) e a senha certa logou (200 + cookie `HttpOnly`); `PUT`/`GET /api/state` foram e voltaram consistentes; **reiniciei o processo do servidor e os dados continuaram lá** (vêm do SQLite, não da memória) — e a sessão, como esperado, exigiu novo login após o restart; `/server/.env` retorna 403 se alguém tentar acessar pela URL; `git status --ignored` confirmou que `server/.env` e `server/data/` não são rastreáveis.
  - Removi um processo `node` antigo (`tools/dev-server.mjs`, sem backend) que tinha ficado rodando na porta 5174 de uma sessão anterior, pra liberar a porta pro novo `server/index.mjs`.
  - **Senha definida durante o teste: `teste123`** — troque com `npm run setup` se quiser outra (ele pergunta se você quer sobrescrever).
  - IP da sua rede local pra testar do celular (mesma Wi-Fi do PC): `http://192.168.1.2:5174/`.
- **2026-06-17 — Fase 3b entregue (Assistente IA real com ações executáveis):**
  - Novos arquivos: `server/tools.mjs` (15 function declarations + `summarizeAction`), `server/gemini.mjs` (chamada à API do Gemini via `fetch` nativo, function calling).
  - `server/db.mjs`: nova tabela `audit_log` (`logAction`/`updateActionStatus`/`listActions`).
  - `server/index.mjs`: novas rotas `POST /api/chat`, `POST /api/chat/resolve`, `GET /api/audit`, rate limit de 50 msgs/hora/IP pro chat.
  - `server/setup.mjs`: pergunta opcional da `GEMINI_API_KEY`, preservando a chave existente se você só trocar a senha.
  - `Centro de Comando.dc.html`: chat real (`aiSendMessage`, `aiApplyAction`, `aiConfirmAction`, `aiRejectAction`), card de ação com Confirmar/Cancelar, painel "Histórico de ações" na sidebar do Assistente.
  - Ver seção "Arquitetura do Assistente IA (Fase 3b)" acima pra fluxo completo e os dois desvios conscientes em relação ao plano original (modelo `gemini-3.5-flash` em vez de `gemini-2.5-flash`; header `x-goog-api-key` em vez de `?key=` na URL).
  - **Verificação rodada sem chave do Gemini configurada** (ainda não há uma cadastrada): servidor sobe normal; sintaxe de todos os arquivos (`server/*.mjs` e o bloco JS do `.dc.html`) validada via `node --check`; rotas novas (`/api/chat`, `/api/audit`) confirmadas retornando 401 sem sessão; login testado de verdade com a senha de teste (`teste123`, documentada acima) — funcionou, e `/api/chat` respondeu com o aviso amigável de "assistente não configurado" (sem travar nada); `summarizeAction` testado com os 15 tools contra dados de exemplo, todas as frases corretas; round-trip do `audit_log` (inserir → listar → atualizar status → listar) testado direto contra o SQLite real, sem deixar linha de teste para trás.
  - **Ainda pendente (depende de uma chave real do Gemini, que você ainda não tem):** testar uma pergunta de verdade, uma criação/edição/exclusão confirmada de ponta a ponta (aparecer na tela, persistir, e o `audit_log` virar `applied`), o caminho de Cancelar, e o comportamento ao pedir algo com um cliente/id inexistente. Assim que você gerar a chave (passo a passo no changelog enviado no chat) e rodar `npm run setup` de novo, posso testar tudo isso eu mesmo via terminal, sem precisar abrir o navegador.
