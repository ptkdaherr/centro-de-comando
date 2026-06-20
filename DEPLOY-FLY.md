# Subir o Centro de Comando no Fly.io 🚀

Guia passo a passo pra colocar o app no ar (HTTPS, PC + celular, dados de cada
um separados). Tudo que o app precisa já está pronto: `Dockerfile`, `fly.toml` e
`.dockerignore`. **Não precisa instalar Docker** — o Fly compila a imagem no
servidor dele.

> O app é zero-dependências (usa só Node nativo + React via CDN). O banco SQLite
> fica num **volume persistente** (`/data`), então os dados sobrevivem a reinícios.

---

## 1) Criar conta no Fly
- Acesse **https://fly.io/app/sign-up** e crie a conta.
- O Fly pede um **cartão de crédito** mesmo no plano gratuito (é só pra evitar
  abuso — o uso de vocês 2 cabe folgado na cota grátis).

## 2) Instalar o `flyctl` (o programinha de linha de comando)
No **PowerShell do Windows**:
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```
Feche e reabra o terminal depois. Confira: `fly version`.

## 3) Entrar na sua conta
```bash
fly auth login
```
Abre o navegador pra você logar.

## 4) Criar o app (na pasta do projeto)
Dentro de `Centro de comando - exe`:
```bash
fly launch --no-deploy
```
- Quando perguntar, **use a configuração existente** (`fly.toml`) → sim.
- Ele vai pedir um **nome único** pro app (ex.: `centro-comando-seunome`). O nome
  vira parte da URL: `https://SEU-NOME.fly.dev`.
- Região: confirme **gru** (São Paulo). Não faça deploy ainda (`--no-deploy`).

## 5) Criar o disco persistente (onde o banco mora)
```bash
fly volumes create cdc_data --region gru --size 1
```
(1 GB é mais que suficiente. Tem que ser na mesma região do app.)

## 6) (Recomendado) Definir um código de convite
Como a URL é pública, isto evita estranhos criarem conta. Escolha um código e:
```bash
fly secrets set SIGNUP_CODE=algumsegredo
```
Aí, na hora de criar conta, você e seu amigo digitam esse código no campo
"Código de convite". (Se não definir, o cadastro fica aberto a qualquer um que
souber a URL.)

## 7) Subir!
```bash
fly deploy
```
Espera uns minutos (ele compila e sobe). No fim:
```bash
fly open
```
Abre a URL `https://SEU-NOME.fly.dev` no navegador. 🎉

## 8) Usar
- **No PC:** abre a URL → "Criar conta" (com o código de convite, se você definiu).
- **No celular:** abre a mesma URL no navegador → menu → **"Adicionar à tela inicial"**.
  Vira um app na tela do celular (com HTTPS o modo app funciona 100%).
- **Cada um cria a própria conta** e configura a **própria chave do Gemini** na aba
  Assistente (cada conta tem seus dados e sua chave, totalmente separados).

---

## Coisas boas de saber

- **Custo / "dormir":** no `fly.toml` está `min_machines_running = 0` — a máquina
  **dorme quando ociosa** (mais barato) e acorda no 1º acesso (uns segundos de
  espera; ao acordar, todo mundo refaz login). Pra ficar **sempre ligada** (sem
  espera, sem relogar), troque pra `min_machines_running = 1` e rode `fly deploy`
  de novo (custa ~poucos dólares/mês).
- **Não escale pra 2+ máquinas.** O SQLite é de um servidor só. Uma máquina + um
  volume = certo. (Se um dia precisar de mais, a gente troca pra Postgres.)
- **Atualizar o app depois:** mexeu no código? Só rodar `fly deploy` de novo. Os
  dados no volume continuam intactos.
- **Backup do banco:** `fly ssh console -C "cat /data/cdc.sqlite" > backup.sqlite`
  (ou use `fly volumes` pra snapshots).
- **Ver logs / status:** `fly logs` e `fly status`.

## Se algo der errado
Me manda a saída de `fly logs` que eu te ajudo a destravar. Os tropeços mais
comuns: nome de app já em uso (escolha outro), esquecer de criar o volume
(passo 5), ou o cartão não cadastrado no Fly.
