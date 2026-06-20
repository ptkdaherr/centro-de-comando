#!/usr/bin/env bash
# =============================================================
# Centro de Comando — setup numa VM Ubuntu (Google Cloud "Always Free")
# Instala Node 24 + Caddy, sobe o app como serviço (reinicia sozinho e no boot)
# e configura HTTPS automático (Let's Encrypt) via Caddy + um domínio DuckDNS.
#
# Uso (na VM, dentro da pasta do app):
#   sudo bash deploy/setup-vm.sh <subdominio.duckdns.org> <token-duckdns> [codigo-convite]
# Ex:
#   sudo bash deploy/setup-vm.sh meucdc.duckdns.org 12345678-aaaa-bbbb-cccc segredo123
# =============================================================
set -euo pipefail

DOMAIN="${1:-}"
DUCK_TOKEN="${2:-}"
SIGNUP_CODE="${3:-}"

if [ -z "$DOMAIN" ] || [ -z "$DUCK_TOKEN" ]; then
  echo "Uso: sudo bash deploy/setup-vm.sh <subdominio.duckdns.org> <token-duckdns> [codigo-convite]"
  echo "Ex:  sudo bash deploy/setup-vm.sh meucdc.duckdns.org 12345678-aaaa-bbbb-cccc segredo123"
  exit 1
fi
if [ "$(id -u)" -ne 0 ]; then echo "Rode com sudo."; exit 1; fi

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"   # raiz do app = pasta acima de deploy/
DUCK_SUB="${DOMAIN%%.*}"                        # parte antes do primeiro ponto

echo "==> App em:  $APP_DIR"
echo "==> Domínio: $DOMAIN   (DuckDNS: $DUCK_SUB)"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y

echo "==> Node 24..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'parseInt(process.versions.node)' 2>/dev/null || echo 0)" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
echo "    node $(node --version)"

echo "==> Caddy (servidor de HTTPS)..."
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> Usuário 'cdc' + pasta de dados (banco persistente)..."
id -u cdc >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin cdc
mkdir -p "$APP_DIR/data"
chown -R cdc:cdc "$APP_DIR/data"

echo "==> Serviço do app (systemd)..."
SIGNUP_LINE=""
[ -n "$SIGNUP_CODE" ] && SIGNUP_LINE="Environment=SIGNUP_CODE=$SIGNUP_CODE"
cat > /etc/systemd/system/centro-de-comando.service <<EOF
[Unit]
Description=Centro de Comando
After=network.target

[Service]
Type=simple
User=cdc
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=CDC_DATA_DIR=$APP_DIR/data
$SIGNUP_LINE
ExecStart=/usr/bin/node server/index.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

echo "==> HTTPS automático (Caddyfile)..."
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    reverse_proxy localhost:8080
}
EOF

echo "==> Mantendo o DuckDNS apontando pra esta VM (cron a cada 5 min)..."
cat > /usr/local/bin/duckdns-update.sh <<EOF
#!/usr/bin/env bash
curl -fsS "https://www.duckdns.org/update?domains=$DUCK_SUB&token=$DUCK_TOKEN&ip=" -o /var/log/duckdns.last
EOF
chmod +x /usr/local/bin/duckdns-update.sh
/usr/local/bin/duckdns-update.sh || true
( crontab -l 2>/dev/null | grep -v duckdns-update.sh; echo "*/5 * * * * /usr/local/bin/duckdns-update.sh" ) | crontab -

echo "==> Ligando tudo..."
systemctl daemon-reload
systemctl enable --now centro-de-comando
systemctl restart caddy

cat <<FIM

================================================================
 PRONTO!  Acesse:  https://$DOMAIN
   (se o cadeado não pegar de primeira, espere 1-2 min e rode:
    sudo systemctl restart caddy)

 Status do app:   sudo systemctl status centro-de-comando
 Logs do app:     sudo journalctl -u centro-de-comando -f
 Logs do HTTPS:   sudo journalctl -u caddy -f
================================================================
FIM
