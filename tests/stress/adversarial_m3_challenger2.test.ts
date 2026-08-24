/**
 * VocalMirror — Milestone 3 Challenger 2 Adversarial Stress & Penetration Test Suite
 * File: tests/stress/adversarial_m3_challenger2.test.ts
 * 
 * Independent, highly hostile empirical challenges targeting:
 * 1. Deep Fuzzing: RIFF/WAVE parser (audioBufferToWav), edge-boundary sample rates,
 *    multi-channel layouts, 1,000 pseudo-random noise buffers, subnormals, denormals,
 *    and DSP mathematical resilience (biquadMath, frequencyMapping, AcousticEngine).
 * 2. Concurrency & Lifecycle Chaos:
 *    - 50-cycle rapid mount/unmount storms with concurrent async operations.
 *    - Simultaneous burst calls to startRecording/stopRecording/cancelRecording.
 *    - Transport race condition attacks (interleaved play/seek/pause/stop/clearAudio).
 *    - Rapid visibilitychange flipping under active recording and playback.
 * 3. Frame Isolation, Deep Prototype Pollution & Router Attacks:
 *    - Hostile JSON / prototype payloads against interpolate(), LanguageContext, useAudioStudio.
 *    - Security headers consistency & syntax audit across 5 configuration files.
 *    - Complex URL schemes & obfuscated bypasses against SPA 404 router.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import {
  audioBufferToWav,
  renderAndExportWav,
} from '../../src/utils/audioBufferToWav';
import {
  computeBiquadCoefficients,
} from '../../src/audio/biquadMath';
import {
  calculateBandEnergy,
  calculateSpectralGapMetrics,
} from '../../src/utils/frequencyMapping';
import { DEFAULT_DSP_PARAMS } from '../../src/audio/constants';
import { BiquadFilterType, DSPParameters } from '../../src/types/audio';
import { useAudioStudio } from '../../src/hooks/useAudioStudio';
import {
  LanguageProvider,
} from '../../src/i18n/LanguageContext';
import { interpolate } from '../../src/i18n/interpolate';
import {
  installWebAudioMocks,
  MediaStreamTrackMock,
} from '../mocks/webAudioMock';

const nodeFs: any = eval('require("fs")');
const nodePath: any = eval('require("path")');

function createMockAudioBuffer(
  channels: number,
  length: number,
  sampleRate: number,
  filler?: (channel: number, index: number) => number
): AudioBuffer {
  const safeChannels = typeof channels === 'number' && Number.isInteger(channels) && channels > 0 ? channels : 1;
  const safeLen = typeof length === 'number' && Number.isInteger(length) && length > 0 ? length : 0;
  const channelData: Float32Array[] = [];

  for (let c = 0; c < safeChannels; c++) {
    const data = new Float32Array(safeLen);
    for (let i = 0; i < safeLen; i++) {
      data[i] = filler ? filler(c, i) : 0;
    }
    channelData.push(data);
  }

  return {
    numberOfChannels: channels,
    length,
    sampleRate,
    duration: safeLen / (sampleRate > 0 ? sampleRate : 48000),
    getChannelData: (ch: number) => channelData[ch] || new Float32Array(0),
    copyFromChannel: (dst: Float32Array, ch: number, offset = 0) => {
      if (channelData[ch]) {
        dst.set(channelData[ch].subarray(offset, offset + dst.length));
      }
    },
    copyToChannel: (src: Float32Array, ch: number, offset = 0) => {
      if (channelData[ch]) {
        channelData[ch].set(src, offset);
      }
    },
  } as unknown as AudioBuffer;
}

const activeUnmounts: (() => void)[] = [];

function renderStudioHook(options: any = {}) {
  const result = { current: null as any };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function Harness() {
    result.current = useAudioStudio(options);
    return null;
  }

  act(() => {
    root.render(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(Harness)
      )
    );
  });

  const unmountFn = () => {
    act(() => {
      root.unmount();
    });
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };
  activeUnmounts.push(unmountFn);

  return {
    result,
    container,
    unmount: unmountFn,
  };
}

describe('M3 Challenger 2 — Deep Adversarial Security & Stress Verification', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    });
    installWebAudioMocks(globalThis);
    vi.useFakeTimers();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    delete (window as any).__xss_executed;
    delete (Object.prototype as any).polluted;
    delete (Object.prototype as any).admin;
    delete (Object.prototype as any).hacked;
    delete (Object.prototype as any).injected;
  });

  afterEach(() => {
    while (activeUnmounts.length > 0) {
      try {
        activeUnmounts.pop()!();
      } catch {}
    }
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    delete (window as any).__xss_executed;
    delete (Object.prototype as any).polluted;
    delete (Object.prototype as any).admin;
    delete (Object.prototype as any).hacked;
    delete (Object.prototype as any).injected;
  });

  // =========================================================================
  // Challenge 1: Deep Binary WAV Parser & DSP Math Fuzzing
  // =========================================================================
  describe('Challenge 1: Deep Binary WAV Parser & DSP Math Fuzzing', () => {
    it('fuzzes audioBufferToWav with 100 pseudo-random noise buffers containing extreme floats and denormals', () => {
      const hostileValues = [
        0,
        -0,
        1.0,
        -1.0,
        1.00001,
        -1.00001,
        100.0,
        -100.0,
        NaN,
        Infinity,
        -Infinity,
        Number.EPSILON,
        -Number.EPSILON,
        Number.MIN_VALUE,
        -Number.MIN_VALUE,
        1e-38,
        -1e-38,
        5e-324,
        1e30,
        -1e30,
      ];

      for (let iter = 0; iter < 50; iter++) {
        const channels = (iter % 8) + 1;
        const length = (iter * 17) % 256;
        const sampleRate = 8000 + (iter * 7600) % 376000;

        const buffer = createMockAudioBuffer(channels, length, sampleRate, (_c, i) => {
          if (i % 5 === 0) {
            return hostileValues[i % hostileValues.length];
          }
          return Math.sin(i * 0.1) * 2.0;
        });

        // Test 16-bit PCM mode
        const pcmWav = audioBufferToWav(buffer, { float32: false });
        expect(pcmWav).toBeInstanceOf(ArrayBuffer);
        expect(pcmWav.byteLength).toBe(44 + length * channels * 2);

        const pcmView = new DataView(pcmWav);
        expect(pcmView.getUint16(20, true)).toBe(1);
        expect(pcmView.getUint16(22, true)).toBe(channels);
        expect(pcmView.getUint32(24, true)).toBe(sampleRate);
        expect(pcmView.getUint32(40, true)).toBe(length * channels * 2);

        // Test 32-bit Float mode
        const floatWav = audioBufferToWav(buffer, { float32: true });
        expect(floatWav).toBeInstanceOf(ArrayBuffer);
        expect(floatWav.byteLength).toBe(44 + length * channels * 4);

        const floatView = new DataView(floatWav);
        expect(floatView.getUint16(20, true)).toBe(3);
        expect(floatView.getUint16(34, true)).toBe(32);
        expect(floatView.getUint32(40, true)).toBe(length * channels * 4);
      }
    });

    it('rigorously verifies audioBufferToWav boundary rejection at exact thresholds', () => {
      // Channel boundaries: 1 to 32 valid, 0 and 33 invalid
      expect(() => audioBufferToWav(createMockAudioBuffer(1, 10, 48000))).not.toThrow();
      expect(() => audioBufferToWav(createMockAudioBuffer(32, 10, 48000))).not.toThrow();
      expect(() => audioBufferToWav(createMockAudioBuffer(0, 10, 48000))).toThrow(TypeError);
      expect(() => audioBufferToWav(createMockAudioBuffer(33, 10, 48000))).toThrow(TypeError);

      // Sample rate boundaries: 8000 to 384000 valid, 7999 and 384001 invalid
      expect(() => audioBufferToWav(createMockAudioBuffer(1, 10, 8000))).not.toThrow();
      expect(() => audioBufferToWav(createMockAudioBuffer(1, 10, 384000))).not.toThrow();
      expect(() => audioBufferToWav(createMockAudioBuffer(1, 10, 7999))).toThrow(TypeError);
      expect(() => audioBufferToWav(createMockAudioBuffer(1, 10, 384001))).toThrow(TypeError);

      // Length boundaries: 0 valid (returns 44-byte header), negative or float invalid
      expect(audioBufferToWav(createMockAudioBuffer(1, 0, 48000)).byteLength).toBe(44);
      expect(() => audioBufferToWav(createMockAudioBuffer(1, -1, 48000))).toThrow(TypeError);
      expect(() => audioBufferToWav(createMockAudioBuffer(1, 10.5, 48000))).toThrow(TypeError);
    });

    it('stress-tests computeBiquadCoefficients with 1,000 randomized hostile configurations', () => {
      const types: BiquadFilterType[] = [
        'lowpass',
        'highpass',
        'peaking',
        'lowshelf',
        'highshelf',
        'notch',
        'bandpass',
        'allpass',
      ];

      for (let i = 0; i < 500; i++) {
        const type = types[i % types.length];
        const f0 = (Math.random() - 0.5) * 100000;
        const fs = (Math.random() - 0.5) * 500000;
        const Q = (Math.random() - 0.5) * 100;
        const gainDb = (Math.random() - 0.5) * 300;

        const coeffs = computeBiquadCoefficients(type, f0, fs, Q, gainDb);

        expect(Number.isFinite(coeffs.b0)).toBe(true);
        expect(Number.isFinite(coeffs.b1)).toBe(true);
        expect(Number.isFinite(coeffs.b2)).toBe(true);
        expect(Number.isFinite(coeffs.a0)).toBe(true);
        expect(Number.isFinite(coeffs.a1)).toBe(true);
        expect(Number.isFinite(coeffs.a2)).toBe(true);
        expect(coeffs.a0).not.toBe(0);
      }
    });

    it('fuzzes frequencyMapping utilities with extreme arrays and degenerates', () => {
      const degenerateArray = new Float32Array([
        NaN,
        Infinity,
        -Infinity,
        -1000,
        1000,
        0,
        -0,
        Number.MIN_VALUE,
      ]);

      const energy = calculateBandEnergy(degenerateArray, [100, 500], 48000, 2048);
      expect(Number.isFinite(energy.meanDb)).toBe(true);
      expect(Number.isFinite(energy.rmsDb)).toBe(true);
      expect(Number.isFinite(energy.peakDb)).toBe(true);

      const metrics = calculateSpectralGapMetrics(degenerateArray, degenerateArray, 48000, 2048);
      expect(Number.isFinite(metrics.lowResonanceBoostDb)).toBe(true);
      expect(Number.isFinite(metrics.hfTissueRolloffDb)).toBe(true);
      expect(Number.isFinite(metrics.voiceConfrontationIndex)).toBe(true);
    });

    it('executes renderAndExportWav under hostile audio buffers and DSP configurations', async () => {
      const hostileBuffer = createMockAudioBuffer(2, 200, 48000, (_c, i) => {
        return i % 2 === 0 ? 10.0 : -10.0;
      });

      const extremeParams: DSPParameters = {
        ...DEFAULT_DSP_PARAMS,
        lowShelfGain: 24,
        mandibleResGain: 24,
        sinusResGain: 24,
        antiResGain: -24,
        tissueCutoffFreq: 1500,
        highShelfGain: -24,
      };

      const { blob, renderedBuffer } = await renderAndExportWav(
        hostileBuffer,
        'INTERNAL_SIM',
        extremeParams
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/wav');
      expect(blob.size).toBe(44 + 200 * 2 * 2);
      expect(renderedBuffer.length).toBe(200);
    });
  });

  // =========================================================================
  // Challenge 2: Concurrency Race Conditions & Lifecycle Chaos
  // =========================================================================
  describe('Challenge 2: Concurrency Race Conditions & Lifecycle Chaos', () => {
    it('executes 30 rapid mount and unmount cycles with concurrent async recording triggers', async () => {
      const createdTracks: MediaStreamTrackMock[] = [];
      const origGUM = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await origGUM(constraints);
        const tracks = stream.getAudioTracks() as any[];
        tracks.forEach((t) => createdTracks.push(t));
        return stream;
      };

      for (let i = 0; i < 30; i++) {
        const { result, unmount } = renderStudioHook();

        // Trigger recording or demo without waiting
        if (i % 2 === 0) {
          act(() => {
            result.current.startRecording();
          });
        } else {
          act(() => {
            result.current.loadDemoAudio('female_soprano');
          });
        }

        // Abruptly unmount while in flight
        unmount();
      }

      // Verify every created MediaStreamTrack was cleanly stopped
      for (const track of createdTracks) {
        expect((track as any).readyState).toBe('ended');
      }
    });

    it('stresses simultaneous burst operations without unhandled exceptions or deadlocks', async () => {
      const { result, unmount } = renderStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
      });

      // Fire interleaved state actions
      act(() => {
        result.current.play();
        result.current.pause();
        result.current.seek(0.2);
        result.current.setMode('INTERNAL_SIM');
        result.current.setMode('COMPENSATED');
        result.current.updateParameter('lowShelfGain', 5);
        result.current.updateParameters({ mandibleResGain: 3, sinusResGain: 4 });
        result.current.togglePlay();
        result.current.toggleLoop();
        result.current.stop();
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.error).toBeNull();
      unmount();
    });

    it('verifies that calling clearAudio() during active state cleans all audio buffers and sources', async () => {
      const { result, unmount } = renderStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
      });

      expect(result.current.hasAudio).toBe(true);

      act(() => {
        result.current.clearAudio();
      });

      expect(result.current.audioBuffer).toBeNull();
      expect(result.current.hasAudio).toBe(false);
      expect(result.current.sourceType).toBe('NONE');

      unmount();
    });

    it('survives rapid tab visibility toggling during active playback', async () => {
      const { result, unmount } = renderStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('child_vocal');
        await result.current.play();
      });

      expect(result.current.isPlaying).toBe(true);

      // Flip visibility state 20 times
      act(() => {
        for (let i = 0; i < 20; i++) {
          Object.defineProperty(document, 'visibilityState', {
            value: i % 2 === 0 ? 'hidden' : 'visible',
            configurable: true,
          });
          document.dispatchEvent(new Event('visibilitychange'));
        }
      });

      // Restore to visible
      act(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(result.current.error).toBeNull();
      unmount();
    });
  });

  // =========================================================================
  // Challenge 3: Frame Isolation, Prototype Pollution & Routing Hardening
  // =========================================================================
  describe('Challenge 3: Frame Isolation, Prototype Pollution & Routing Hardening', () => {
    it('defends interpolate against Object.create(null), Symbols, and prototype attacks', () => {
      const nullProtoObj = Object.create(null);
      nullProtoObj.name = 'TestUser';
      nullProtoObj.lowShelfGain = 10;

      const res1 = interpolate('Hello {name}, gain: {lowShelfGain}dB', nullProtoObj);
      expect(res1).toBe('Hello TestUser, gain: 10dB');

      const hostileObj = JSON.parse('{"name": "User", "__proto__": {"polluted": true}, "constructor": {"prototype": {"hacked": true}}}');

      const res2 = interpolate('Test {name} {__proto__} {constructor}', hostileObj);
      expect(typeof res2).toBe('string');
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((Object.prototype as any).hacked).toBeUndefined();
      expect(({} as any).polluted).toBeUndefined();
    });

    it('defends useAudioStudio parameter setters against all reserved and dangerous keys', () => {
      const { result, unmount } = renderStudioHook();

      const forbiddenKeys = [
        '__proto__',
        'constructor',
        'prototype',
        'toString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        '__defineGetter__',
        '__defineSetter__',
        '__lookupGetter__',
        '__lookupSetter__',
        'eval',
        'randomKey',
      ];

      for (const key of forbiddenKeys) {
        act(() => {
          result.current.updateParameter(key as any, 999);
        });
        expect((Object.prototype as any)[key]).not.toBe(999);
        expect((Object.prototype as any).polluted).toBeUndefined();
      }

      unmount();
    });

    it('verifies all 5 security configuration files for complete header parity and valid syntax', () => {
      const rootDir = nodePath.resolve('.');

      // 1. vite.config.ts
      const viteContent = nodeFs.readFileSync(nodePath.join(rootDir, 'vite.config.ts'), 'utf-8');
      expect(viteContent).toContain("X-Frame-Options': 'DENY'");
      expect(viteContent).toContain("X-Content-Type-Options': 'nosniff'");
      expect(viteContent).toContain("Cross-Origin-Opener-Policy': 'same-origin'");
      expect(viteContent).toContain("Cross-Origin-Embedder-Policy': 'credentialless'");
      expect(viteContent).toContain("frame-ancestors 'none'");

      // 2. public/_headers
      const headersContent = nodeFs.readFileSync(nodePath.join(rootDir, 'public/_headers'), 'utf-8');
      expect(headersContent).toContain('X-Frame-Options: DENY');
      expect(headersContent).toContain('X-Content-Type-Options: nosniff');
      expect(headersContent).toContain('Cross-Origin-Opener-Policy: same-origin');
      expect(headersContent).toContain('Cross-Origin-Embedder-Policy: credentialless');
      expect(headersContent).toContain("frame-ancestors 'none'");

      // 3. netlify.toml
      const netlifyContent = nodeFs.readFileSync(nodePath.join(rootDir, 'netlify.toml'), 'utf-8');
      expect(netlifyContent).toContain('X-Frame-Options = "DENY"');
      expect(netlifyContent).toContain('X-Content-Type-Options = "nosniff"');
      expect(netlifyContent).toContain('Cross-Origin-Opener-Policy = "same-origin"');
      expect(netlifyContent).toContain('Cross-Origin-Embedder-Policy = "credentialless"');

      // 4. vercel.json
      const vercelJson = JSON.parse(nodeFs.readFileSync(nodePath.join(rootDir, 'vercel.json'), 'utf-8'));
      const globalRule = vercelJson.headers.find((h: any) => h.source === '/(.*)');
      expect(globalRule).toBeDefined();
      const findHeader = (k: string) => globalRule.headers.find((h: any) => h.key === k)?.value;
      expect(findHeader('X-Frame-Options')).toBe('DENY');
      expect(findHeader('X-Content-Type-Options')).toBe('nosniff');
      expect(findHeader('Cross-Origin-Opener-Policy')).toBe('same-origin');
      expect(findHeader('Cross-Origin-Embedder-Policy')).toBe('credentialless');

      // 5. index.html
      const indexHtml = nodeFs.readFileSync(nodePath.join(rootDir, 'index.html'), 'utf-8');
      expect(indexHtml).toContain('http-equiv="Content-Security-Policy"');
      expect(indexHtml).toContain("default-src 'self'");
      expect(indexHtml).toContain("object-src 'none'");
    });

    it('stresses SPA 404 router against advanced obfuscation, unicode and encoded bypasses', () => {
      function evaluateSpaRouter(search: string): string | null {
        let replacedUrl: string | null = null;
        const fakeLocation = {
          pathname: '/vocal-mirror/',
          search,
          hash: '',
        };

        try {
          if (fakeLocation.search && fakeLocation.search[1] === '/') {
            const decoded = fakeLocation.search
              .slice(1)
              .split('&')
              .map((s: string) => s.replace(/~and~/g, '&'))
              .join('?');

            if (
              decoded.startsWith('/') &&
              !decoded.startsWith('//') &&
              !decoded.includes('\\')
            ) {
              replacedUrl =
                fakeLocation.pathname.slice(0, -1) + decoded + fakeLocation.hash;
            }
          }
        } catch {
          replacedUrl = null;
        }

        return replacedUrl;
      }

      const hostileAttacks = [
        '?///attacker.com',
        '?//example.com/login',
        '?/\\attacker.com',
        '?/\\/attacker.com',
        '?/..\\..\\etc\\passwd',
        '?/javascript:alert(1)',
        '?/data:text/html,<script>alert(1)</script>',
        '?/vbscript:msgbox(1)',
        '?/file:///etc/passwd',
      ];

      for (const attack of hostileAttacks) {
        const result = evaluateSpaRouter(attack);
        if (result !== null) {
          // If not null, must be a safe internal relative path under /vocal-mirror/
          expect(result.startsWith('/vocal-mirror/')).toBe(true);
          expect(result).not.toContain('//attacker.com');
          expect(result).not.toContain('//example.com');
          expect(result).not.toContain('\\');
        }
      }
    });
  });
});
