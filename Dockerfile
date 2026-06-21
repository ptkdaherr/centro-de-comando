# Centro de Comando — imagem pra hospedar (Fly.io ou outro Docker).
# Runtime usa só módulos nativos do Node + React via CDN; a única dependência
# é o cliente de banco (@libsql/client). React vem da CDN.
FROM node:24-slim

WORKDIR /app

# instala só as deps de runtime (precisa do package.json/lock primeiro p/ cache)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# copia o resto do app (o .dockerignore tira node_modules, src-tauri, .git, .env etc.)
COPY . .

# Em modo hospedado o servidor entra em "produção": serve o PWA, sem live-reload.
# Sem TURSO_DATABASE_URL, o banco é um arquivo SQLite em CDC_DATA_DIR (no Fly, um
# VOLUME persistente em /data). Pra usar Turso na nuvem, passe TURSO_DATABASE_URL.
ENV NODE_ENV=production
ENV PORT=8080
ENV CDC_DATA_DIR=/data

EXPOSE 8080

CMD ["node", "server/index.mjs"]
