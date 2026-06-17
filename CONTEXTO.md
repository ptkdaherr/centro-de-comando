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

## O que falta implementar (verificado lendo o código em 2026-06-17)

**Crítico:**
- **Zero persistência.** Nada de `localStorage`/arquivo/SQLite — confirmado, não existe nenhuma chamada de storage no arquivo. Tudo é `state` em memória; F5 reseta tudo.
- **Assistente é decorativo.** `chatSend`/`chatInputKeyDown` só empurram a mensagem do usuário pra lista (`chatExtra`) — não existe nenhuma resposta gerada, nem mock com delay, nem chamada de API. O "chat" nunca responde nada.
- **Bug: lançamento e ideia não salvam.** Os botões "Registrar lançamento" e "Capturar ideia" abrem o drawer (`openDrawerLancamento`/`openDrawerIdeia`), mostram o toast de "sucesso" — mas o `submitDrawer` só tem `if/else if` pra `demanda`, `cliente` e `prospecto`. Pra `lancamento` e `ideia` ele fecha o drawer e finge que salvou, mas **não adiciona nada aos arrays** `lancamentos`/`ideias`. Precisa implementar esses dois branches.

**Importante:**
- **Sem edição/exclusão de nada.** Só existe fluxo de *criar* (demanda, cliente, prospecto). Não há como editar ou apagar uma demanda, cliente, prospecto, lançamento ou ideia depois de criada.
- **Kanban sem drag-and-drop.** Nenhum atributo `draggable`/handler de drag no código — mover card de coluna é só visual hoje (não dá pra arrastar de fato).
- **Busca ⌘K é só um badge.** Aparece visualmente no topo (linha ~50) mas não tem listener nenhum atrás — não abre busca nenhuma.
- **Empacotamento pro .exe:** nenhuma config ainda (sem `package.json`, sem Electron/Tauri/NW.js).

**Bom ter / Fase 2+:**
- Conectar o Assistente a uma IA de fato (Gemini, conforme já decidido no projeto irmão).
- Editar/mover nós do Workflow (hoje só dá pra adicionar um nó novo via `addWfNode`, sem posição definida).
- Notificação de cliente atrasado (mencionada no briefing original, não vista implementada aqui).

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

## Changelog

- **2026-06-17** — Repositório git inicializado (branch `main`), `.gitignore` criado, este `CONTEXTO.md` criado, commit inicial com o estado atual do projeto como baseline.
- **2026-06-17** — Lida a fundo a lógica do `.dc.html` e mapeados os gaps reais (seção "O que falta implementar" acima): zero persistência, assistente decorativo, bug no save de lançamento/ideia, sem editar/excluir, sem drag-and-drop no kanban, ⌘K decorativo.
