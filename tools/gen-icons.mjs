// =============================================================
// Gerador de ícones do PWA — zero dependências (só node:zlib).
// Marca "Centro de Comando": tile com gradiente azul
// (--accent #5285f0 → --accent-2 #3f6fe0) e um CHEVRON DUPLO branco
// (❯❯ — avanço/comando) no centro. Antialias por supersampling 4x4.
//
// Rode com:  npm run icons   (ou: node tools/gen-icons.mjs)
// Gera PNGs em /icons. É reproduzível — não precisa rodar no boot.
// O icon-1024.png serve de fonte pro `tauri icon` (ícones do .exe).
// =============================================================
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const C1 = [0x52, 0x85, 0xf0]; // --accent   #5285f0
const C2 = [0x3f, 0x6f, 0xe0]; // --accent-2 #3f6fe0
const WHITE = [0xff, 0xff, 0xff];

// ---- CRC32 (tabela), p/ os chunks do PNG ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// PNG truecolor+alpha (color type 6, 8 bits), scanlines com filtro 0 (None).
function encodePNG(N, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0);
  ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  const raw = Buffer.alloc((N * 4 + 1) * N);
  for (let y = 0; y < N; y++) {
    const rowStart = y * (N * 4 + 1);
    raw[rowStart] = 0; // filtro None
    rgba.copy(raw, rowStart + 1, y * N * 4, (y + 1) * N * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// distância ao retângulo arredondado: dentro se <= r do retângulo "core" (encolhido por r)
function insideRoundedRect(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const rx = Math.min(Math.max(px, x0 + r), x1 - r);
  const ry = Math.min(Math.max(py, y0 + r), y1 - r);
  const dx = px - rx, dy = py - ry;
  return dx * dx + dy * dy <= r * r;
}

// menor distância de um ponto a um segmento (dá cantos/pontas arredondados de graça)
function distSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const L2 = dx * dx + dy * dy;
  let t = L2 ? ((px - x1) * dx + (py - y1) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx, qy = y1 + t * dy;
  const ex = px - qx, ey = py - qy;
  return Math.sqrt(ex * ex + ey * ey);
}

// dentro do traço do chevron duplo "❯❯" (centralizado), com cantos redondos
function inChevron(px, py, N, scale) {
  const h = 0.190 * N * scale;   // meia-altura de cada chevron
  const w = 0.150 * N * scale;   // profundidade (ponta)
  const step = 0.150 * N * scale; // distância entre os dois chevrons
  const half = 0.052 * N * scale; // meia-espessura do traço
  const cy = N / 2;
  const xA = (N - step - w) / 2;
  const xB = xA + step;
  const segs = [
    [xA, cy - h, xA + w, cy], [xA + w, cy, xA, cy + h], // chevron da frente
    [xB, cy - h, xB + w, cy], [xB + w, cy, xB, cy + h], // chevron de trás
  ];
  for (const s of segs) if (distSeg(px, py, s[0], s[1], s[2], s[3]) <= half) return true;
  return false;
}

function render(N, { transparentOutside, bgRadius, chevronScale = 1 }) {
  const SS = 4; // 4x4 subamostras por pixel
  const rgba = Buffer.alloc(N * N * 4);
  const bgR = bgRadius * N;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let rs = 0, gs = 0, bs = 0, covered = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS;
          const fy = y + (sy + 0.5) / SS;
          const bgIn = transparentOutside ? insideRoundedRect(fx, fy, 0, 0, N, N, bgR) : true;
          if (!bgIn) continue; // fora do fundo => transparente
          let col;
          if (inChevron(fx, fy, N, chevronScale)) {
            col = WHITE;
          } else {
            const t = (fx + fy) / (2 * N); // gradiente diagonal
            col = [C1[0] + (C2[0] - C1[0]) * t, C1[1] + (C2[1] - C1[1]) * t, C1[2] + (C2[2] - C1[2]) * t];
          }
          rs += col[0]; gs += col[1]; bs += col[2]; covered++;
        }
      }
      const idx = (y * N + x) * 4;
      if (covered === 0) {
        rgba[idx] = rgba[idx + 1] = rgba[idx + 2] = rgba[idx + 3] = 0;
      } else {
        rgba[idx] = Math.round(rs / covered);
        rgba[idx + 1] = Math.round(gs / covered);
        rgba[idx + 2] = Math.round(bs / covered);
        rgba[idx + 3] = Math.round((covered / (SS * SS)) * 255);
      }
    }
  }
  return encodePNG(N, rgba);
}

const targets = [
  // ícones "any" (Android / desktop): cantos arredondados + transparência fora
  { file: 'icon-192.png', N: 192, opts: { transparentOutside: true, bgRadius: 0.23 } },
  { file: 'icon-512.png', N: 512, opts: { transparentOutside: true, bgRadius: 0.23 } },
  // maskable: fundo cheio (a plataforma arredonda), miolo dentro da safe zone
  { file: 'icon-maskable-512.png', N: 512, opts: { transparentOutside: false, bgRadius: 0, chevronScale: 0.82 } },
  // iOS: sem transparência (iOS põe preto atrás) e sem arredondar (iOS arredonda)
  { file: 'apple-touch-icon.png', N: 180, opts: { transparentOutside: false, bgRadius: 0 } },
  // fonte p/ o `tauri icon` (gera os ícones do .exe a partir deste)
  { file: 'icon-1024.png', N: 1024, opts: { transparentOutside: true, bgRadius: 0.23 } },
];

for (const t of targets) {
  const png = render(t.N, t.opts);
  fs.writeFileSync(path.join(OUT, t.file), png);
  console.log(`  ✓ icons/${t.file}  (${t.N}×${t.N}, ${png.length} bytes)`);
}
console.log('\n  Ícones (chevron ❯❯) gerados em /icons.\n');
