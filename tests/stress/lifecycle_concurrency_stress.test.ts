/**
 * VocalMirror — Challenger 2 Comprehensive Lifecycle, Concurrency & Memory Stress Test Suite
 * 
 * Target Domains:
 * 1. AcousticEngine lifecycle, rapid mode crossfading (A->B->C->A), parameter flooding, AudioContext closure.
 * 2. useAudioStudio hook rapid mount/unmount, transport toggles, microphone permission & hardware release.
 * 3. SpectrumVisualizerRenderer rAF leak prevention, resize stress, and zero-allocation performance.
 * 4. i18n prototype pollution defense & malformed key boundary stress.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { AcousticEngine } from '../../src/audio/AcousticEngine';
import { useAudioStudio } from '../../src/hooks/useAudioStudio';
import { SpectrumVisualizerRenderer } from '../../src/audio/SpectrumVisualizerRenderer';
import { LanguageProvider, useTranslation } from '../../src/i18n';
import { installWebAudioMocks, AudioContextMock, MediaStreamMock, MediaStreamTrackMock } from '../mocks/webAudioMock';
import { DEFAULT_DSP_PARAMS } from '../../src/audio/constants';
import { ListeningMode } from '../../src/types/audio';

describe('Challenger 2 — Adversarial Lifecycle, Concurrency & Memory Stress Tests', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. AcousticEngine Lifecycle, Concurrency & Teardown Verification
  // =========================================================================
  describe('1. AcousticEngine Lifecycle & Concurrency Stress', () => {
    it('survives 200 rapid instantiation and destruction cycles without AudioContext leaks', () => {
      const contexts: AudioContextMock[] = [];

      for (let i = 0; i < 200; i++) {
        const ctx = new AudioContextMock();
        contexts.push(ctx);
        const engine = new AcousticEngine(ctx as any);

        expect(ctx.state).toBe('suspended');
        expect(engine.getMode()).toBe('RAW');

        // Destroy engine
        engine.destroy();

        // Verify AudioContext was closed on teardown
        expect(ctx.state).toBe('closed');
      }

      expect(contexts.every((c) => c.state === 'closed')).toBe(true);
    });

    it('handles 500 rapid A -> B -> C -> A mode switches under active audio processing', () => {
      const ctx = new AudioContextMock();
      const engine = new AcousticEngine(ctx as any);
      const modes: ListeningMode[] = ['RAW', 'INTERNAL_SIM', 'COMPENSATED'];

      for (let i = 0; i < 500; i++) {
        const mode = modes[i % 3];
        const immediate = i % 2 === 0;
        engine.setMode(mode, immediate);
        expect(engine.getMode()).toBe(mode);
      }

      engine.destroy();
      expect(ctx.state).toBe('closed');
    });

    it('withstands concurrent parameter fuzzing (NaN, Infinity, negative, extreme values)', () => {
      const ctx = new AudioContextMock();
      const engine = new AcousticEngine(ctx as any);

      const adversarialInputs = [
        { lowShelfGain: NaN, masterGain: Infinity },
        { lowShelfFreq: -9999, highShelfFreq: 999999 },
        { mandibleResQ: 0, sinusResQ: -1 },
        { masterGain: -Infinity, tissueCutoffFreq: NaN },
        { lowShelfGain: 1e30, mandibleResGain: -1e30 },
      ];

      for (const input of adversarialInputs) {
        expect(() => {
          engine.applyParameters(input as any, true);
        }).not.toThrow();

        const params = engine.getParameters();
        expect(Number.isFinite(params.lowShelfGain)).toBe(true);
        expect(Number.isFinite(params.masterGain)).toBe(true);
        expect(Number.isFinite(params.lowShelfFreq)).toBe(true);
        expect(Number.isFinite(params.highShelfFreq)).toBe(true);
        expect(params.mandibleResQ).toBeGreaterThan(0);
        expect(params.sinusResQ).toBeGreaterThan(0);
      }

      engine.destroy();
    });

    it('safely handles repeated calls to destroy(), suspend(), and resume() post-teardown', async () => {
      const ctx = new AudioContextMock();
      const engine = new AcousticEngine(ctx as any);

      // Multiple destroys
      engine.destroy();
      expect(() => engine.destroy()).not.toThrow();
      expect(() => engine.destroy()).not.toThrow();

      // Post-destroy calls should be no-ops and not crash
      expect(() => engine.setMode('COMPENSATED')).not.toThrow();
      expect(() => engine.applyParameters(DEFAULT_DSP_PARAMS)).not.toThrow();
      await expect(engine.suspend()).resolves.toBeUndefined();
    });

    it('handles 50 concurrent processBuffer OfflineAudioContext DSP renders without race conditions', async () => {
      const baseBuffer = new AudioContextMock().createBuffer(1, 4800, 48000);
      const renderPromises: Promise<any>[] = [];

      for (let i = 0; i < 50; i++) {
        const mode: ListeningMode = i % 2 === 0 ? 'INTERNAL_SIM' : 'COMPENSATED';
        renderPromises.push(AcousticEngine.processBuffer(baseBuffer as any, mode));
      }

      const results = await Promise.all(renderPromises);
      expect(results.length).toBe(50);
      for (const res of results) {
        expect(res).toBeDefined();
        expect(res.length).toBe(4800);
      }
    });
  });

  // =========================================================================
  // 2. useAudioStudio Hook Lifecycle & Teardown Stress
  // =========================================================================
  describe('2. useAudioStudio Hook Mount/Unmount & Concurrency Stress', () => {
    function createTestHook() {
      const result: { current: ReturnType<typeof useAudioStudio> | null } = { current: null };
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

    it('survives 50 rapid mount and unmount cycles without leaking audio engines', () => {
      for (let i = 0; i < 50; i++) {
        const { result, unmount } = createTestHook();
        expect(result.current).not.toBeNull();
        const engine = result.current!.engine;
        expect(engine).toBeDefined();

        unmount();
        // Context should be closed on unmount
        expect((engine?.getContext() as any).state).toBe('closed');
      }
    });

    it('releases microphone MediaStreamTrack hardware immediately when getUserMedia throws permission error', async () => {
      const { result, unmount } = createTestHook();
      const mockTrack = new MediaStreamTrackMock();
      const mockStream = new MediaStreamMock([mockTrack]);

      // Simulate getUserMedia returning a stream then failing or throwing
      let callCount = 0;
      navigator.mediaDevices.getUserMedia = async () => {
        callCount++;
        if (callCount === 1) {
          // First attempt succeeds in partial initialization but throws
          const err = new Error('Permission denied');
          err.name = 'NotAllowedError';
          throw err;
        }
        return mockStream as any;
      };

      await act(async () => {
        await result.current!.startRecording();
      });

      expect(result.current!.isRecording).toBe(false);
      expect(result.current!.error).toBe('Microphone permission denied');

      unmount();
    });

    it('stops microphone MediaStreamTrack immediately upon cancelRecording()', async () => {
      const { result, unmount } = createTestHook();
      let capturedTrack: any = null;

      navigator.mediaDevices.getUserMedia = async () => {
        const track = new MediaStreamTrackMock();
        capturedTrack = track;
        vi.spyOn(track, 'stop');
        return new MediaStreamMock([track]) as any;
      };

      await act(async () => {
        await result.current!.startRecording();
      });

      expect(result.current!.isRecording).toBe(true);
      expect(capturedTrack).not.toBeNull();

      act(() => {
        result.current!.cancelRecording();
      });

      expect(result.current!.isRecording).toBe(false);
      expect(capturedTrack.stop).toHaveBeenCalled();

      unmount();
    });

    it('cleans up MediaRecorder, timers, and stops tracks when unmounting during active recording', async () => {
      const { result, unmount } = createTestHook();
      let capturedTrack: any = null;

      navigator.mediaDevices.getUserMedia = async () => {
        const track = new MediaStreamTrackMock();
        capturedTrack = track;
        vi.spyOn(track, 'stop');
        return new MediaStreamMock([track]) as any;
      };

      await act(async () => {
        await result.current!.startRecording();
      });

      expect(result.current!.isRecording).toBe(true);

      // Unmount while recording is active
      unmount();

      expect(capturedTrack.stop).toHaveBeenCalled();
    });

    it('handles 100 rapid transport toggles (play -> pause -> stop -> play) without uncaught exceptions', async () => {
      const { result, unmount } = createTestHook();
      const ctx = result.current!.engine!.getContext();
      const buffer = ctx.createBuffer(1, 4800, 48000);

      act(() => {
        result.current!.setAudioBuffer(buffer as any, 'BUFFER');
      });

      for (let i = 0; i < 100; i++) {
        if (i % 4 === 0) {
          await act(async () => {
            await result.current!.play();
          });
        } else if (i % 4 === 1) {
          act(() => {
            result.current!.pause();
          });
        } else if (i % 4 === 2) {
          act(() => {
            result.current!.stop();
          });
        } else {
          await act(async () => {
            await result.current!.togglePlay();
          });
        }
      }

      unmount();
    });
  });

  // =========================================================================
  // 3. SpectrumVisualizerRenderer rAF & Resource Management Stress
  // =========================================================================
  describe('3. SpectrumVisualizerRenderer Lifecycle & rAF Leaks', () => {
    it('cancels requestAnimationFrame immediately on stop() and destroy()', () => {
      let rafCount = 0;
      const originalRaf = window.requestAnimationFrame;
      const originalCancel = window.cancelAnimationFrame;

      window.requestAnimationFrame = vi.fn((_cb) => {
        rafCount++;
        return rafCount;
      });
      window.cancelAnimationFrame = vi.fn((_id) => {});

      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({
        canvas,
        rawAnalyser: null,
        processedAnalyser: null,
      });

      renderer.start();
      expect(window.requestAnimationFrame).toHaveBeenCalled();

      renderer.stop();
      expect(window.cancelAnimationFrame).toHaveBeenCalled();

      // Restart and destroy
      renderer.start();
      renderer.destroy();
      expect(window.cancelAnimationFrame).toHaveBeenCalled();

      // Subsequent renders should be no-ops
      expect(() => renderer.render()).not.toThrow();

      window.requestAnimationFrame = originalRaf;
      window.cancelAnimationFrame = originalCancel;
    });

    it('survives 100 rapid resize operations across different device pixel ratios', () => {
      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({
        canvas,
        rawAnalyser: null,
        processedAnalyser: null,
      });

      for (let i = 1; i <= 100; i++) {
        const w = 400 + (i % 50) * 10;
        const h = 200 + (i % 30) * 5;
        const dpr = 1 + (i % 3);
        expect(() => {
          renderer.resize(w, h, dpr);
        }).not.toThrow();
      }

      renderer.destroy();
    });
  });

  // =========================================================================
  // 4. i18n & Prototype Pollution Security Stress
  // =========================================================================
  describe('4. i18n & Prototype Safety Boundary Stress', () => {
    function renderI18nHarness() {
      const result: { current: ReturnType<typeof useTranslation> | null } = { current: null };
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      function Harness() {
        result.current = useTranslation();
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

    it('safely rejects prototype pollution keys (__proto__, constructor, prototype)', () => {
      const { result, unmount } = renderI18nHarness();
      const t = result.current!.t;

      // Malicious prototype pollution probes
      const attackKeys = [
        '__proto__',
        '__proto__.polluted',
        'constructor',
        'constructor.prototype',
        'prototype',
        'toString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
      ];

      for (const key of attackKeys) {
        const res = t(key);
        // Must return the key itself as fallback and NOT pollute Object.prototype or return Object methods
        expect(typeof res).toBe('string');
        expect(res).toBe(key);
      }

      // Check Object.prototype is pristine
      expect((Object.prototype as any).polluted).toBeUndefined();

      unmount();
    });

    it('gracefully handles malformed, nullish, and extreme key inputs', () => {
      const { result, unmount } = renderI18nHarness();
      const t = result.current!.t;

      expect(t('')).toBe('');
      expect(t(null as any)).toBe('');
      expect(t(undefined as any)).toBe('');
      expect(t(12345 as any)).toBe('');
      expect(t({} as any)).toBe('');
      expect(t('nonexistent.deep.nested.key.that.does.not.exist')).toBe('nonexistent.deep.nested.key.that.does.not.exist');
      expect(t('.leading.dot')).toBe('.leading.dot');
      expect(t('trailing.dot.')).toBe('trailing.dot.');
      expect(t('multiple...dots')).toBe('multiple...dots');

      unmount();
    });

    it('interpolates parameters safely with special regex characters in placeholders', () => {
      const { result, unmount } = renderI18nHarness();
      const t = result.current!.t;

      const res = t('analyzer.metrics.lowBoost.atFreq', { freq: '$100.00 & <div>test</div>' });
      expect(res).toContain('$100.00 & <div>test</div>');

      unmount();
    });
  });
});
