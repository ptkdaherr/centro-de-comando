# Centro de Comando — imagem pra hospedar no Fly.io
# O app é ZERO-dependências de runtime: usa só módulos nativos do Node
# (node:http, node:crypto, node:sqlite) + React via CDN. Não precisa npm install.
FROM node:24-slim

WORKDIR /app

# copia o app (o .dockerignore tira node_modules, src-tauri, .git, .env etc.)
COPY . .

# Em modo hospedado o servidor entra em "produção" quando CDC_DATA_DIR existe:
# serve o PWA, sem live-reload, sem abrir navegador. O banco SQLite mora nesse
# diretório, que no Fly é um VOLUME PERSISTENTE montado em /data.
ENV NODE_ENV=production
ENV PORT=8080
ENV CDC_DATA_DIR=/data

EXPOSE 8080

CMD ["node", "server/index.mjs"]
