# Subir o Centro de Comando no Render — 100% grátis, sem cartão 🆓

Resultado: uma URL `https://...onrender.com` que abre no PC e no celular, de
qualquer lugar. **Sem cartão, sem depósito.** São 3 cadastros grátis (Turso,
GitHub, Render) — eu te guio em cada um.

> Contrapartida do grátis: o site **"dorme"** quando ninguém usa; o **1º acesso**
> depois de um tempo ocioso demora ~30-60s pra acordar. Depois fica normal.

---

## Parte 1 — Banco de dados grátis (Turso)
O Render grátis não guarda arquivos, então o banco vai pra nuvem (Turso, grátis).

1. Acesse **https://turso.tech** → **Sign up** (entre com **GitHub** ou Google — sem cartão).
2. No painel, crie um **database** (Create Database). Dê um nome, ex.: `centro-comando`.
3. Pegue **2 coisas** (me mande as duas, ou guarde):
   - a **URL** do banco — começa com `libsql://...turso.io`
   - um **token de autenticação** (botão "Create Token" / "Generate token").
   *(Se tiver o CLI: `turso db show centro-comando --url` e `turso db tokens create centro-comando`.)*

## Parte 2 — Pôr o código no GitHub
O Render puxa o código de um repositório. Pode ser **público** (não tem segredo
nenhum versionado — conferi).

1. Crie conta em **https://github.com** (se não tiver) e clique em **New repository**.
   - Nome: `centro-de-comando` · **Public** · **não** marque "Add README".
2. Me avise o **link do repositório** (ex.: `https://github.com/SEUUSER/centro-de-comando`)
   que eu rodo o `git push` daqui pra você (ou você roda os 2 comandos que eu passo).

## Parte 3 — Subir no Render
1. Acesse **https://render.com** → **Sign up** (com **GitHub** — sem cartão).
2. **New +** → **Web Service** → conecte/escolha o repositório `centro-de-comando`.
3. O Render lê o `render.yaml` e já preenche quase tudo. Confirme:
   - **Build Command:** `npm install`
   - **Start Command:** `node server/index.mjs`
   - **Plan:** **Free**
4. Em **Environment / Environment Variables**, adicione (as 3 que ficaram como
   "secreto" no `render.yaml`):
   - `TURSO_DATABASE_URL` = a URL `libsql://...` (Parte 1)
   - `TURSO_AUTH_TOKEN` = o token (Parte 1)
   - `SIGNUP_CODE` = um código de convite que você escolhe (ex.: `meusegredo123`)
   *(`NODE_ENV=production` já vem do `render.yaml`.)*
5. **Create Web Service.** Espera o build (uns minutos). No fim aparece a URL
   **`https://centro-de-comando-xxxx.onrender.com`**.

## Parte 4 — Usar 🎉
- **PC:** abra a URL → **Criar conta** (com o código de convite).
- **Celular:** abra a mesma URL → menu → **Adicionar à tela inicial** (vira app).
- Cada um cria a **própria conta** e põe a **própria chave do Gemini** (aba
  Assistente). Dados 100% separados.

---

## Atualizar o app depois
Mexeu no código? `git push` → o Render **redeploya sozinho**. Os dados (no Turso)
não são tocados.

## Se travar
Me manda o **log do build/deploy** do Render (fica na aba "Logs" / "Events" do
serviço) que eu destravo. Tropeços comuns:
- **App não conecta no banco:** confira `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`
  (sem espaços sobrando).
- **Demora no 1º acesso:** é a "soneca" do plano grátis (normal) — espere ~1 min.
