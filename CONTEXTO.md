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

**Crítico (ainda pendente):**
- **Assistente é decorativo.** `chatSend`/`chatInputKeyDown` só empurram a mensagem do usuário pra lista (`chatExtra`) — não existe nenhuma resposta gerada, nem mock com delay, nem chamada de API. O "chat" nunca responde nada. (Fase 3)

**Resolvido na Fase 2:**
- ✅ **Editar/excluir demandas, clientes, prospectos, lançamentos e ideias.** Padrão `drawerEditId` (null = criar, id = editar) em `submitDrawer`. Cada entidade tem `editX`/`deleteX` (com `window.confirm` antes de apagar). Demandas: edição funciona tanto no kanban por status quanto nas lanes por cliente (cards "Pessoal" continuam não-editáveis via `mkLane(d, false)`).
- ✅ **Drag-and-drop real no kanban** (visão por status). `draggable="true"` + `onDragStart`/`onDragOver`/`onDrop` nativos (HTML5 DnD), atualiza `status` da demanda ao soltar numa coluna.
- ✅ **Busca ⌘K funcional.** Badge do topo agora abre modal (clique ou `Cmd/Ctrl+K`); pesquisa por título/nome em demandas, clientes e prospectos; clicar num resultado abre o drawer de edição já preenchido e navega pra tela certa. `Esc` ou clique fora fecha.

**Bom ter / Fase 3:**
- Conectar o Assistente a uma IA de fato (Gemini, conforme já decidido no projeto irmão).
- Empacotamento pro .exe: nenhuma config ainda (Electron vs Tauri).
- Heurística de cliente atrasado pode evoluir pra modelo de pagamento real (hoje é só dia-do-mês vs `pagDia`, sem registrar se aquele mês já foi pago).

## Roadmap até o .exe

Opções consideradas (nenhuma decidida ainda):
- **Electron** — mais direto, embrulha o `.dc.html` numa `BrowserWindow`, empacota com `electron-builder`. Mais pesado em disco/RAM.
- **Tauri** — backend Rust, bundle bem mais leve, melhor integração com o sistema. Exige uma camada fina de Rust pra persistência/IPC.
- **NW.js** — abordagem parecida com Electron, DX similar.

Nenhum desses tem config no projeto ainda (sem `package.json`, sem `electron.js`/`tauri.conf.json`).

Pendências antes do .exe:
1. Implementar persistência real (localStorage no mínimo; idealmente arquivo local / SQLite via backend nativo).
2. Decidir framework de empacotamento (Electron vs Tauri).
3. Conectar o Assistente a uma IA de fato (ver decisão já tomada no projeto irmão: Gemini como API gratuita recomendada).
4. Ícone, nome do app, splash, talvez abrir no boot do Windows.

## Arquivos da pasta

- `Centro de Comando.dc.html` — app principal (~1775 linhas).
- `support.js` — runtime do framework DC.
- `Canvas.dc.html`, `Canvas-2.dc.html` — templates vazios, provavelmente reservados pra novas telas/testes.
- `ideias/` — 8 prints de referência visual (dashboard, sidebar, calendário, cor, etc.) que guiaram o design.
- `screenshots/` — 2 prints de demonstração do estado atual.
- `.gitignore` — exclui `Timed out questions defaults.zip` (arquivo solto sem relação com o projeto), lixo de OS, e pastas de build futuras.
- `package.json` + `tools/dev-server.mjs` — dev server local zero-deps com live reload (mesmo padrão do projeto irmão `CENTRO-DE-COMANDO`). `npm run dev` sobe em `http://localhost:5174/` e abre o navegador automaticamente.

## Plano de implementação em 3 fases (decidido em 2026-06-17)

Ordem do mais simples/rápido pro mais difícil/complexo. Cada fase termina com checkpoint: reporto o que mudou e peço OK antes de seguir pra próxima.

**Fase 1 — correções rápidas e fundação de dados**
- Corrigir bug do drawer: lançamento e ideia passam a salvar de fato.
- Persistência real via `localStorage` (carrega ao abrir, salva a cada mudança) — sem isso nada das próximas fases é testável de verdade.
- Posição correta pro nó novo do Workflow.
- Alerta de cliente atrasado (com base no `pagDia`).

**Fase 2 — CRUD completo e interações**
- Editar/excluir demandas, clientes, prospectos, lançamentos e ideias.
- Drag-and-drop real no kanban (mover card entre colunas).
- Busca ⌘K funcional.

**Fase 3 — assistente IA real e empacotamento .exe**
- Conectar o Assistente a uma IA de fato (Gemini), com respostas reais e idealmente ações executáveis.
- Decidir e configurar empacotamento (Electron vs Tauri) gerando o `.exe`.

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
