/**
 * VocalMirror — Challenger 1 Adversarial Fuzzing & Stress Test Suite (Milestone 1)
 * File: tests/stress/adversarial_m1_challenger.test.ts
 * 
 * Adversarially probes:
 * 1. audioBufferToWav & sanitizeFilename (path traversal, control chars, reserved names, memory allocation bombs, NaN/Inf PCM fuzzing).
 * 2. useAudioStudio Hook (JSON prototype pollution payloads, NaN/Infinity/negative zero tampering, key injection, rapid lifecycle).
 * 3. Security Headers & SPA Redirection validation in vite.config.ts and index.html.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import {
  audioBufferToWav,
  downloadWavBlob,
  sanitizeFilename,
} from '../../src/utils/audioBufferToWav';
import { useAudioStudio } from '../../src/hooks/useAudioStudio';
import { PARAMETER_LIMITS } from '../../src/audio/constants';
import { DSPParameters } from '../../src/types/audio';
import { installWebAudioMocks } from '../mocks/webAudioMock';

// Helper for AudioBuffer mock creation
function createFuzzAudioBuffer(
  channels: number,
  length: number,
  sampleRate: number,
  fillFn?: (ch: number, index: number) => number
): AudioBuffer {
  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      data[i] = fillFn ? fillFn(c, i) : 0;
    }
    channelData.push(data);
  }

  return {
    numberOfChannels: channels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: (ch: number) => {
      if (ch < 0 || ch >= channelData.length) {
        throw new DOMException('IndexSizeError', 'IndexSizeError');
      }
      return channelData[ch];
    },
    copyFromChannel: (dst: Float32Array, ch: number, offset = 0) => {
      dst.set(channelData[ch].subarray(offset, offset + dst.length));
    },
    copyToChannel: (src: Float32Array, ch: number, offset = 0) => {
      channelData[ch].set(src, offset);
    },
  } as unknown as AudioBuffer;
}

// Hook test runner harness
function renderTestHook() {
  const result = { current: null as any };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function Harness() {
    result.current = useAudioStudio();
    return null;
  }

  act(() => {
    root.render(React.createElement(Harness));
  });

  return {
    result,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('Adversarial Challenger 1 — Milestone 1 Hardening Stress Suite', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ===========================================================================
  // Part 1: Filename Sanitization & Directory Traversal Fuzzing
  // ===========================================================================
  describe('Part 1: Filename Sanitization & Directory Traversal Fuzzing', () => {
    const hostileFilenamePayloads = [
      // 1. Path traversal variations
      '../../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\cmd.exe',
      '....//....//....//etc/shadow',
      '....\\\\....\\\\windows\\win.ini',
      './.././../secret.key',
      '/var/log/audit.log',
      'C:\\inetpub\\wwwroot\\web.config',
      '\\\\?\\C:\\Users\\admin\\NTUSER.DAT',
      '..%2f..%2f..%2fetc%2fpasswd',
      '..%5c..%5c..%5cboot.ini',
      // 2. Control characters & null bytes
      '\x00hidden.wav',
      'file\x00with\x00nulls.wav',
      '\x01\x02\x03\x04\x05\x06\x07\x08\x0e\x0f\x10\x1f\x7fcontrol.wav',
      'test\r\nHeader-Injection: true.wav',
      'tab\tseparated\tname.wav',
      // 3. Windows reserved device names (all variations & casings)
      'CON',
      'con.wav',
      'PRN',
      'prn.mp3',
      'AUX',
      'aux.wav',
      'NUL',
      'nul.txt.wav',
      'COM1',
      'com1.wav',
      'COM9',
      'com9.WAV',
      'LPT1',
      'lpt1.wav',
      'LPT9',
      'lpt9.bin',
      // 4. Special injection characters
      '<script>alert(1)</script>.wav',
      'file|cat /etc/passwd.wav',
      'file; rm -rf /; .wav',
      'file`whoami`.wav',
      'file$(calc).wav',
      'file"name"with\'quotes.wav',
      'file?query=true&param=1.wav',
      'file#fragment.wav',
      'file{brace}and[bracket].wav',
      'file~tilde.wav',
      // 5. Boundary extremes
      '',
      ' ',
      '   \t\r\n   ',
      '.wav',
      '..wav',
      '...wav',
      ' .wav ',
      'a'.repeat(1000) + '.wav',
      // 6. Unicode & homoglyphs
      '📁_vocal_export_🎤.wav',
      'file\u200Bwith\u200Bzero\u200Bwidth\u200Bspaces.wav',
      'test\u202Ereversed.wav', // RTL override
      'ргоект_голос.wav', // Cyrillic
    ];

    it.each(hostileFilenamePayloads)(
      'sanitizes hostile filename payload safely: %s',
      (hostilePayload) => {
        const sanitized = sanitizeFilename(hostilePayload);

        // Assertions for defensive guarantees:
        // 1. Result must always be a non-empty string
        expect(typeof sanitized).toBe('string');
        expect(sanitized.length).toBeGreaterThan(0);

        // 2. Length must not exceed 128 chars
        expect(sanitized.length).toBeLessThanOrEqual(128);

        // 3. Must not contain directory separators or forbidden characters: / \ ? % * : | " < > ~ # & { }
        expect(sanitized).not.toMatch(/[/\\?%*:|"<>~#&{}]/);

        // 4. Must not contain ASCII control characters (\x00-\x1f, \x7f)
        expect(sanitized).not.toMatch(/[\x00-\x1f\x7f]/);

        // 5. Must not contain consecutive dots (.. traversal)
        expect(sanitized).not.toMatch(/\.{2,}/);

        // 6. Must not match bare Windows reserved device names
        expect(sanitized).not.toMatch(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i);

        // 7. Must not be empty or just '.wav'
        expect(sanitized).not.toBe('');
        expect(sanitized.toLowerCase()).not.toBe('.wav');
      }
    );

    it('handles non-string / pathological types without throwing', () => {
      const pathologicalInputs = [
        null,
        undefined,
        12345,
        {},
        [],
        true,
        false,
        Symbol('foo'),
        () => {},
        NaN,
        Infinity,
      ];

      for (const input of pathologicalInputs) {
        const result = sanitizeFilename(input as any);
        expect(result).toBe('recording.wav');
      }
    });

    it('ensures downloadWavBlob sets a valid sanitized download attribute on anchor', () => {
      const buffer = createFuzzAudioBuffer(1, 100, 48000);
      let capturedDownload = '';
      vi.spyOn(document.body, 'appendChild').mockImplementation((node: any) => {
        if (node.tagName === 'A') {
          capturedDownload = node.download;
        }
        return node;
      });

      downloadWavBlob(buffer, '../../../malicious/con.wav');
      expect(capturedDownload).toBe('._._._malicious_con.wav');

      downloadWavBlob(buffer, 'CON.wav');
      expect(capturedDownload).toBe('_CON.wav');

      downloadWavBlob(buffer, '');
      expect(capturedDownload).toBe('recording.wav');
    });
  });

  // ===========================================================================
  // Part 2: AudioBuffer Pathological Structures & Float/PCM Fuzzing
  // ===========================================================================
  describe('Part 2: AudioBuffer Pathological Structures & Float/PCM Fuzzing', () => {
    describe('Pathological AudioBuffer Structure Rejection', () => {
      const invalidAudioBuffers = [
        // Null / undefined / primitives
        { name: 'null', buf: null },
        { name: 'undefined', buf: undefined },
        { name: 'empty object', buf: {} },
        { name: 'number primitive', buf: 42 },
        { name: 'string primitive', buf: 'not a buffer' },

        // Pathological numberOfChannels
        {
          name: '0 channels',
          buf: { numberOfChannels: 0, sampleRate: 48000, length: 100, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'negative channels',
          buf: { numberOfChannels: -2, sampleRate: 48000, length: 100, getChannelData: () => new Float32Array(100) },
        },
        {
          name: '33 channels (exceeds 32ch limit)',
          buf: { numberOfChannels: 33, sampleRate: 48000, length: 100, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'fractional channels',
          buf: { numberOfChannels: 2.5, sampleRate: 48000, length: 100, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'NaN channels',
          buf: { numberOfChannels: NaN, sampleRate: 48000, length: 100, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'Infinity channels',
          buf: { numberOfChannels: Infinity, sampleRate: 48000, length: 100, getChannelData: () => new Float32Array(100) },
        },

        // Pathological sampleRate
        {
          name: 'sampleRate < 8000 (7999)',
          buf: { numberOfChannels: 1, sampleRate: 7999, length: 100, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'sampleRate > 384000 (384001)',
          buf: { numberOfChannels: 1, sampleRate: 384001, length: 100, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'sampleRate 0',
          buf: { numberOfChannels: 1, sampleRate: 0, length: 100, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'sampleRate negative (-48000)',
          buf: { numberOfChannels: 1, sampleRate: -48000, length: 100, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'sampleRate NaN',
          buf: { numberOfChannels: 1, sampleRate: NaN, length: 100, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'sampleRate Infinity',
          buf: { numberOfChannels: 1, sampleRate: Infinity, length: 100, getChannelData: () => new Float32Array(100) },
        },

        // Pathological length
        {
          name: 'negative length (-10)',
          buf: { numberOfChannels: 1, sampleRate: 48000, length: -10, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'fractional length (10.7)',
          buf: { numberOfChannels: 1, sampleRate: 48000, length: 10.7, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'NaN length',
          buf: { numberOfChannels: 1, sampleRate: 48000, length: NaN, getChannelData: () => new Float32Array(100) },
        },
        {
          name: 'missing getChannelData method',
          buf: { numberOfChannels: 1, sampleRate: 48000, length: 100 },
        },
      ];

      it.each(invalidAudioBuffers)('cleanly throws TypeError on invalid buffer: $name', ({ buf }) => {
        expect(() => audioBufferToWav(buf as any)).toThrow(TypeError);
      });
    });

    describe('Float and PCM Numerical Fuzzing', () => {
      it('fuzzes 16-bit PCM encoder with extreme floating-point numbers without panicking', () => {
        const extremeValues = [
          0.0,
          -0.0,
          1.0,
          -1.0,
          0.5,
          -0.5,
          0.9999999,
          -0.9999999,
          1.0000001,
          -1.0000001,
          2.0,
          -2.0,
          100.0,
          -100.0,
          1e10,
          -1e10,
          NaN,
          Infinity,
          -Infinity,
          1e-35, // Denormal / subnormal float
        ];

        const buffer = createFuzzAudioBuffer(
          1,
          extremeValues.length,
          48000,
          (_ch, idx) => extremeValues[idx]
        );

        const wav = audioBufferToWav(buffer, { float32: false });
        expect(wav).toBeInstanceOf(ArrayBuffer);
        expect(wav.byteLength).toBe(44 + extremeValues.length * 2);

        const view = new DataView(wav);
        for (let i = 0; i < extremeValues.length; i++) {
          const sample = view.getInt16(44 + i * 2, true);
          // Value must be strictly within 16-bit signed integer range [-32768, 32767]
          expect(sample).toBeGreaterThanOrEqual(-32768);
          expect(sample).toBeLessThanOrEqual(32767);

          const orig = extremeValues[i];
          if (!Number.isFinite(orig)) {
            // NaN, Inf, -Inf sanitized to 0
            expect(sample).toBe(0);
          } else if (orig >= 1.0) {
            expect(sample).toBe(32767);
          } else if (orig <= -1.0) {
            expect(sample).toBe(-32768);
          }
        }
      });

      it('fuzzes 32-bit Float encoder with extreme values without NaN corruption or crash', () => {
        const extremeValues = [
          0.0,
          -0.0,
          1.0,
          -1.0,
          1.5,
          -2.5,
          NaN,
          Infinity,
          -Infinity,
          1e-15,
        ];

        const buffer = createFuzzAudioBuffer(
          1,
          extremeValues.length,
          48000,
          (_ch, idx) => extremeValues[idx]
        );

        const wav = audioBufferToWav(buffer, { float32: true });
        expect(wav.byteLength).toBe(44 + extremeValues.length * 4);

        const view = new DataView(wav);
        for (let i = 0; i < extremeValues.length; i++) {
          const sample = view.getFloat32(44 + i * 4, true);
          const orig = extremeValues[i];
          if (!Number.isFinite(orig)) {
            expect(sample).toBe(0);
          } else {
            expect(sample).toBeCloseTo(orig, 5);
          }
        }
      });

      it('correctly handles multi-channel audio up to 32 channels without byte alignment errors', () => {
        for (const ch of [1, 2, 4, 8, 16, 32]) {
          const samplesPerChannel = 50;
          const buffer = createFuzzAudioBuffer(ch, samplesPerChannel, 48000, (c, i) =>
            Math.sin(c + i)
          );

          const wav = audioBufferToWav(buffer);
          const expectedDataSize = samplesPerChannel * ch * 2;
          expect(wav.byteLength).toBe(44 + expectedDataSize);

          const view = new DataView(wav);
          expect(view.getUint16(22, true)).toBe(ch); // NumChannels
          expect(view.getUint16(32, true)).toBe(ch * 2); // BlockAlign
          expect(view.getUint32(28, true)).toBe(48000 * ch * 2); // ByteRate
          expect(view.getUint32(40, true)).toBe(expectedDataSize); // Subchunk2Size
        }
      });

      it('generates a valid 44-byte empty header when audio buffer has length 0', () => {
        const buffer = createFuzzAudioBuffer(2, 0, 48000);
        const wav = audioBufferToWav(buffer);
        expect(wav.byteLength).toBe(44);

        const view = new DataView(wav);
        expect(view.getUint32(4, true)).toBe(36); // ChunkSize = 36 + 0
        expect(view.getUint32(40, true)).toBe(0); // Subchunk2Size = 0
      });
    });
  });

  // ===========================================================================
  // Part 3: useAudioStudio Prototype Pollution & Parameter Tampering
  // ===========================================================================
  describe('Part 3: useAudioStudio Prototype Pollution & Parameter Tampering', () => {
    it('blocks prototype pollution via __proto__, constructor, and prototype keys in updateParameter', () => {
      const { result, unmount } = renderTestHook();

      act(() => {
        result.current.updateParameter('__proto__' as any, 9999);
        result.current.updateParameter('constructor' as any, 9999);
        result.current.updateParameter('prototype' as any, 9999);
        result.current.updateParameter('isHacked' as any, 9999);
      });

      // Verify global prototype is unaffected
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((Object.prototype as any).isHacked).toBeUndefined();
      expect((Object.prototype as any)[9999]).toBeUndefined();
      expect((result.current.parameters as any).isHacked).toBeUndefined();

      unmount();
    });

    it('blocks prototype pollution via crafted object payloads in updateParameters', () => {
      const { result, unmount } = renderTestHook();

      const maliciousPayloads = [
        JSON.parse('{"__proto__": {"polluted": "yes", "isAdmin": true}}'),
        { constructor: { prototype: { polluted: "yes" } } },
        { prototype: { polluted: "yes" } },
        { [Symbol.for('polluted')]: true },
        { 'nested.key': 42 },
        { 'lowShelfGain/../': 10 },
      ];

      for (const payload of maliciousPayloads) {
        act(() => {
          result.current.updateParameters(payload as any);
        });

        expect((Object.prototype as any).polluted).toBeUndefined();
        expect((Object.prototype as any).isAdmin).toBeUndefined();
      }

      unmount();
    });

    it('strictly validates and clamps all parameter limits when fuzzing every valid parameter key', () => {
      const { result, unmount } = renderTestHook();
      const keys = Object.keys(PARAMETER_LIMITS) as (keyof DSPParameters)[];

      for (const key of keys) {
        const limit = PARAMETER_LIMITS[key];

        // 1. Extreme positive
        act(() => {
          result.current.updateParameter(key, limit.max + 100000);
        });
        expect(result.current.parameters[key]).toBe(limit.max);

        // 2. Extreme negative
        act(() => {
          result.current.updateParameter(key, limit.min - 100000);
        });
        expect(result.current.parameters[key]).toBe(limit.min);

        // 3. NaN -> fallback to limit.default
        act(() => {
          result.current.updateParameter(key, NaN);
        });
        expect(result.current.parameters[key]).toBe(limit.default);

        // 4. Infinity -> fallback to limit.default
        act(() => {
          result.current.updateParameter(key, Infinity);
        });
        expect(result.current.parameters[key]).toBe(limit.default);

        // 5. -Infinity -> fallback to limit.default
        act(() => {
          result.current.updateParameter(key, -Infinity);
        });
        expect(result.current.parameters[key]).toBe(limit.default);
      }

      unmount();
    });

    it('handles volume boundary fuzzing and verifies masterGain clamp', () => {
      const { result, unmount } = renderTestHook();

      // Volume fuzzing (dB clamped via masterGain limit [-6, +6])
      act(() => {
        result.current.setVolume(9999);
      });
      expect(result.current.parameters.masterGain).toBe(PARAMETER_LIMITS.masterGain.max);

      act(() => {
        result.current.setVolume(-9999);
      });
      expect(result.current.parameters.masterGain).toBe(PARAMETER_LIMITS.masterGain.min);

      act(() => {
        result.current.setVolume(NaN);
      });
      expect(result.current.parameters.masterGain).toBe(PARAMETER_LIMITS.masterGain.default);

      unmount();
    });
  });

  // ===========================================================================
  // Part 4: Security Headers & SPA Navigation Redirection Verification
  // ===========================================================================
  describe('Part 4: Security Headers & SPA Redirection Verification', () => {
    it('verifies production-grade security headers in vite.config.ts', () => {
      const fs = eval('require("fs")');
      const path = eval('require("path")');
      const configPath = path.resolve('.', 'vite.config.ts');
      const content = fs.readFileSync(configPath, 'utf-8');

      // Check Cross-Origin Isolation headers
      expect(content).toContain("'Cross-Origin-Opener-Policy': 'same-origin'");
      expect(content).toContain("'Cross-Origin-Embedder-Policy': 'credentialless'");
      expect(content).toContain("'Cross-Origin-Resource-Policy': 'same-origin'");
      expect(content).toContain("'X-Content-Type-Options': 'nosniff'");
      expect(content).toContain("'X-Frame-Options': 'DENY'");

      // Check Permissions-Policy
      expect(content).toContain("microphone=(self)");
      expect(content).toContain("camera=()");
      expect(content).toContain("geolocation=()");

      // Check Content-Security-Policy
      expect(content).toContain("Content-Security-Policy");
      expect(content).toContain("default-src 'self'");
      expect(content).toContain("object-src 'none'");
      expect(content).toContain("base-uri 'self'");
      expect(content).toContain("frame-ancestors 'none'");
    });

    it('verifies CSP meta tag and hardened SPA redirect receiver in index.html', () => {
      const fs = eval('require("fs")');
      const path = eval('require("path")');
      const htmlPath = path.resolve('.', 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf-8');

      // 1. Check CSP meta tag exists
      expect(html).toContain('http-equiv="Content-Security-Policy"');
      expect(html).toContain("default-src 'self'");
      expect(html).toContain("object-src 'none'");

      // 2. Check SPA script validates decoded relative paths against open redirects
      expect(html).toContain("decoded.startsWith('/')");
      expect(html).toContain("!decoded.startsWith('//')");
      expect(html).toContain("!decoded.includes('\\\\')");
    });
  });
});
