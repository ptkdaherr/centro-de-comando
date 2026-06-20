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

**Resolvido na Fase 3c:**
- ✅ **PWA instalável** (manifest + service worker + ícones gerados sem deps). App vira janela standalone (sem barra de URL) no desktop e ganha modo "tela cheia" no iOS via meta tags apple. Ver seção "Arquitetura PWA (Fase 3c)" abaixo — inclui a limitação de secure-context (SW/instalação Android exigem HTTPS; LAN por IP não basta).

**Bom ter / próximas sub-fases da Fase 3:**
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

## Arquitetura PWA (Fase 3c, 2026-06-19)

O app agora é um **PWA instalável**. Objetivo: abrir como app de verdade (janela standalone, ícone próprio, sem barra de URL) no desktop e dar uma experiência "de app" no celular — um passo antes do empacotamento Tauri (3d), reaproveitando o mesmo backend local.

```
manifest.webmanifest    nome, ícones, display:standalone, theme/background color
sw.js                   service worker (network-first + fallback de cache)
icons/
  icon.svg              logo vetorial (favicon + ícone "any" do manifest)
  icon-192.png          ícone 192 (Android/desktop)
  icon-512.png          ícone 512 (splash, lojas)
  icon-maskable-512.png ícone com safe zone (Android adaptive)
  apple-touch-icon.png  180×180 p/ iOS
tools/gen-icons.mjs     gera os PNGs acima a partir do logo (npm run icons)
```

**Ícones gerados sem dependência externa.** `tools/gen-icons.mjs` desenha o logo do app (quadrado com gradiente azul `--accent`→`--accent-2` + quadrado branco) e escreve PNGs reais usando só `node:zlib` (encoder PNG próprio: CRC32 + chunks IHDR/IDAT/IEND, antialias por supersampling 4×4) — mantém a filosofia zero-deps das fases 3a/3b. `npm run icons` regenera tudo; não roda no boot. O `icon.svg` é escrito à mão.

**Service worker — estratégia network-first.** Sempre tenta a rede primeiro (então o live reload do dev e os dados nunca ficam presos em cache) e só cai pro cache quando a rede falha; em navegação offline, serve o app shell (`/`). Na primeira carga online ele cacheia o shell + React/ReactDOM (unpkg) + as fontes (Google), então recargas seguintes ficam resilientes a blips de CDN. **Regra de ouro:** o SW NUNCA intercepta `/api/*` (precisa de cookie de sessão e resposta fresca) nem `/__livereload` (stream SSE keep-alive) — ambos passam direto pro browser. Nome do cache versionado (`cdc-pwa-v1`); o `activate` limpa versões antigas.

**Ligação no app:** tags no `<head>` estático de `Centro de Comando.dc.html` (`<link rel=manifest>`, `theme-color`, `apple-touch-icon`, `apple-mobile-web-app-*`, favicon SVG) + um registro de SW defensivo (`if ('serviceWorker' in navigator)`, no evento `load`). No servidor (`server/index.mjs`) só foi preciso registrar o MIME `.webmanifest` — os ícones, o `sw.js` e o manifest já são servidos pela rota de estáticos existente (a raiz, fora de `server/`).

**Limitação importante — secure context.** Service Worker e a instalação automática do Chrome/Android exigem **HTTPS ou localhost**. No desktop via `http://localhost:5174` funciona 100%. Mas no **celular via `http://192.168.1.2:5174` (IP de LAN sem TLS) o SW não registra** — o registro é defensivo e simplesmente não roda lá, sem erro no console. Mesmo assim, no **iOS** o "Adicionar à Tela de Início" já abre em modo standalone graças às meta tags `apple-mobile-web-app-*` (não depende do SW). Pro Android instalar como app e pro SW rodar no celular, precisa de HTTPS — o que chega "de graça" com o Tauri (3d, que serve via protocolo próprio = secure context) ou com a futura hospedagem com TLS. Ou seja: o PWA está completo e **pronto pra brilhar assim que houver HTTPS**, sem mais trabalho de frontend.

**Verificação (ao vivo, Playwright/Chromium headless contra o `npm run server` real, login `teste123`):** SW registra com escopo `/` e fica ativo; após um reload passa a **controlar** a navegação (`controller` ≠ null); o app renderiza e loga normalmente com o SW no caminho; `/api/me` responde `{ok:true}` fresco — **não interceptado nem cacheado**; o cache `cdc-pwa-v1` guarda os 11 itens do shell + React/ReactDOM + fontes e **nenhuma** rota `/api`/`__livereload`; manifest é JSON válido com os 4 ícones (any + maskable, 512 presente). **Zero erro de console/página.** Os 4 PNGs foram validados à parte (assinatura PNG, IHDR color-type 6/8-bit, IDAT descomprimindo no tamanho exato de scanlines). Script de teste e o `playwright` (instalado com `--no-save`, Chromium já em cache) removidos ao final — working tree limpo.

## Tema claro/escuro (2026-06-19)

O app agora tem **tema claro além do escuro**, alternável e persistente. O escuro continua o padrão.

Como funciona:
- Todas as cores são CSS variables. Os dois conjuntos vivem em `:root, html[data-theme="dark"]` e `html[data-theme="light"]`, num `<style>` no `<head>` **estático** (não no helmet) — assim valem já no boot, antes do React, evitando flash de tema errado. Um script no mesmo `<head>` lê `localStorage['cdc-theme']` e aplica `data-theme` ao `<html>` antes do paint.
- O toggle (botão ☾/☀ no titlebar) alterna `data-theme` no `<html>` + salva no `localStorage` + atualiza o `theme-color` do PWA. O state `mode` controla o ícone (sol no escuro, lua no claro) e o título do botão.
- O sistema de **accent** que já existia (`applyTheme()`, temas Azul/Verde/Roxo/Grafite) continua funcionando por cima: ele seta `--accent*` inline no root, sobrepondo o tema. Por isso o root mantém só o trio `--accent` inline; o resto das variáveis vem do `:root`.
- Além das ~25 variáveis de cor, o tema controla: fundo do app (`--app-bg`/body), o gradiente do root (`--app-gradient`), a scrollbar (`--scrollbar`/`--scrollbar-hover`) e os fios do canvas do Workflow (`--wire`) — tudo que antes era escuro hardcoded.

Quase tudo já era variável (1138 usos de `var(--*)`), então a paleta clara foi uma **redefinição de variáveis**, não uma reescrita. Persistência via `localStorage` (preferência local do dispositivo, não vai pro backend).

**Telas/elementos que eram hardcoded:**
- ✅ **Início** e **badges da sidebar** — resolvidos em 2026-06-19 (ver changelog): KPIs/listas da Início e os badges agora **derivam do `state`** (0/empty quando vazio, dados reais quando há). "Atividades recentes" fica em empty state fixo (ainda não há um log de atividades real no modelo de dados).
- ⏳ **Ainda hardcoded:** provavelmente partes de **Metas/Salário/Calendário** (cards/valores de exemplo) e a data fixa "Segunda · 15 de junho" no header da Início. Conectar conforme for necessário rumo ao app real.

## Arquitetura do executável (Fase 3d, 2026-06-20) — Tauri + Node embutido

O app virou um **.exe autônomo** via Tauri (núcleo Rust + WebView2 do Windows). O backend Node **não foi reescrito**: o .exe embute o `node.exe` e roda o mesmo `server/index.mjs` como sidecar.

```
src-tauri/
  Cargo.toml, build.rs       projeto Rust
  tauri.conf.json            janela criada via código, resources, ícones, bundle NSIS
  src/lib.rs                 inicia o Node sidecar, espera a porta 5174, abre a janela, mata o Node ao fechar
  src/main.rs                entrypoint
  capabilities/default.json  permissões da janela "main"
  ui/index.html              placeholder do frontendDist (a janela carrega http://localhost:5174)
  icons/                     ícones gerados (`tauri icon` a partir do icon-512.png)
  binaries/node.exe          o Node embutido (gitignored — copiar do sistema antes de buildar)
```

**Fluxo (`src/lib.rs`):** no boot, o Rust roda `node server/index.mjs` com `CDC_DATA_DIR` = diretório de dados gravável (`app_data_dir`, ~%APPDATA%), espera a porta 5174 (`wait_port`) e cria a janela em `http://localhost:5174`. Ao fechar, o Node é morto. **Pegadinha resolvida:** o `resource_dir()` do Tauri no Windows retorna caminho *verbatim* (`\\?\C:\...`) que o Node não resolve (`EISDIR lstat 'C:'`) — a função `strip_verbatim` remove o prefixo.

**Backend adaptado** (`server/index.mjs` + `db.mjs`): flag `PACKAGED` (= `CDC_DATA_DIR` setado) desliga o live reload (watcher + snippet injetado) e não abre o navegador; o SQLite vai pra `CDC_DATA_DIR` (gravável) em vez de `server/data`; o `.env` é lido de `CDC_DATA_DIR/.env` se existir, senão do bundle.

**Como buildar:** instalar Rust + MSVC Build Tools (já presentes na máquina — o CONTEXTO antigo dizia que faltavam, mas já estão); copiar `node.exe` pra `src-tauri/binaries/`; `npm install` (traz o `@tauri-apps/cli`); `npm run tauri build` (release) ou `... build --debug` (iteração). Gera `src-tauri/target/.../bundle/nsis/Centro de Comando_0.1.0_x64-setup.exe`.

**Pendências/decisões conscientes:**
- O `.env` (senha + chave Gemini) hoje vai **dentro do bundle** como semente — ok pro uso pessoal local, mas pra distribuir o ideal é um setup no primeiro run (não embute credenciais). Rode `npm run setup` com a SUA senha antes de buildar.
- O `node.exe` (92 MB) é gitignored; quem clonar precisa copiá-lo de novo.
- Validado em `--debug`; o release final (`profile.release` com LTO/strip) gera um .exe menor.

**Site de download** (`site/index.html`): landing page pública e **responsiva (mobile-first)** que apresenta o app e tem o botão de download do instalador. Hospede junto com o `..._x64-setup.exe` (o link aponta pro arquivo ao lado).

## Roadmap até o .exe

**Empacotamento desktop: decidido — Tauri** (2026-06-17). Núcleo Rust, sem Node exposto ao frontend (menor superfície de ataque) — só falta instalar o toolchain Rust + build tools no Windows (não estavam instalados na máquina até o momento desta decisão). Eletron e NW.js foram descartados.

Pendências antes do .exe:
1. ~~Persistência real~~ ✅ resolvido na Fase 3a (SQLite via backend).
2. ~~Decidir framework de empacotamento~~ ✅ Tauri.
3. ~~Conectar o Assistente a uma IA de fato~~ ✅ resolvido na Fase 3b (Gemini).
4. ~~Acesso mobile robusto via PWA~~ ✅ resolvido na Fase 3c (manifest + SW + ícones). Ressalva: no celular via IP HTTP o SW não roda (precisa de HTTPS) — vide limitação de secure-context na seção da Fase 3c.
5. ~~Empacotar com Tauri consumindo o backend local (Fase 3d)~~ ✅ resolvido — .exe autônomo com Node embutido (sidecar). Ver "Arquitetura do executável".
6. Ícone, nome do app, splash, talvez abrir no boot do Windows.

## Arquivos da pasta

- `Centro de Comando.dc.html` — app principal.
- `support.js` — runtime do framework DC.
- `manifest.webmanifest`, `sw.js`, `icons/` — PWA (Fase 3c): manifesto, service worker e ícones. Ver seção "Arquitetura PWA" acima.
- `tools/gen-icons.mjs` — gera os ícones PNG a partir do logo, zero-deps (`npm run icons`).
- `server/` — backend local (Fase 3a): API + SQLite + autenticação. Ver seção "Arquitetura de backend" acima.
- `Canvas.dc.html`, `Canvas-2.dc.html` — templates vazios, provavelmente reservados pra novas telas/testes.
- `ideias/` — 8 prints de referência visual (dashboard, sidebar, calendário, cor, etc.) que guiaram o design.
- `screenshots/` — 2 prints de demonstração do estado atual.
- `.gitignore` — exclui `Timed out questions defaults.zip` (arquivo solto sem relação com o projeto), lixo de OS, pastas de build futuras e os segredos/dados do backend (`server/.env`, `server/data/*.sqlite`).
- `package.json` — scripts: `npm run dev` (servidor estático antigo, sem backend, útil pra ajuste visual rápido), `npm run setup` (define a senha inicial), `npm run server` (servidor principal a partir da Fase 3a — estáticos + API + auth, porta 5174), `npm run icons` (regenera os ícones do PWA).

## Plano de implementação em fases (decidido em 2026-06-17)

Ordem do mais simples/rápido pro mais difícil/complexo. Cada fase/sub-fase termina com checkpoint: reporto o que mudou e peço OK antes de seguir pra próxima.

**Fase 1 — correções rápidas e fundação de dados** ✅ concluída
**Fase 2 — CRUD completo e interações** ✅ concluída

**Fase 3 — assistente IA real, backend seguro, mobile e .exe** (dividida em sub-fases)
- **3a — Backend local + autenticação + migração de dados** ✅ concluída.
- **3b — Assistente IA real** (Gemini, function calling, confirmação obrigatória de toda ação, log de auditoria) ✅ concluída (esta seção).
- **3c — Acesso mobile** (PWA: manifest + service worker) ✅ concluída.
- **3d — Empacotamento Tauri (.exe)** consumindo o mesmo backend local ✅ concluída (Node embutido como sidecar) + landing page de download responsiva.
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
- **2026-06-17 — Painel de demanda virou modal centralizado (era drawer lateral):**
  - `Centro de Comando.dc.html`: o painel de criar/editar demanda (antes um drawer deslizando da direita, `position:absolute; right:0`) agora usa o mesmo padrão do painel de cliente/prospecto/lançamento/ideia — centralizado na tela (`top:50%; left:50%; transform:translate(-50%,-50%)`), cantos arredondados, header com gradiente, scrim com blur de 3px (igual ao painel de cliente, era 2px). Padding do corpo e do rodapé ajustados de 20px pra 24-28px pra acompanhar o outro painel.
  - **Bug encontrado e corrigido na animação `cc-pop`:** ela define `transform: scale(...)` em cada keyframe, o que **sobrescreve por completo** qualquer `transform` estático no elemento (CSS não combina os dois — animação vence). Isso fazia o `translate(-50%,-50%)` virar `translate(0,0)` assim que a animação rodava, deixando o canto superior-esquerdo do painel no centro da tela em vez do painel inteiro centralizado — **esse bug já existia no painel de cliente/prospecto/lançamento/ideia também**, só não tinha sido notado. Corrigido incorporando o `translate(-50%,-50%)` em cada keyframe do `cc-pop` (linha do `<style>` no topo do arquivo). Os dois painéis (demanda e cliente/etc.) usam esse keyframe e foram corrigidos juntos.
  - **Verificação:** subi o backend real (`npm run server`, login com a senha de teste `teste123`), abri "Nova demanda" via Playwright (Chromium headless, instalado só pra esse teste e removido depois) e confirmei por medição de `getBoundingClientRect()` que o centro do painel cai exatamente no centro do viewport (não só visualmente — calculei: x=720 de 1440, igual à metade exata). Screenshot confirmou fundo desfocado e painel arredondado, igual ao painel de cliente.
  - **Não tocado (fora do escopo, mas mesmo bug):** o modal de busca ⌘K (`animation:cc-drawer`, linha ~1244) usa `transform:translateX(-50%)` com a mesma lógica de animação por keyframe — provavelmente tem o mesmo tipo de bug (a animação `cc-drawer` termina em `translateX(0)`, sobrescrevendo o `-50%`). Não mexi porque não foi pedido, mas é um candidato óbvio pra próxima limpeza visual.
- **2026-06-17 — Revertido: demanda voltou a ser drawer lateral (decisão do usuário após ver o resultado centralizado):**
  - `Centro de Comando.dc.html`: desfeitas as mudanças de estrutura/padding do item anterior só pro painel de demanda — voltou a ser `position:absolute; top:0; right:0; bottom:0; width:min(480px,82%)`, scrim `rgba(.55) blur(2px)`, padding `20px`/`16px 20px`, `animation:cc-drawer`. **Mantido:** o fix do keyframe `cc-pop` (continua beneficiando cliente/prospecto/lançamento/ideia, que seguem centralizados) e a divisão em dois blocos `sc-if` separados (`isLateralDrawerOpen` pra demanda, `isEntityPanelOpen` pros outros 4).
- **2026-06-17 — QA completo de todas as telas e interações (a pedido do usuário):**
  - Suite automatizada via Playwright/Chromium headless (script descartável, não commitado) contra o backend real (`npm run server`, login `teste123`), cobrindo: login, dashboard Início, abrir/preencher/criar/editar/excluir demanda (confirmando que abre como drawer lateral encostado na direita), kanban "Por status" e drag-and-drop real entre colunas (simulado via `DragEvent`/`DataTransfer` nativos, já que Playwright não dispara HTML5 DnD nativamente), Clientes (confirmando painel centralizado, criar/excluir), Ideias (criar/excluir), busca ⌘K, Financeiro (modal de lançamento centralizado), Assistente (mensagem real enviada e respondida pela API do Gemini em ~1s, com resposta contextual correta sobre os dados reais do app — confirma que a Fase 3b está 100% funcional, não só "não configurado" como nas verificações anteriores sem chave), Workflow (adicionar nó), Calendário, Salário, Metas, Pessoal, recolher/expandir sidebar.
  - **Resultado: 28/28 passos OK, zero erros de console/página.** Único problema encontrado durante os testes (não do app, do meu script): o modal de Lançamento não fecha com `Esc` — só o modal de busca tem esse atalho — então fechar com `Esc` deixa o scrim bloqueando cliques subsequentes; troquei pra fechar clicando em "Cancelar". Isso não é um bug do app, é uma limitação real (Esc não fecha os modais de cliente/prospecto/lançamento/ideia/demanda, só o de busca) — se quiser, posso adicionar esse atalho nos outros modais.
  - Dados de teste ("QA Cliente Teste", "QA Teste - demanda automatizada") ficaram residuais no banco real depois de uma primeira rodada que travou no meio (bug no meu script de teste, dois listeners de diálogo duplicados); limpos manualmente depois via `PUT /api/state` direto na API, sem tocar nos dados reais do usuário (`Cliente Teste`, `jet ski lanchas`, `Demanda Teste`, `ada`, `fs`, `sgsg` continuam intactos).
- **2026-06-17 — Mais motion/interatividade (a pedido do usuário):**
  - `Centro de Comando.dc.html`: novos keyframes `cc-rise` (entrada sutil fade+translateY, usada em listas/cards), `cc-dot` (pulso pra indicador de "pensando"), `cc-search-pop` (entrada do modal de busca).
  - **Stagger reveal** (entrada escalonada por item, via `{{ $index }}` do `sc-for` multiplicado em `animation-delay`) nos: KPIs e listas da tela Início (demandas de hoje/futuras/atividades), cards do kanban "Por status" e "Por cliente", lista de clientes, grid de ideias, resultados da busca ⌘K.
  - **Feedback visual de drag-and-drop no kanban:** card arrastado fica com opacidade reduzida (`draggingId` no state); coluna de destino ganha fundo azulado + borda pontilhada accent enquanto o mouse está sobre ela (`dragOverCol` no state, via `onDragEnter`/`onDragLeave` novos). Limpa tudo em `onDragEnd`/`onDrop`.
  - **Feedback de clique (`style-active`, pseudo-classe genérica já suportada pelo framework DC)** nos botões de CTA principais (accent, 13 ocorrências), nos itens da sidebar, nos chips de prioridade da demanda, no checkbox do checklist e nos resultados da busca — tudo com leve `scale()` ao pressionar.
  - **Indicador ativo da sidebar** ganhou transição suave de cor/fundo (`transition:background .16s ease, color .16s ease`) em vez de troca instantânea ao navegar entre telas.
  - **"Pensando…" do Assistente** virou 3 pontinhos pulsando (`cc-dot`, defasados 150ms entre si) no lugar do texto estático.
  - **Bug de centralização corrigido no modal de busca ⌘K:** mesmo problema do `cc-pop` (animação `cc-drawer` sobrescrevia o `translateX(-50%)`, deixando a busca desalinhada à esquerda do centro). Criei `cc-search-pop` dedicado (não reaproveitei `cc-drawer` porque esse keyframe também serve o drawer lateral de demanda, que precisa do efeito de slide original sem nenhum translate fixo — misturar os dois quebraria um ou outro).
  - **Verificação:** suite Playwright completa re-executada após as mudanças (login, demanda lateral + criar/arrastar/editar/excluir, cliente centralizado + criar/excluir, busca ⌘K agora com dx=0 do centro exato, assistente respondendo) — **5/5 OK, zero erros de console**. Screenshot confirmou visualmente o destaque azul na coluna de destino durante o drag e os pontinhos animados no chat.
- **2026-06-18 — Bug raiz encontrado: hover não funcionava em lugar nenhum do app (apesar de já existirem 79 usos de `style-hover` no código):**
  - **Causa:** o framework DC (`support.js`) gera o CSS de `style-hover`/`style-active`/`style-focus` como uma classe comum (`.scpN:hover{...}`), **sem `!important`**. Como cada card já define a mesma propriedade (`background`, `border-color`, `box-shadow`, `transform`...) direto no atributo `style=""` inline, e estilo inline sempre vence regra de classe em CSS (não importa pseudo-classe nem especificidade), a troca no hover era calculada mas nunca chegava a ser desenhada — confirmado com Playwright medindo `getComputedStyle` antes/depois do hover em vários elementos (cor de fundo do botão "Nova demanda" não mudava nunca, por exemplo). Em cards com animação de entrada (`animation:cc-rise ... both`), o problema é ainda mais forte: o estado final da animação tem prioridade maior que estilo inline normal, então mesmo se a regra de hover não tivesse esse problema, a animação sozinha já travaria o `transform` no valor final.
  - **Correção (uma linha, na raiz, beneficia o app inteiro):** em `support.js`, função `createPseudoSheet` (gera as classes `.scpN:hover` etc.), cada declaração do CSS gerado agora recebe `!important` antes de ser inserida na stylesheet. Pela ordem de prioridade do CSS (important-author > animation > normal-author/inline), isso faz a regra de hover vencer tanto o estilo inline normal quanto o estado "congelado" das animações de entrada — sem precisar editar nenhum dos 79+ usos existentes de `style-hover` no `.dc.html`.
  - **Verificado com Playwright (medindo `getComputedStyle` real antes/depois do `.hover()`, não só visual):** botão "Nova demanda" (`background-color`: `rgb(82,133,240)` → `rgb(63,111,224)`, mudou); card de KPI da tela Início (`transform`: `matrix(1,0,0,1,0,0)` → `matrix(1,0,0,1,0,-3)`, e `box-shadow`: sh-1 → sh-2, ambos mudaram mesmo com a animação `cc-rise` ativa). Sintaxe de `support.js` e do bloco JS do `.dc.html` validada (`node --check` / `new Function`).
- **2026-06-18 — Mais interação visual no hover, a pedido do usuário ("quero que mexa nos cards, nas demandas, tudo ao passar o mouse tenha interação"):**
  - Cards que já tinham hover sutil (borda + 1px) ganharam um "lift" mais perceptível: sobe 3px e ganha sombra mais forte (`var(--sh-2)`) — demandas de hoje, kanban (por status e por cliente), clientes, prospectos, ideias, projetos pessoais.
  - Cards que **não tinham hover nenhum** ganharam: KPIs da tela Início, KPIs do Financeiro, cards de Metas (sobem e ganham sombra); linha de "Atividades recentes", linha do breakdown de Salário, célula do Calendário (ganham destaque de fundo/leve zoom); linha de "Lançamentos" do Financeiro e linha de "Demandas futuras" (ganham destaque de fundo + leve deslocamento lateral).
  - Nó do Workflow: hover ficou mais forte (sobe mais, ganha sombra de janela `var(--sh-3)` em vez de só mudar a borda).
  - **Verificação:** suite Playwright (com `getComputedStyle` antes/depois do `.hover()` real, não só screenshot) confirmando que `transform`/`box-shadow`/`background` de fato mudam nos elementos testados. Scripts de teste descartáveis removidos depois, junto com a dependência `playwright` que foi instalada só para esse teste (`npm install --no-save`) e desinstalada ao final — `package.json`/`node_modules` voltaram ao estado original.
- **2026-06-19 — Fase 3c entregue (PWA: app instalável):**
  - Novos arquivos: `manifest.webmanifest` (raiz), `sw.js` (service worker, raiz), `icons/` (icon.svg + icon-192/512 + icon-maskable-512 + apple-touch-icon), `tools/gen-icons.mjs` (gerador de ícones zero-deps).
  - `Centro de Comando.dc.html`: tags PWA no `<head>` estático (manifest, theme-color `#0d0e10`, apple-touch-icon, `apple-mobile-web-app-*`, favicon SVG, `viewport-fit=cover`, `<title>`) + registro defensivo do service worker (`if ('serviceWorker' in navigator)` no `load`).
  - `server/index.mjs`: só uma linha — MIME `.webmanifest` → `application/manifest+json`. O resto (ícones, sw.js, manifest) já é servido pela rota de estáticos.
  - `package.json`: novo script `npm run icons`.
  - **Ícones zero-deps:** `tools/gen-icons.mjs` desenha o logo do app e escreve PNGs reais só com `node:zlib` (encoder PNG próprio com CRC32 + IHDR/IDAT/IEND e antialias 4×4) — sem instalar nada. Reproduz fielmente o quadrado de gradiente azul + quadrado branco central.
  - **Service worker network-first**, blindado contra `/api/*` e `/__livereload` (passam direto). Cacheia o app shell + React/ReactDOM (unpkg) + fontes (Google) em runtime. Detalhes e fluxo na seção "Arquitetura PWA (Fase 3c)" acima.
  - **Limitação documentada:** SW e instalação automática (Android/Chrome) exigem HTTPS ou localhost. Funciona 100% no desktop em `localhost`; no celular via IP HTTP o SW não roda (precisa de HTTPS — virá com o Tauri da 3d ou hospedagem com TLS), mas o iOS já abre standalone via as meta tags apple. Vide a seção da Fase 3c.
  - **Verificação ao vivo (Playwright/Chromium headless já em cache, contra o `npm run server` real, login `teste123`):** SW registra (escopo `/`) e ativa; após reload controla a navegação; app renderiza e loga com o SW no caminho; `/api/me` responde `{ok:true}` fresco (não interceptado/cacheado); cache `cdc-pwa-v1` com 11 itens (shell + React + fontes) e zero rotas `/api`/`__livereload`; manifest válido (4 ícones, any + maskable). Zero erro de console. Os 4 PNGs validados à parte (assinatura, IHDR color-type 6, IDAT no tamanho exato). Tudo de teste removido ao final (working tree limpo).
- **2026-06-19 — QA funcional completo + reset dos dados de teste (a pedido do usuário):**
  - **QA (Playwright contra o server real):** 21/21 OK, **zero erros de console** — login, as 11 telas, tabs de demanda, calendário mês/semana, busca ⌘K, hover (fix do `support.js`), sidebar recolher/expandir, criar+editar demanda, criar ideia, e o Assistente respondendo de verdade (Gemini). Também confirmado que a navegação e os empty states funcionam com o banco vazio.
  - **Reset "app limpo":** zerados todos os dados (`clients`/`demands`/`prospectos`/`ideias`/`lancamentos`/`wfNodesExtra` → listas vazias) e limpo o `audit_log`, via script direto no SQLite com o servidor parado. Backup completo (sqlite + state.json + audit.json) guardado **fora do repo** em `C:\Users\patri\cdc-backups`. Os dados de teste eram: clientes `Cliente Teste`/`jet ski lanchas`, demandas `Demanda Teste`/`ada`/`fs`/`sgsg`, 6 ideias de exemplo, e 3 ações no audit.
  - **Descoberta:** a tela Início e os badges da sidebar são hardcoded (ver aviso na seção "Tema claro/escuro") — o reset não os afeta.
- **2026-06-19 — Tema claro/escuro alternável (a pedido do usuário "coloque em versão clara tb, pra poder ser alterado"):**
  - `Centro de Comando.dc.html`: blocos `:root[data-theme=dark/light]` no `<head>` estático com a paleta completa + novas vars (`--app-bg`, `--app-gradient`, `--scrollbar`, `--wire`); anti-flash script; botão ☾/☀ no titlebar; ícones `sun`/`moon`; handler `toggleTheme`; `componentDidMount` sincroniza o `mode`; helmet e root div ajustados pra usar as vars; fios do Workflow via `--wire`. Ver seção "Tema claro/escuro" acima.
  - **Verificação (Playwright):** alterna dark↔light, **persiste no reload**, cores batem com a paleta (body `#060708`↔`#e4e7eb`, texto `#e9eaec`↔`#1b1f27`), dark intacto após a refatoração, navegação e empty states OK no claro, **zero erros de console**. Screenshots dos dois temas conferidos. Temporários e `playwright` (--no-save) removidos ao final.
- **2026-06-19 — Tela Início conectada ao state + badges dinâmicos (a pedido do usuário, pós-reset):**
  - A Início era 100% hardcoded (KPIs `12/8/R$6.450`, "Luso Automóveis", "Flamenguismo 90+") e não respondia ao reset. Agora os 4 KPIs ("Demandas ativas", "Entregas", "A receber", "Vencendo hoje"), as listas "Demandas de hoje" e "Demandas futuras", e o subtítulo do header **derivam de `s.demands`/`s.clients`/`s.lancamentos`**. "Atividades recentes" fica em empty state (sem fonte real ainda).
  - **Empty states** novos nas 3 seções quando vazias ("Nenhuma demanda pra hoje/futura", "Nenhuma atividade recente"); subtítulo vira "Nenhuma demanda cadastrada ainda — comece criando uma."
  - **Badges da sidebar** (`Demandas`/`Clientes`) agora são a contagem real do `state` e **somem quando 0** (eram fixos `12`/`5`).
  - **Verificação (Playwright):** com o banco vazio → todos os KPIs em 0/R$0,00, os 3 empty states presentes, sem "Luso/Flamenguismo", badges sumidos; ao injetar 1 demanda → aparece em "Demandas futuras", empty state some, badge vira "1". Zero erros de console. Screenshot da Início vazia conferido. Estado deixado vazio (limpo) ao final.
- **2026-06-19 — Melhorias de design/animação (a pedido do usuário, aplicando as diretrizes de frontend-design):**
  - **Morph de tema:** o toggle claro↔escuro agora faz uma transição suave de cores (classe `.theming` ligada só durante a troca, ~480ms) em vez de trocar instantâneo. Não afeta hovers/performance no resto.
  - **Login com stagger reveal:** logo → título → input → botão entram escalonados (cc-rise, easing `cubic-bezier(.16,1,.3,1)`) em vez de tudo de uma vez.
  - **Data e saudação reais:** o header da Início era fixo "Segunda · 15 de junho" / "Boa tarde, Rafael"; agora deriva de `new Date()` (ex: "Sexta · 19 de junho" / "Boa noite" por faixa de hora).
  - **Assistente coerente:** a mensagem de boas-vindas virou genérica/dinâmica (saudação por hora, sem "Reels do Flamenguismo"); os 3 chips de "Contexto atual" (eram fixos "Reels vence em 1h" / "4 demandas hoje" / "R$ 2.250 recebidos") agora **derivam do state** (demandas pra hoje, ativas/entregues, clientes/prospects); a sugestão rápida do Flamengo virou genérica.
  - **Descoberta (durante a análise):** o `fs.watch` do dev server observava `tools/`, então cada screenshot do Playwright salvo ali disparava live reload e "voltava" a navegação pra Início — não era bug do app. Testes passaram a salvar screenshots fora do projeto.
  - **Ainda hardcoded (escopo de dados, não design):** Financeiro (KPIs + gráfico de 6 meses), Salário, Metas e a notificação do sino ainda têm dados de exemplo — coerentes visualmente, mas com valores fixos. Conectar como foi feito com a Início/Assistente.
  - **Verificação (Playwright, screenshots fora do dir observado):** morph (classe liga/desliga, tema troca), login renderiza, data real na Início, Assistente com saudação dinâmica + chips derivados, tema claro coerente em todas as telas (Início/Demandas/Clientes/Financeiro/Workflow conferidos), fios do Workflow via `--wire` OK nos dois temas. **Zero erros de console.** Estado deixado vazio ao final.
- **2026-06-20 — Fase 3d entregue (.exe autônomo via Tauri + Node embutido) + site de download:**
  - Novo `src-tauri/` (projeto Tauri 2): `lib.rs` inicia o Node sidecar (`node server/index.mjs`) com `CDC_DATA_DIR`, espera a porta 5174 e abre a janela; mata o Node ao fechar. `tauri.conf.json` (janela via código, resources do app + node.exe, bundle NSIS, ícones). Ver "Arquitetura do executável".
  - `server/index.mjs` + `db.mjs`: flag `PACKAGED` desliga live reload e o auto-open do navegador; SQLite e `.env` passam a usar `CDC_DATA_DIR` (gravável).
  - `package.json`: devDep `@tauri-apps/cli`, script `npm run tauri`. `.gitignore`: `src-tauri/target|gen|binaries`.
  - **Bug resolvido:** `resource_dir()` do Tauri retorna caminho verbatim (`\\?\C:\...`) que o Node não roda (`EISDIR lstat 'C:'`) → `strip_verbatim` no `lib.rs`.
  - **Verificação ao vivo:** build gerou `.exe` + instalador NSIS (`Centro de Comando_0.1.0_x64-setup.exe`, ~26 MB); rodando o `.exe`, confirmado o processo do `.exe` + o **Node filho** (sidecar) servindo a porta 5174 sozinho, **sem servidor à parte**; o servidor responde no modo packaged (sem snippet de live reload); janela abre com o app. Tela de login conferida (Playwright contra o sidecar).
  - **`site/index.html`** — landing page de download **responsiva** (testada em desktop 1300px e mobile 390px): hero, mockup do app, 6 features, CTAs de download. Aponta pro instalador ao lado.
  - **Senha de teste atual no `.exe`: `teste123`** (vem do `server/.env` do bundle; troque com `npm run setup` antes do build final).
