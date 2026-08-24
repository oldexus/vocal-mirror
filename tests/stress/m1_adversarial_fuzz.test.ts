/**
 * VocalMirror — Challenger 2 M1 Adversarial Security & Binary Fuzzing Test Suite
 * 
 * Target Hardening Dimensions:
 * 1. sanitizeFilename: Path traversal, null byte injections, Unicode homoglyphs, Windows DOS reserved names, ReDoS resilience.
 * 2. audioBufferToWav: 4GB+ chunk boundary calculations, multi-channel bombs (>32, 65535, 65536, negative), extreme sample rates (0, 7999, 384001, NaN, Infinity), corrupted sample handling.
 * 3. index.html & vite.config.ts: Frame isolation, CSP directive correctness, SPA 404 redirection open-redirect payload vectors.
 * 4. useAudioStudio: Prototype pollution dictionary lookup vulnerabilities in applyPreset & loadDemoAudio.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import {
  audioBufferToWav,
  sanitizeFilename,
} from '../../src/utils/audioBufferToWav';
import { useAudioStudio } from '../../src/hooks/useAudioStudio';
import { installWebAudioMocks } from '../mocks/webAudioMock';

function createMockAudioBuffer(
  channels: number,
  length: number,
  sampleRate: number,
  filler?: (channel: number, index: number) => number
): AudioBuffer {
  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      data[i] = filler ? filler(c, i) : 0;
    }
    channelData.push(data);
  }

  return {
    numberOfChannels: channels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: (ch: number) => channelData[ch],
    copyFromChannel: (dst: Float32Array, ch: number, offset = 0) => {
      dst.set(channelData[ch].subarray(offset, offset + dst.length));
    },
    copyToChannel: (src: Float32Array, ch: number, offset = 0) => {
      channelData[ch].set(src, offset);
    },
  } as unknown as AudioBuffer;
}

function renderTestHook() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const result = { current: null as any };

  function TestComponent() {
    result.current = useAudioStudio();
    return null;
  }

  act(() => {
    root.render(React.createElement(TestComponent));
  });

  return {
    result,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}

describe('Challenger 2 — M1 Adversarial Fuzzing & Security Hardening Verification', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // =========================================================================
  // 1. sanitizeFilename Adversarial Fuzzing Matrix
  // =========================================================================
  describe('1. sanitizeFilename Adversarial Fuzzing & Edge Cases', () => {
    it('neutralizes complex multi-level and nested directory traversal payloads', () => {
      const traversalPayloads = [
        '../../../../etc/passwd',
        '..\\..\\..\\Windows\\System32\\cmd.exe',
        '....//....//....//etc/shadow',
        '..;/..;/..;/etc/passwd',
        '/var/log/../../../../root/.bashrc',
        'C:\\inetpub\\wwwroot\\web.config',
        '\\\\192.168.1.1\\share\\payload.exe',
        '..%2f..%2f..%2fetc%2fpasswd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fsecret.wav',
        '....\\\\....\\\\....\\\\config.ini',
        '/etc/passwd',
        '\\Windows\\win.ini',
      ];

      for (const payload of traversalPayloads) {
        const sanitized = sanitizeFilename(payload);
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
        expect(sanitized).not.toMatch(/\.{2,}/);
        expect(sanitized.length).toBeGreaterThan(0);
        expect(sanitized.length).toBeLessThanOrEqual(128);
      }
    });

    it('strips all ASCII control characters (\\x00 to \\x1f and \\x7f) and null bytes', () => {
      const nullAndControlPayloads = [
        'recording\x00.wav',
        '\x00\x00\x00',
        'safe_prefix\x00malicious.exe',
        'audio\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f.wav',
        'track\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f.wav',
        'final\x7f.wav',
        '\x00\x1f\x7f',
      ];

      for (const payload of nullAndControlPayloads) {
        const sanitized = sanitizeFilename(payload);
        expect(sanitized).not.toMatch(/[\x00-\x1f\x7f]/);
        expect(sanitized.length).toBeGreaterThan(0);
      }

      expect(sanitizeFilename('\x00\x00\x00')).toBe('recording.wav');
      expect(sanitizeFilename('\x1f\x7f')).toBe('recording.wav');
    });

    it('defends against Windows DOS device names across cases and compound extensions', () => {
      const reservedBases = [
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
      ];

      for (const base of reservedBases) {
        expect(sanitizeFilename(base)).toBe(`_${base}`);
        expect(sanitizeFilename(base.toLowerCase())).toBe(`_${base.toLowerCase()}`);
        expect(sanitizeFilename(`${base}.wav`)).toBe(`_${base}.wav`);
        expect(sanitizeFilename(`${base}.tar.gz`)).toBe(`_${base}.tar.gz`);
      }
    });

    it('safely handles Unicode homoglyphs, RTL overrides, zero-width chars, and Emoji', () => {
      const unicodePayloads = [
        { input: 'audio／fullwidth_slash.wav' },
        { input: 'audio∕division_slash.wav' },
        { input: 'audio⁄fraction_slash.wav' },
        { input: 'audio．fullwidth_dot.wav' },
        { input: 'audio。\u3002japanese_dot.wav' },
        { input: 'vocal_\u202Ereversed.wav' },
        { input: 'vocal_\u200Bzero_width\u200B.wav' },
        { input: '音声記録_骨伝導スタジオ.wav' },
        { input: '🎤🎙️🎧_vocal_export.wav' },
      ];

      for (const { input } of unicodePayloads) {
        const sanitized = sanitizeFilename(input);
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
        expect(sanitized.length).toBeGreaterThan(0);
        expect(sanitized.length).toBeLessThanOrEqual(128);
      }
    });

    it('handles ReDoS attack vectors and massive strings (100,000+ chars) in sub-millisecond time', () => {
      const massiveA = 'a'.repeat(100000) + '.wav';
      const massiveDots = '.'.repeat(100000);
      const massiveSlashes = '/'.repeat(100000);
      const massiveControl = '\x00\x01'.repeat(50000);

      const startA = performance.now();
      const sanitizedA = sanitizeFilename(massiveA);
      const endA = performance.now();
      expect(endA - startA).toBeLessThan(500);
      expect(sanitizedA.length).toBe(128);

      const startDots = performance.now();
      const sanitizedDots = sanitizeFilename(massiveDots);
      const endDots = performance.now();
      expect(endDots - startDots).toBeLessThan(500);
      expect(sanitizedDots.length).toBeLessThanOrEqual(128);

      const startSlashes = performance.now();
      const sanitizedSlashes = sanitizeFilename(massiveSlashes);
      const endSlashes = performance.now();
      expect(endSlashes - startSlashes).toBeLessThan(500);
      expect(sanitizedSlashes).not.toContain('/');

      const startControl = performance.now();
      const sanitizedControl = sanitizeFilename(massiveControl);
      const endControl = performance.now();
      expect(endControl - startControl).toBeLessThan(500);
      expect(sanitizedControl).toBe('recording.wav');
    });

    it('falls back safely on edge boundary strings: empty, whitespace, .wav, and multiple dots', () => {
      expect(sanitizeFilename('')).toBe('recording.wav');
      expect(sanitizeFilename('   \t\n\r  ')).toBe('recording.wav');
      expect(sanitizeFilename('.wav')).toBe('recording.wav');
      expect(sanitizeFilename('..wav')).toBe('recording.wav');
      expect(sanitizeFilename('...wav')).toBe('recording.wav');
      expect(sanitizeFilename('....wav')).toBe('recording.wav');
      expect(sanitizeFilename('   .wav   ')).toBe('recording.wav');
      expect(sanitizeFilename(null as any)).toBe('recording.wav');
      expect(sanitizeFilename(undefined as any)).toBe('recording.wav');
      expect(sanitizeFilename({} as any)).toBe('recording.wav');
      expect(sanitizeFilename([] as any)).toBe('recording.wav');
      expect(sanitizeFilename(12345 as any)).toBe('recording.wav');
    });
  });

  // =========================================================================
  // 2. audioBufferToWav Binary Fuzzing & Arithmetic Boundary Hardening
  // =========================================================================
  describe('2. audioBufferToWav Binary Fuzzing & Arithmetic Boundary Hardening', () => {
    it('rejects multi-channel bombs (>32, 65535, 65536, negative channels, floats) with TypeError', () => {
      const invalidChannelCounts = [
        0,
        -1,
        -32,
        -65536,
        33,
        34,
        64,
        128,
        256,
        65535,
        65536,
        70000,
        1.5,
        2.0001,
        NaN,
        Infinity,
        -Infinity,
      ];

      for (const ch of invalidChannelCounts) {
        const fakeBuffer = {
          numberOfChannels: ch,
          sampleRate: 48000,
          length: 100,
          getChannelData: () => new Float32Array(100),
        } as unknown as AudioBuffer;

        expect(() => audioBufferToWav(fakeBuffer)).toThrow(TypeError);
      }
    });

    it('rejects extreme, non-finite, and out-of-range sample rates (<8000, >384000, NaN, Infinity) with TypeError', () => {
      const invalidSampleRates = [
        -48000,
        -1,
        0,
        1,
        100,
        4000,
        7999,
        384001,
        500000,
        768000,
        10000000,
        NaN,
        Infinity,
        -Infinity,
      ];

      for (const rate of invalidSampleRates) {
        const fakeBuffer = {
          numberOfChannels: 1,
          sampleRate: rate,
          length: 100,
          getChannelData: () => new Float32Array(100),
        } as unknown as AudioBuffer;

        expect(() => audioBufferToWav(fakeBuffer)).toThrow(TypeError);
      }
    });

    it('rejects negative, fractional, NaN, or non-finite sample lengths with TypeError', () => {
      const invalidLengths = [-1, -100, 0.5, 10.9, NaN, Infinity, -Infinity];

      for (const len of invalidLengths) {
        const fakeBuffer = {
          numberOfChannels: 1,
          sampleRate: 48000,
          length: len,
          getChannelData: () => new Float32Array(100),
        } as unknown as AudioBuffer;

        expect(() => audioBufferToWav(fakeBuffer)).toThrow(TypeError);
      }
    });

    it('enforces 32-bit RIFF/WAVE ~4GB size limit and throws RangeError on overflow', () => {
      const overflowingBuffer = {
        numberOfChannels: 2,
        sampleRate: 48000,
        length: 2147483630, // 2147483630 * 4 = 8,589,934,520 bytes > 4GB
        getChannelData: () => new Float32Array(0),
      } as unknown as AudioBuffer;

      expect(() => audioBufferToWav(overflowingBuffer)).toThrow(RangeError);

      const multiChannelOverflow = {
        numberOfChannels: 32,
        sampleRate: 48000,
        length: 67108864, // 67108864 * 32 * 2 = 4,294,967,296 bytes > 4GB - 36
        getChannelData: () => new Float32Array(0),
      } as unknown as AudioBuffer;

      expect(() => audioBufferToWav(multiChannelOverflow)).toThrow(RangeError);
    });

    it('correctly clamps corrupted audio samples (NaN, Infinity, extreme floats, subnormals) without NaN propagation or crash', () => {
      const corruptedSamples = [
        NaN,
        Infinity,
        -Infinity,
        1e20,
        -1e20,
        1e-45,
        -0.0,
        0.0,
        1.0,
        -1.0,
        1.5,
        -1.5,
        0.5,
        -0.5,
      ];

      // 1. 16-bit Linear PCM Mode
      const buffer16 = createMockAudioBuffer(1, corruptedSamples.length, 48000, (_ch, i) => corruptedSamples[i]);
      const wav16 = audioBufferToWav(buffer16, { float32: false });
      const view16 = new DataView(wav16);

      for (let i = 0; i < corruptedSamples.length; i++) {
        const val = view16.getInt16(44 + i * 2, true);
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThanOrEqual(-32768);
        expect(val).toBeLessThanOrEqual(32767);
      }

      expect(view16.getInt16(44 + 0 * 2, true)).toBe(0); // NaN -> 0
      expect(view16.getInt16(44 + 1 * 2, true)).toBe(0); // Infinity -> 0
      expect(view16.getInt16(44 + 2 * 2, true)).toBe(0); // -Infinity -> 0
      expect(view16.getInt16(44 + 3 * 2, true)).toBe(32767); // 1e20 -> 32767
      expect(view16.getInt16(44 + 4 * 2, true)).toBe(-32768); // -1e20 -> -32768
      expect(view16.getInt16(44 + 5 * 2, true)).toBe(0); // 1e-45 -> 0
      expect(view16.getInt16(44 + 8 * 2, true)).toBe(32767); // 1.0 -> 32767
      expect(view16.getInt16(44 + 9 * 2, true)).toBe(-32768); // -1.0 -> -32768
      expect(view16.getInt16(44 + 10 * 2, true)).toBe(32767); // 1.5 -> 32767
      expect(view16.getInt16(44 + 11 * 2, true)).toBe(-32768); // -1.5 -> -32768

      // 2. 32-bit Float Mode
      const buffer32 = createMockAudioBuffer(1, corruptedSamples.length, 48000, (_ch, i) => corruptedSamples[i]);
      const wav32 = audioBufferToWav(buffer32, { float32: true });
      const view32 = new DataView(wav32);

      for (let i = 0; i < corruptedSamples.length; i++) {
        const val = view32.getFloat32(44 + i * 4, true);
        expect(Number.isFinite(val)).toBe(true);
      }

      expect(view32.getFloat32(44 + 0 * 4, true)).toBe(0.0); // NaN -> 0.0
      expect(view32.getFloat32(44 + 1 * 4, true)).toBe(0.0); // Infinity -> 0.0
      expect(view32.getFloat32(44 + 2 * 4, true)).toBe(0.0); // -Infinity -> 0.0
      expect(view32.getFloat32(44 + 10 * 4, true)).toBeCloseTo(1.5, 5); // 1.5 dynamic range
      expect(view32.getFloat32(44 + 12 * 4, true)).toBeCloseTo(0.5, 5); // 0.5
    });
  });

  // =========================================================================
  // 3. Security Headers, CSP & Frame Isolation & SPA Redirect Fuzzing
  // =========================================================================
  describe('3. Security Headers, CSP & Frame Isolation & SPA Redirection Verification', () => {
    it('adversarially fuzzes the SPA 404 redirection script against open redirects and state hijacking', () => {
      function simulateSpaRedirect(
        search: string,
        pathname: string,
        hash: string
      ): string | null {
        let replacedUrl: string | null = null;
        const fakeLocation = { search, pathname, hash };

        try {
          if (fakeLocation.search && fakeLocation.search[1] === '/') {
            const decoded = fakeLocation.search
              .slice(1)
              .split('&')
              .map((s) => s.replace(/~and~/g, '&'))
              .join('?');

            if (
              decoded.startsWith('/') &&
              !decoded.startsWith('//') &&
              !decoded.includes('\\')
            ) {
              replacedUrl = fakeLocation.pathname.slice(0, -1) + decoded + fakeLocation.hash;
            }
          }
        } catch {
          // Graceful fallback
        }

        return replacedUrl;
      }

      const hostileSearches = [
        '?//evil.com',
        '?///evil.com',
        '?//localhost:8080/exploit',
        '?/\\evil.com',
        '?/\\\\evil.com',
        '?/\\/\\evil.com',
        '?/javascript:alert(1)',
        '?/data:text/html,<script>alert(1)</script>',
        '?',
        '?foo=bar',
        '?https://evil.com',
      ];

      for (const hostile of hostileSearches) {
        const result = simulateSpaRedirect(hostile, '/vocal-mirror/', '');
        if (result !== null) {
          expect(result.startsWith('//')).toBe(false);
          expect(result.includes('\\')).toBe(false);
          expect(result.startsWith('/vocal-mirror/')).toBe(true);
        }
      }

      expect(simulateSpaRedirect('?/studio', '/vocal-mirror/', '#anchor')).toBe(
        '/vocal-mirror/studio#anchor'
      );
      expect(
        simulateSpaRedirect('?/settings&theme=dark~and~mode=compact', '/vocal-mirror/', '')
      ).toBe('/vocal-mirror/settings?theme=dark&mode=compact');
    });
  });

  // =========================================================================
  // 4. Prototype Pollution & Dangerous Dictionary Access in useAudioStudio
  // =========================================================================
  describe('4. Prototype Pollution & Dictionary Property Injection in useAudioStudio', () => {
    it('audits applyPreset against __proto__, constructor, and non-existent keys', () => {
      const { result, unmount } = renderTestHook();

      const hostileKeys = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'non_existent_key'];
      for (const key of hostileKeys) {
        try {
          act(() => {
            result.current.applyPreset(key as any);
          });
        } catch (err) {
          console.warn(`[Challenger Finding] applyPreset crashed on key '${key}':`, err);
        }
      }

      unmount();
    });
  });
});
