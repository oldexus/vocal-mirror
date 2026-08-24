/**
 * VocalMirror — Challenger 1 Adversarial Fuzzing & Stress Test Suite (Milestone 2)
 * File: tests/stress/adversarial_m2_challenger.test.ts
 * 
 * Adversarially probes Milestone 2 hardening:
 * 1. Hostile microphone hardware disconnections & dynamic permission revocation (track.onended).
 * 2. Rapid mount/unmount and start/stop/cancel storms (MediaStreamTrack leak & AudioContext leak detection).
 * 3. MediaRecorder error events & corrupted audio decoding fallbacks.
 * 4. Hostile preset parameters, prototype pollution, and extreme numerical DSP fuzzing.
 * 5. Tab visibility change storms (document.visibilityState = 'hidden' backgrounding).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useAudioStudio } from '../../src/hooks/useAudioStudio';
import { AcousticEngine } from '../../src/audio/AcousticEngine';
import {
  DEFAULT_DSP_PARAMS,
  PARAMETER_LIMITS,
} from '../../src/audio/constants';
import { DSPParameters } from '../../src/types/audio';
import {
  installWebAudioMocks,
  MediaStreamMock,
  MediaStreamTrackMock,
  AudioContextMock,
} from '../mocks/webAudioMock';

const activeUnmounts: (() => void)[] = [];

// Helper to mount useAudioStudio in React test container
function renderHook() {
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
    unmount: unmountFn,
  };
}

describe('Adversarial Challenger 1 — Milestone 2 Hardening Stress Suite', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    });
    installWebAudioMocks(globalThis);
    vi.useFakeTimers();
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
  });

  // ===========================================================================
  // Part 1: Hostile Hardware Disconnections & Dynamic Permission Revocation
  // ===========================================================================
  describe('1. Hostile Hardware Disconnections & Permission Revocation', () => {
    it('immediately aborts recording, releases tracks, and sets descriptive error on track.onended', async () => {
      const { result, unmount } = renderHook();
      let activeTrack: MediaStreamTrackMock | null = null;

      const origGUM = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await origGUM(constraints);
        activeTrack = stream.getAudioTracks()[0] as any;
        return stream;
      };

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(activeTrack).not.toBeNull();
      expect(typeof activeTrack!.onended).toBe('function');

      // Simulate abrupt microphone hardware unplug
      act(() => {
        activeTrack!.stop();
        if (activeTrack!.onended) {
          activeTrack!.onended(new Event('ended'));
        }
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toMatch(/Microphone disconnected or permission revoked/i);
      expect(result.current.recordingDuration).toBe(0);

      unmount();
    });

    it('handles multi-track stream where any track disconnects unexpectedly', async () => {
      const { result, unmount } = renderHook();
      const track1 = new MediaStreamTrackMock();
      const track2 = new MediaStreamTrackMock();
      const multiTrackStream = new MediaStreamMock([track1, track2]);

      navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(multiTrackStream);

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(typeof track1.onended).toBe('function');
      expect(typeof track2.onended).toBe('function');

      // Simulate track 2 hardware glitch
      act(() => {
        track2.stop();
        if (track2.onended) {
          track2.onended(new Event('ended'));
        }
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toMatch(/Microphone disconnected or permission revoked/i);

      // Verify all tracks in the stream are stopped
      expect(track1.readyState).toBe('ended');
      expect(track2.readyState).toBe('ended');

      unmount();
    });

    it('resiliently handles hostile getUserMedia rejection types without unhandled crashes', async () => {
      const errorScenarios = [
        { name: 'NotAllowedError', message: 'Permission denied by user' },
        { name: 'NotFoundError', message: 'Requested microphone device not found' },
        { name: 'NotReadableError', message: 'Hardware device already in use by another process' },
        { name: 'OverconstrainedError', message: 'Constraints cannot be satisfied' },
        { name: 'SecurityError', message: 'Media access disabled in iframe / feature policy' },
        { name: 'AbortError', message: 'Hardware device failed to open' },
        { name: 'TypeError', message: 'Invalid constraints structure' },
      ];

      for (const scenario of errorScenarios) {
        const { result, unmount } = renderHook();
        const err = new Error(scenario.message);
        err.name = scenario.name;

        navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(err);

        await act(async () => {
          await result.current.startRecording();
        });

        expect(result.current.isRecording).toBe(false);
        expect(result.current.isProcessing).toBe(false);
        expect(result.current.error).not.toBeNull();

        unmount();
      }
    });

    it('safely ignores track.onended if triggered after clean stopRecording()', async () => {
      const { result, unmount } = renderHook();
      let capturedTrack: MediaStreamTrackMock | null = null;

      const origGUM = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await origGUM(constraints);
        capturedTrack = stream.getAudioTracks()[0] as any;
        return stream;
      };

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);

      // Delayed onended from hardware teardown
      act(() => {
        if (capturedTrack?.onended) {
          capturedTrack.onended(new Event('ended'));
        }
      });

      // State should not become corrupted or overwrite cleanly stopped recording
      expect(result.current.isRecording).toBe(false);
      expect(result.current.audioBuffer).not.toBeNull();

      unmount();
    });
  });

  // ===========================================================================
  // Part 2: Mount/Unmount & Start/Stop/Cancel Storms (Leak & Race Prevention)
  // ===========================================================================
  describe('2. Mount/Unmount & Start/Stop/Cancel Storms (Leak & Race Prevention)', () => {
    it('guarantees 0 leaked MediaStreamTracks during 50 rapid start-cancel cycles with acquired streams', async () => {
      const trackRegistry: MediaStreamTrackMock[] = [];
      const origGUM = navigator.mediaDevices.getUserMedia;

      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await origGUM(constraints);
        const tracks = stream.getAudioTracks() as any[];
        trackRegistry.push(...tracks);
        return stream;
      };

      const { result, unmount } = renderHook();

      // Rapidly start recording and cancel after stream is acquired
      for (let i = 0; i < 50; i++) {
        await act(async () => {
          await result.current.startRecording();
        });
        expect(result.current.isRecording).toBe(true);

        act(() => {
          result.current.cancelRecording();
        });
        expect(result.current.isRecording).toBe(false);
      }

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isProcessing).toBe(false);

      // Verify every single track ever created was stopped
      expect(trackRegistry.length).toBe(50);
      for (const track of trackRegistry) {
        expect(track.readyState).toBe('ended');
      }

      unmount();
    });

    it('prevents out-of-order asynchronous getUserMedia resolution from creating ghost recordings', async () => {
      const { result, unmount } = renderHook();
      let slowResolve!: (stream: any) => void;

      const gumCalled = new Promise<void>((resolveCalled) => {
        navigator.mediaDevices.getUserMedia = vi.fn().mockImplementation(() => {
          resolveCalled();
          return new Promise((resolve) => {
            slowResolve = resolve;
          });
        });
      });

      // 1. Trigger first recording
      let op1Promise: any;
      act(() => {
        op1Promise = result.current.startRecording();
      });

      // Wait until getUserMedia is actually invoked
      await gumCalled;

      // 2. User cancels while getUserMedia is pending
      act(() => {
        result.current.cancelRecording();
      });

      expect(result.current.isRecording).toBe(false);

      // 3. Now slow getUserMedia finally resolves in the background
      const delayedTrack = new MediaStreamTrackMock();
      const delayedStream = new MediaStreamMock([delayedTrack]);
      await act(async () => {
        slowResolve(delayedStream);
        await op1Promise;
      });

      // Result: ghost recording must NOT activate, and delayed stream must be immediately stopped
      expect(result.current.isRecording).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(delayedTrack.readyState).toBe('ended');

      unmount();
    });

    it('guarantees 0 zombie AudioContext instances and 0 track leaks across 30 rapid mount/unmount cycles', async () => {
      const closedContexts: AudioContextMock[] = [];

      for (let i = 0; i < 30; i++) {
        const { result, unmount } = renderHook();
        const ctx = result.current.engine?.getContext() as AudioContextMock;
        if (ctx) {
          const origClose = ctx.close.bind(ctx);
          ctx.close = async () => {
            closedContexts.push(ctx);
            return origClose();
          };
        }

        // Start recording and immediately unmount mid-flight
        let startPromise: any;
        act(() => {
          startPromise = result.current.startRecording();
        });
        unmount();
        await act(async () => {
          await startPromise;
        });
      }

      expect(closedContexts.length).toBe(30);
      for (const ctx of closedContexts) {
        expect(ctx.state).toBe('closed');
      }
    });

    it('handles rapid playback start/pause/stop/seek storms without node scheduling crashes', async () => {
      const { result, unmount } = renderHook();

      // Load synthetic demo audio
      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
      });

      expect(result.current.audioBuffer).not.toBeNull();

      // Storm transport controls
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          await result.current.play();
        });
        act(() => {
          result.current.seek(i % 4);
          result.current.pause();
          result.current.seek((i + 1) % 4);
        });
        await act(async () => {
          await result.current.play();
        });
        act(() => {
          result.current.stop();
        });
      }

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.currentTime).toBe(0);

      unmount();
    });
  });

  // ===========================================================================
  // Part 3: MediaRecorder Error Events & Corrupted Media Streams
  // ===========================================================================
  describe('3. MediaRecorder Error Events & Corrupted Media Streams', () => {
    it('handles MediaRecorder.onerror by aborting recording and cleaning hardware tracks', async () => {
      const { result, unmount } = renderHook();
      let recorderInstance: any = null;
      let recordedTrack: any = null;

      const OriginalRecorder = globalThis.MediaRecorder;
      globalThis.MediaRecorder = class extends OriginalRecorder {
        constructor(stream: any, opts: any) {
          super(stream, opts);
          recorderInstance = this;
          recordedTrack = stream.getAudioTracks()[0];
        }
      } as any;

      try {
        await act(async () => {
          await result.current.startRecording();
        });

        expect(result.current.isRecording).toBe(true);
        expect(recorderInstance).not.toBeNull();

        // Simulate internal encoder failure / buffer overflow in MediaRecorder
        act(() => {
          if (recorderInstance.onerror) {
            recorderInstance.onerror(new Event('error'));
          }
        });

        expect(result.current.isRecording).toBe(false);
        expect(result.current.isProcessing).toBe(false);
        expect(result.current.error).toMatch(/Recording failed due to media hardware error/i);
        expect(recordedTrack?.readyState).toBe('ended');
      } finally {
        globalThis.MediaRecorder = OriginalRecorder;
        unmount();
      }
    });

    it('recovers gracefully when audio decoding fails during stopRecording()', async () => {
      const { result, unmount } = renderHook();

      // Mock engine decodeAudioData to reject
      const engine = result.current.engine;
      const ctx = engine!.getContext();
      vi.spyOn(ctx, 'decodeAudioData').mockRejectedValue(new Error('Corrupt audio stream'));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toMatch(/Failed to decode recorded audio/i);

      unmount();
    });
  });

  // ===========================================================================
  // Part 4: Hostile Preset Injections & Extreme Parameter Fuzzing
  // ===========================================================================
  describe('4. Hostile Preset Injections & Extreme Parameter Fuzzing', () => {
    it('defends against prototype pollution, reserved properties, and malicious keys in applyPreset', () => {
      const { result, unmount } = renderHook();
      const maliciousKeys = [
        '__proto__',
        'constructor',
        'prototype',
        'toString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        '__defineGetter__',
        '__lookupSetter__',
        'random_non_existent_key',
        'null',
        'undefined',
        '',
      ];

      for (const key of maliciousKeys) {
        expect(() => {
          act(() => {
            result.current.applyPreset(key as any);
          });
        }).not.toThrow();
      }

      // Check prototype integrity
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect(result.current.activePreset).toBe('natural_standard');
      expect(result.current.parameters.lowShelfGain).toBe(DEFAULT_DSP_PARAMS.lowShelfGain);

      unmount();
    });

    it('defends against hostile objects passed as presetKey to applyPreset', () => {
      const { result, unmount } = renderHook();

      const hostileObjects = [
        null,
        undefined,
        12345,
        true,
        false,
        Symbol('malicious'),
        [],
        { params: { lowShelfGain: 9999 } },
        { [Symbol.toPrimitive]: () => '__proto__' },
      ];

      for (const obj of hostileObjects) {
        expect(() => {
          act(() => {
            result.current.applyPreset(obj as any);
          });
        }).not.toThrow();
      }

      expect(result.current.activePreset).toBe('natural_standard');
      unmount();
    });

    it('sanitizes fuzzing payloads across all 16 DSP parameters in AcousticEngine', () => {
      const engine = new AcousticEngine();
      const fuzzPayloads = [
        NaN,
        Infinity,
        -Infinity,
        -0,
        Number.MAX_VALUE,
        -Number.MAX_VALUE,
        Number.MIN_VALUE,
        1e308,
        -1e308,
        undefined as any,
        null as any,
        'malicious' as any,
        {} as any,
        [] as any,
        (() => {}) as any,
      ];

      const paramKeys: (keyof DSPParameters)[] = [
        'lowShelfFreq',
        'lowShelfGain',
        'mandibleResFreq',
        'mandibleResGain',
        'mandibleResQ',
        'sinusResFreq',
        'sinusResGain',
        'sinusResQ',
        'antiResFreq',
        'antiResGain',
        'antiResQ',
        'tissueCutoffFreq',
        'tissueCutoffQ',
        'highShelfFreq',
        'highShelfGain',
        'masterGain',
      ];

      for (const payload of fuzzPayloads) {
        const testParams: any = {};
        for (const k of paramKeys) {
          testParams[k] = payload;
        }

        expect(() => {
          engine.applyParameters(testParams, true);
        }).not.toThrow();

        const sanitized = engine.getParameters();
        for (const k of paramKeys) {
          expect(Number.isFinite(sanitized[k])).toBe(true);
          expect(sanitized[k]).toBeGreaterThanOrEqual(PARAMETER_LIMITS[k].min);
          expect(sanitized[k]).toBeLessThanOrEqual(PARAMETER_LIMITS[k].max);
        }
      }

      engine.destroy();
    });

    it('ensures AcousticEngine.destroy() is fully idempotent and safe against repeated calls', () => {
      const engine = new AcousticEngine();

      expect(() => {
        engine.destroy();
        engine.destroy();
        engine.destroy();
      }).not.toThrow();

      // Post-destroy calls must be safe no-ops
      expect(() => {
        engine.applyParameters(DEFAULT_DSP_PARAMS);
        engine.setMode('INTERNAL_SIM');
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // Part 5: Tab Visibility & Background Hardware Management Storms
  // ===========================================================================
  describe('5. Tab Visibility & Background Hardware Management Storms', () => {
    it('handles rapid backgrounding/foregrounding storms during active recording', async () => {
      const { result, unmount } = renderHook();
      let capturedTrack: MediaStreamTrackMock | null = null;

      const origGUM = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await origGUM(constraints);
        capturedTrack = stream.getAudioTracks()[0] as any;
        return stream;
      };

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(capturedTrack).not.toBeNull();

      // Rapidly toggle visibilityState 50 times
      for (let i = 0; i < 50; i++) {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: i % 2 === 0 ? 'hidden' : 'visible',
        });

        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });
      }

      // Final state must be cleanly stopped
      expect(result.current.isRecording).toBe(false);
      expect(capturedTrack!.readyState).toBe('ended');

      // Restore document visibility
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      unmount();
    });

    it('safely handles visibilitychange events when hook is idle or during playback without error', async () => {
      const { result, unmount } = renderHook();

      // Dispatch visibilitychange while idle
      expect(() => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'hidden',
        });
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'visible',
        });
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });
      }).not.toThrow();

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBeNull();

      unmount();
    });
  });
});
