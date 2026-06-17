// =============================================================
// Centro de Comando — cliente da API do Gemini (function calling)
// Chamada via fetch nativo do Node, sem SDK/dependência externa.
// =============================================================
import { TOOLS } from './tools.mjs';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function buildSystemInstruction(currentState) {
  const today = new Date().toLocaleDateString('pt-BR');
  return [
    'Você é o assistente do Centro de Comando, um app de gestão pra uma agência pequena (PSA/ERP).',
    'Responda sempre em português do Brasil, de forma direta e útil.',
    `Hoje é ${today}.`,
    'Estes são os dados reais cadastrados no momento (formato JSON) — use-os para responder perguntas e para saber quais ids já existem:',
    JSON.stringify(currentState),
    'Para criar, editar ou excluir qualquer registro, SEMPRE use as funções fornecidas — nunca diga que fez algo sem chamar a função correspondente.',
    'NUNCA invente um id que não apareça nos dados acima. Se precisar de um id e não tiver certeza de qual é, pergunte ao usuário antes de chamar a função.',
    'Cada chamada de função que você fizer só será executada depois que o usuário confirmar manualmente — pode propor a ação com confiança, a confirmação é responsabilidade da interface, não sua.',
  ].join('\n\n');
}

export async function askGemini({ history, currentState, apiKey, model }) {
  const url = `${API_BASE}/${model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: buildSystemInstruction(currentState) }] },
    contents: history.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
    tools: [{ functionDeclarations: TOOLS }],
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Não consegui conectar à API do Gemini — verifique sua internet.');
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini respondeu com erro (${res.status}). ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const textPart = parts.find((p) => typeof p.text === 'string');
  const callPart = parts.find((p) => p.functionCall);

  return {
    text: textPart?.text || '',
    functionCall: callPart ? { name: callPart.functionCall.name, args: callPart.functionCall.args || {} } : null,
  };
}
