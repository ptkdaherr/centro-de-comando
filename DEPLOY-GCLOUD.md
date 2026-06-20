# Subir o Centro de Comando numa VM grátis do Google Cloud 🌐

Resultado: uma URL `https://...` que abre no PC e no celular, **de qualquer lugar**,
**sempre ligada** e **grátis** (Always Free do Google). O banco SQLite fica no
disco da VM — seus dados persistem. Cada pessoa cria a própria conta + chave do
Gemini.

> Eu já preparei o script que faz o trabalho pesado (`deploy/setup-vm.sh`):
> instala Node + Caddy, sobe o app como serviço e configura o HTTPS sozinho.
> Você só cria a VM, joga o código nela e roda 1 comando.

---

## Parte 1 — Conta Google Cloud (uma vez)

1. Entre em **https://console.cloud.google.com** e ative o faturamento
   (pede cartão **só pra verificar** — o "Always Free" não cobra se ficarmos nos
   limites; a gente fica).
2. **Rede de segurança contra surpresa:** menu → **Billing → Budgets & alerts →
   Create budget** → valor **R$ 1** → alerta em 100%. Se algo sair do grátis,
   você é avisado na hora.

## Parte 2 — Criar a VM (a máquina)

1. Menu → **Compute Engine → VM instances → Create instance**.
2. **Nome:** `centro-de-comando`.
3. **Region:** `us-east1` (é o mais perto do Brasil entre os que são grátis).
   *(Só `us-west1`, `us-central1` e `us-east1` entram no Always Free — São Paulo
   custaria.)*
4. **Machine type:** série **E2** → **`e2-micro`** (é o que é grátis).
5. **Boot disk:** clique em "Change" → **Ubuntu 24.04 LTS**, tipo "Standard
   persistent disk", tamanho **30 GB** (o máximo grátis).
6. **Firewall:** marque ✅ **Allow HTTP traffic** e ✅ **Allow HTTPS traffic**.
7. **Create.** Em ~30s a VM aparece com um **IP externo**.

## Parte 3 — DuckDNS (endereço grátis pro HTTPS)

1. Em **https://www.duckdns.org**, entre (login com Google — sem cartão).
2. Crie um subdomínio, ex.: **`meucdc`** → vira `meucdc.duckdns.org`.
3. Aponte ele pro **IP externo da VM** (cole o IP no campo "current ip" e
   "update", ou deixe — o script atualiza sozinho depois).
4. Copie o seu **token** (aparece no topo da página do DuckDNS).

## Parte 4 — Mandar o código pra VM

Na linha da VM, clique em **SSH** (abre um terminal no navegador — sem instalar nada).

**Jeito fácil (sem GitHub):** eu te entrego um arquivo **`centro-de-comando-app.zip`**.
No terminal SSH, no menu de engrenagem (canto superior direito) → **Upload file**
→ envie o zip. Depois rode:
```bash
sudo apt-get update && sudo apt-get install -y unzip
sudo mkdir -p /opt/centro-de-comando
sudo unzip ~/centro-de-comando-app.zip -d /opt/centro-de-comando
```

**Jeito com atualização fácil (GitHub):** se você puser o projeto num repositório
GitHub (pode ser público — não tem segredo nenhum versionado), é só:
```bash
sudo git clone SEU_LINK_DO_GITHUB /opt/centro-de-comando
```
(Aí atualizar depois é só `sudo git pull` + reiniciar o serviço.)

## Parte 5 — Rodar o setup (o comando mágico)

Ainda no SSH:
```bash
cd /opt/centro-de-comando
sudo bash deploy/setup-vm.sh meucdc.duckdns.org SEU_TOKEN_DUCKDNS umsegredo123
```
- 1º argumento: seu domínio DuckDNS.
- 2º: o token do DuckDNS.
- 3º (opcional, recomendado): um **código de convite** — só quem souber ele cria
  conta. Combine com seu amigo.

Espere ~1-2 min (ele instala tudo e tira o certificado HTTPS). No fim aparece
**"PRONTO! Acesse: https://meucdc.duckdns.org"**.

## Parte 6 — Usar 🎉

- **PC:** abra `https://meucdc.duckdns.org` → **Criar conta** (com o código).
- **Celular:** abra a mesma URL → menu do navegador → **Adicionar à tela inicial**.
  Vira um app. Funciona de qualquer rede.
- Cada um cria a **própria conta** e põe a **própria chave do Gemini** (aba
  Assistente). Dados 100% separados.

---

## Comandos úteis (no SSH)
```bash
sudo systemctl status centro-de-comando      # o app está rodando?
sudo journalctl -u centro-de-comando -f       # logs do app ao vivo
sudo systemctl restart caddy                   # forçar o HTTPS de novo
```

## Atualizar o app depois
- **Se usou GitHub:** `cd /opt/centro-de-comando && sudo git pull && sudo systemctl restart centro-de-comando`
- **Se usou o zip:** suba o novo zip, `sudo unzip -o ~/centro-de-comando-app.zip -d /opt/centro-de-comando && sudo systemctl restart centro-de-comando`
- Os dados (no `data/`) **não** são tocados — continuam salvos.

## Backup do banco
```bash
sudo cp /opt/centro-de-comando/data/cdc.sqlite ~/backup-cdc.sqlite
```
Depois baixe pelo SSH (engrenagem → Download file).

## Se travar
Me manda a saída de `sudo journalctl -u centro-de-comando -n 50` e
`sudo journalctl -u caddy -n 50` que eu destravo contigo. Tropeços comuns:
- **HTTPS não pega:** o DuckDNS ainda não apontou pro IP, ou as portas 80/443 não
  foram liberadas (Parte 2, passo 6). Espere 2 min e `sudo systemctl restart caddy`.
- **"bad interpreter" no script:** o arquivo veio com quebra de linha do Windows —
  rode `sudo sed -i 's/\r$//' deploy/setup-vm.sh` e tente de novo.
