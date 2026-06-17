// =============================================================
// Centro de Comando — setup de uso único (`npm run setup`)
// Define a senha de acesso e grava o hash em server/.env
// (esse arquivo nunca vai pro git — ver .gitignore).
// =============================================================
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './auth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '.env');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

function loadEnv(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

const existing = loadEnv(ENV_PATH);

let hash = existing.APP_PASSWORD_HASH;

if (hash) {
  const overwrite = await ask('Já existe uma senha configurada (server/.env). Trocar a senha? (s/N) ');
  if (overwrite.trim().toLowerCase() === 's') {
    const password = await ask('Defina a nova senha de acesso ao Centro de Comando: ');
    if (!password || password.length < 6) {
      console.error('\nSenha precisa ter pelo menos 6 caracteres. Rode "npm run setup" novamente.');
      process.exit(1);
    }
    hash = hashPassword(password);
  } else {
    console.log('Mantida a senha atual.');
  }
} else {
  const password = await ask('Defina a senha de acesso ao Centro de Comando: ');
  if (!password || password.length < 6) {
    console.error('\nSenha precisa ter pelo menos 6 caracteres. Rode "npm run setup" novamente.');
    process.exit(1);
  }
  hash = hashPassword(password);
}

const geminiPrompt = existing.GEMINI_API_KEY
  ? 'Chave do Gemini (Assistente IA) já configurada — cole uma nova pra trocar, ou aperte Enter para manter: '
  : 'Chave do Gemini (Assistente IA, opcional — Enter para pular e configurar depois): ';
const geminiInput = (await ask(geminiPrompt)).trim();
const geminiKey = geminiInput || existing.GEMINI_API_KEY || '';

let envContent = `APP_PASSWORD_HASH=${hash}\n`;
if (geminiKey) envContent += `GEMINI_API_KEY=${geminiKey}\n`;
fs.writeFileSync(ENV_PATH, envContent);

console.log('\nConfiguração salva em server/.env (não vai pro git).');
if (geminiKey) console.log('Chave do Gemini salva — o Assistente IA já pode responder e propor ações.');
else console.log('Nenhuma chave do Gemini configurada ainda — o Assistente vai avisar isso no chat até você rodar "npm run setup" de novo com uma chave.');
console.log('Agora rode: npm run server\n');
