/**
 * Node.js PNG Asset Generator for VoiceMirror
 * Generates valid, high-fidelity PNG icons and Open Graph social card
 * using standard Node.js zlib and Buffer (zero external dependencies).
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// CRC32 Lookup Table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPng(width, height, getPixelFn) {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    scanlines[rowOffset] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = getPixelFn(x, y, width, height);
      scanlines[pixelOffset] = r;
      scanlines[pixelOffset + 1] = g;
      scanlines[pixelOffset + 2] = b;
      scanlines[pixelOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', idatData);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcTarget = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  chunk.writeUInt32BE(crc32(crcTarget), 8 + len);
  return chunk;
}

// -----------------------------------------------------------------------------
// Icon Drawing Logic (Voice Waveform & Cranial Resonance Glow)
// -----------------------------------------------------------------------------

function renderIconPixel(x, y, width, height, isMaskable = false) {
  const nx = x / width;
  const ny = y / height;

  // Background: Deep Slate #020617 (2, 6, 23)
  let r = 2, g = 6, b = 23, a = 255;

  // Subtle radial background glow from center
  const dx = nx - 0.5;
  const dy = ny - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.6) {
    const glow = Math.max(0, 1 - dist / 0.6);
    // Cyan/Indigo atmospheric glow
    r = Math.min(255, Math.round(r + glow * 15));
    g = Math.min(255, Math.round(g + glow * 40));
    b = Math.min(255, Math.round(b + glow * 70));
  }

  // Safe scale for maskable vs standard
  const scale = isMaskable ? 0.65 : 0.8;
  const cx = 0.5;
  const cy = 0.5;

  // Normalize coordinates into icon box [-1, 1]
  const px = (nx - cx) / (scale * 0.5);
  const py = (ny - cy) / (scale * 0.5);

  // Waveform bars configuration: 6 vertical bars
  // Relative x positions and heights [-1, 1]
  const bars = [
    { x: -0.75, top: -0.3, bottom: 0.3, w: 0.12 },
    { x: -0.45, top: -0.65, bottom: 0.65, w: 0.12 },
    { x: -0.15, top: -0.95, bottom: 0.95, w: 0.12 },
    { x: 0.15, top: -0.45, bottom: 0.45, w: 0.12 },
    { x: 0.45, top: -0.75, bottom: 0.75, w: 0.12 },
    { x: 0.75, top: -0.3, bottom: 0.3, w: 0.12 },
  ];

  let onBar = 0;
  for (const bar of bars) {
    const barDx = Math.abs(px - bar.x);
    if (barDx <= bar.w) {
      // Rounded ends
      const radius = bar.w;
      let inside = false;
      if (py >= bar.top + radius && py <= bar.bottom - radius) {
        inside = true;
      } else if (py < bar.top + radius) {
        const topDy = py - (bar.top + radius);
        if (barDx * barDx + topDy * topDy <= radius * radius) inside = true;
      } else if (py > bar.bottom - radius) {
        const bottomDy = py - (bar.bottom - radius);
        if (barDx * barDx + bottomDy * bottomDy <= radius * radius) inside = true;
      }

      if (inside) {
        // Distance to edge for antialiasing
        onBar = 1.0;
        break;
      }
    }
  }

  if (onBar > 0) {
    // Gradient from vibrant cyan (#06b6d4) to bright sky (#38bdf8)
    const t = (py + 1) / 2;
    r = Math.round(6 + t * 50);
    g = Math.round(182 + t * 7);
    b = Math.round(212 + t * 36);
  }

  return [r, g, b, a];
}

// -----------------------------------------------------------------------------
// Open Graph Image (1200x630) Social Card Drawing Logic
// -----------------------------------------------------------------------------
function renderOgPixel(x, y, width, height) {
  const nx = x / width;
  const ny = y / height;

  // Slate-950 base #020617
  let r = 2, g = 6, b = 23, a = 255;

  // Deep radial ambient glow from left (studio vibe)
  const glowDist1 = Math.hypot(nx - 0.25, ny - 0.5);
  if (glowDist1 < 0.8) {
    const g1 = Math.pow(1 - glowDist1 / 0.8, 2);
    r = Math.min(255, Math.round(r + g1 * 14));
    g = Math.min(255, Math.round(g + g1 * 60));
    b = Math.min(255, Math.round(g + g1 * 95));
  }

  // Secondary violet accent glow on right
  const glowDist2 = Math.hypot(nx - 0.8, ny - 0.6);
  if (glowDist2 < 0.7) {
    const g2 = Math.pow(1 - glowDist2 / 0.7, 2);
    r = Math.min(255, Math.round(r + g2 * 35));
    g = Math.min(255, Math.round(g + g2 * 20));
    b = Math.min(255, Math.round(g + g2 * 80));
  }

  // Waveform visualization grid & spectrum bars in the background
  // Grid lines
  if (y % 45 === 0 && nx > 0.05 && nx < 0.95) {
    r = Math.min(255, r + 8);
    g = Math.min(255, g + 14);
    b = Math.min(255, b + 24);
  }
  if (x % 60 === 0 && ny > 0.1 && ny < 0.9) {
    r = Math.min(255, r + 8);
    g = Math.min(255, g + 14);
    b = Math.min(255, b + 24);
  }

  // Stylized spectrum bars along the bottom half (x: 0.1 to 0.9, y: 0.55 to 0.85)
  if (nx >= 0.08 && nx <= 0.92 && ny >= 0.52 && ny <= 0.85) {
    const barIndex = Math.floor((nx - 0.08) / 0.02);
    const inBarX = ((nx - 0.08) % 0.02) / 0.02;
    if (inBarX >= 0.25 && inBarX <= 0.75) {
      // Dynamic height using acoustic sinusoidal harmonics
      const hNorm = 0.15 + 0.65 * Math.abs(
        Math.sin(barIndex * 0.28) * Math.cos(barIndex * 0.12) +
        0.3 * Math.sin(barIndex * 0.65)
      );
      const barTop = 0.85 - hNorm * 0.30;
      if (ny >= barTop) {
        // Gradient cyan -> violet
        const t = (0.85 - ny) / 0.30;
        r = Math.round(6 + (1 - t) * 60 + barIndex * 1.5);
        g = Math.round(182 - (1 - t) * 70);
        b = Math.round(212 + t * 40);
      }
    }
  }

  // Central Hero Icon on left-center
  const iconScale = 0.25;
  const iconCx = 0.22;
  const iconCy = 0.32;
  const px = (nx - iconCx) / (iconScale * 0.5);
  const py = (ny - iconCy) / (iconScale * 0.5);

  if (Math.abs(px) <= 1.2 && Math.abs(py) <= 1.2) {
    const bars = [
      { x: -0.75, top: -0.3, bottom: 0.3, w: 0.12 },
      { x: -0.45, top: -0.65, bottom: 0.65, w: 0.12 },
      { x: -0.15, top: -0.95, bottom: 0.95, w: 0.12 },
      { x: 0.15, top: -0.45, bottom: 0.45, w: 0.12 },
      { x: 0.45, top: -0.75, bottom: 0.75, w: 0.12 },
      { x: 0.75, top: -0.3, bottom: 0.3, w: 0.12 },
    ];

    for (const bar of bars) {
      const barDx = Math.abs(px - bar.x);
      if (barDx <= bar.w) {
        const radius = bar.w;
        let inside = false;
        if (py >= bar.top + radius && py <= bar.bottom - radius) {
          inside = true;
        } else if (py < bar.top + radius) {
          const topDy = py - (bar.top + radius);
          if (barDx * barDx + topDy * topDy <= radius * radius) inside = true;
        } else if (py > bar.bottom - radius) {
          const bottomDy = py - (bar.bottom - radius);
          if (barDx * barDx + bottomDy * bottomDy <= radius * radius) inside = true;
        }

        if (inside) {
          r = 6;
          g = 182;
          b = 212;
          break;
        }
      }
    }
  }

  return [r, g, b, a];
}

// -----------------------------------------------------------------------------
// Generation Pipeline
// -----------------------------------------------------------------------------

console.log('Generating VoiceMirror PNG assets...');

const targets = [
  { name: 'icon-192.png', width: 192, height: 192, fn: (x, y, w, h) => renderIconPixel(x, y, w, h, false) },
  { name: 'icon-512.png', width: 512, height: 512, fn: (x, y, w, h) => renderIconPixel(x, y, w, h, false) },
  { name: 'icon-maskable-512.png', width: 512, height: 512, fn: (x, y, w, h) => renderIconPixel(x, y, w, h, true) },
  { name: 'apple-touch-icon.png', width: 180, height: 180, fn: (x, y, w, h) => renderIconPixel(x, y, w, h, false) },
  { name: 'og-image.png', width: 1200, height: 630, fn: renderOgPixel },
];

for (const target of targets) {
  const dest = path.join(publicDir, target.name);
  const buf = createPng(target.width, target.height, target.fn);
  fs.writeFileSync(dest, buf);
  console.log(`✓ Generated ${target.name} (${target.width}x${target.height}, ${buf.length} bytes)`);
}

console.log('All PNG assets successfully generated.');
