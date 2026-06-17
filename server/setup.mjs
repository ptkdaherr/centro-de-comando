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

if (fs.existsSync(ENV_PATH)) {
  const overwrite = await ask('Já existe uma senha configurada (server/.env). Trocar a senha? (s/N) ');
  if (overwrite.trim().toLowerCase() !== 's') {
    console.log('Mantida a configuração atual.');
    process.exit(0);
  }
}

const password = await ask('Defina a senha de acesso ao Centro de Comando: ');
if (!password || password.length < 6) {
  console.error('\nSenha precisa ter pelo menos 6 caracteres. Rode "npm run setup" novamente.');
  process.exit(1);
}

const hash = hashPassword(password);
fs.writeFileSync(ENV_PATH, `APP_PASSWORD_HASH=${hash}\n`);

console.log('\nSenha configurada — o hash foi salvo em server/.env (não vai pro git).');
console.log('Agora rode: npm run server\n');
