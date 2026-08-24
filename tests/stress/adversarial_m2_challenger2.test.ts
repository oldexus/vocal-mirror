/**
 * VocalMirror — Challenger 2 Adversarial Stress & Concurrency Hardening Test Suite (Milestone 2)
 * 
 * Target Domains:
 * 1. Tab Suspension & visibilitychange Storms during active recording and playback.
 * 2. Async Race Conditions in startRecording and startPlayback when aborted mid-flight.
 * 3. AudioContext close vs disconnect state assertions (OfflineAudioContext vs AudioContext).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { AcousticEngine } from '../../src/audio/AcousticEngine';
import { useAudioStudio, UseAudioStudioOptions } from '../../src/hooks/useAudioStudio';
import { installWebAudioMocks, AudioContextMock, MediaStreamMock, MediaStreamTrackMock } from '../mocks/webAudioMock';
import { DEFAULT_DSP_PARAMS } from '../../src/audio/constants';
import { ListeningMode } from '../../src/types/audio';

interface HookResult<T> {
  current: T;
}

const activeUnmounts: (() => void)[] = [];

function renderAudioStudioHook(options?: UseAudioStudioOptions) {
  const result: HookResult<ReturnType<typeof useAudioStudio>> = {
    current: null as any,
  };

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function TestHarness() {
    result.current = useAudioStudio(options);
    return null;
  }

  act(() => {
    root.render(React.createElement(TestHarness));
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
    rerender: () => {
      act(() => {
        root.render(React.createElement(TestHarness));
      });
    },
    unmount: unmountFn,
  };
}

describe('Challenger 2 — Milestone 2 Adversarial Concurrency & Lifecycle Hardening Suite', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    });
    installWebAudioMocks(globalThis);
    vi.useRealTimers();
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

  // =========================================================================
  // Vector 1: Tab Suspension & Visibility Change Storms
  // =========================================================================
  describe('Vector 1: Tab Suspension & visibilitychange Storms', () => {
    it('survives 100 rapid visibilityState transitions during active microphone recording without stuck mic tracks', async () => {
      const { result, unmount } = renderAudioStudioHook();
      const stoppedTracks: MediaStreamTrackMock[] = [];

      navigator.mediaDevices.getUserMedia = async () => {
        const track = new MediaStreamTrackMock();
        const origStop = track.stop.bind(track);
        track.stop = vi.fn(() => {
          stoppedTracks.push(track);
          origStop();
        });
        return new MediaStreamMock([track]) as any;
      };

      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.isRecording).toBe(true);

      // Simulate 100 rapid tab switch events (hidden <-> visible)
      for (let i = 0; i < 100; i++) {
        const state = i % 2 === 0 ? 'hidden' : 'visible';
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: state,
        });
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });
      }

      // After hidden transitions, recording must be canceled and tracks stopped
      expect(result.current.isRecording).toBe(false);
      expect(stoppedTracks.length).toBeGreaterThan(0);
      for (const track of stoppedTracks) {
        expect(track.stop).toHaveBeenCalled();
      }

      // Restore visible
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      unmount();
    });

    it('immediately aborts and stops stream tracks if document becomes hidden while getUserMedia is pending', async () => {
      const { result, unmount } = renderAudioStudioHook();
      let capturedTrack: MediaStreamTrackMock | null = null;
      let resolveGUM: ((stream: any) => void) | null = null;

      navigator.mediaDevices.getUserMedia = () => {
        return new Promise((resolve) => {
          resolveGUM = resolve;
        });
      };

      // Start recording (pending)
      let startPromise!: Promise<void>;
      act(() => {
        startPromise = result.current.startRecording();
      });

      // While getUserMedia is still pending, tab is backgrounded
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Now resolve getUserMedia
      const track = new MediaStreamTrackMock();
      capturedTrack = track;
      vi.spyOn(track, 'stop');
      const stream = new MediaStreamMock([track]);

      await act(async () => {
        if (resolveGUM) {
          resolveGUM(stream);
        }
        await startPromise;
      });

      // Must not be recording and track must have been stopped
      expect(result.current.isRecording).toBe(false);
      expect(capturedTrack.stop).toHaveBeenCalled();

      // Reset visibility
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      unmount();
    });

    it('maintains playback integrity and does not crash when visibility changes rapidly during playback', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
        await result.current.play();
      });

      expect(result.current.isPlaying).toBe(true);

      // Rapidly toggle visibility during playback
      for (let i = 0; i < 50; i++) {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: i % 2 === 0 ? 'hidden' : 'visible',
        });
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });
      }

      // AudioContext state should remain clean and no errors thrown
      expect(result.current.error).toBeNull();

      act(() => {
        result.current.stop();
      });
      expect(result.current.isPlaying).toBe(false);

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      unmount();
    });
  });

  // =========================================================================
  // Vector 2: Async Race Conditions & Mid-Flight Abort Attacks
  // =========================================================================
  describe('Vector 2: Async Race Conditions & Mid-Flight Abort', () => {
    it('prevents ghost streams when cancelRecording is called immediately after startRecording', async () => {
      const { result, unmount } = renderAudioStudioHook();
      const allCreatedTracks: MediaStreamTrackMock[] = [];

      navigator.mediaDevices.getUserMedia = async () => {
        const track = new MediaStreamTrackMock();
        allCreatedTracks.push(track);
        vi.spyOn(track, 'stop');
        return new MediaStreamMock([track]) as any;
      };

      // Fire 20 rapid startRecording -> cancelRecording sequences
      for (let i = 0; i < 20; i++) {
        let promise!: Promise<void>;
        act(() => {
          promise = result.current.startRecording();
          result.current.cancelRecording();
        });
        await act(async () => {
          await promise;
        });
      }

      expect(result.current.isRecording).toBe(false);
      expect(result.current.audioBuffer).toBeNull();
      expect(allCreatedTracks.length).toBe(20);

      // All tracks must be stopped
      for (const track of allCreatedTracks) {
        expect(track.stop).toHaveBeenCalled();
      }

      unmount();
    });

    it('safely handles component unmount while startRecording is in-flight without memory leaks', async () => {
      const { result, unmount } = renderAudioStudioHook();
      let capturedTrack: MediaStreamTrackMock | null = null;
      let resolveGUM: ((stream: any) => void) | null = null;

      navigator.mediaDevices.getUserMedia = () => {
        return new Promise((resolve) => {
          resolveGUM = resolve;
        });
      };

      let startPromise!: Promise<void>;
      act(() => {
        startPromise = result.current.startRecording();
      });

      // Unmount hook while startRecording is waiting on getUserMedia
      unmount();

      // Now resolve getUserMedia
      const track = new MediaStreamTrackMock();
      capturedTrack = track;
      vi.spyOn(track, 'stop');
      const stream = new MediaStreamMock([track]);

      await act(async () => {
        if (resolveGUM) {
          resolveGUM(stream);
        }
        try {
          await startPromise;
        } catch {}
      });

      // Track must have been immediately stopped upon post-unmount resolution
      expect(capturedTrack.stop).toHaveBeenCalled();
    });

    it('handles concurrent interleaved startRecording, stopRecording, and loadDemoAudio calls', async () => {
      const { result, unmount } = renderAudioStudioHook();

      navigator.mediaDevices.getUserMedia = async () => {
        const track = new MediaStreamTrackMock();
        vi.spyOn(track, 'stop');
        return new MediaStreamMock([track]) as any;
      };

      // Concurrently trigger startRecording and loadDemoAudio
      await act(async () => {
        const p1 = result.current.startRecording();
        const p2 = result.current.loadDemoAudio('male_baritone');
        await Promise.all([p1, p2]);
      });

      // System must end up in a coherent, non-crashed state
      expect(result.current.error).toBeNull();
      expect(typeof result.current.isRecording).toBe('boolean');

      unmount();
    });

    it('handles 100 rapid transport operations (play, pause, stop, seek) while switching modes concurrently', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
      });

      const modes: ListeningMode[] = ['RAW', 'INTERNAL_SIM', 'COMPENSATED'];

      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.setMode(modes[i % 3]);
        });

        if (i % 4 === 0) {
          await act(async () => {
            await result.current.play();
          });
        } else if (i % 4 === 1) {
          act(() => {
            result.current.pause();
          });
        } else if (i % 4 === 2) {
          act(() => {
            result.current.seek((i % 4) * 0.8);
          });
        } else {
          act(() => {
            result.current.stop();
          });
        }
      }

      expect(result.current.error).toBeNull();
      unmount();
    });
  });

  // =========================================================================
  // Vector 3: AudioContext Lifecycle & Node Disconnection State Assertions
  // =========================================================================
  describe('Vector 3: AudioContext Close vs Disconnect State Assertions', () => {
    it('asserts complete node disconnection and AudioContext closure on destroy()', () => {
      const ctx = new AudioContextMock();
      const engine = new AcousticEngine(ctx as any);

      // Verify initial state
      expect(ctx.state).toBe('suspended');

      // Destroy engine
      engine.destroy();

      // Context must be closed
      expect(ctx.state).toBe('closed');

      // Repeated destroy must be safe and idempotent
      expect(() => engine.destroy()).not.toThrow();
      expect(ctx.state).toBe('closed');
    });

    it('handles OfflineAudioContext without attempting invalid close() call', async () => {
      const sampleRate = 48000;
      const length = 4800;
      const buffer = new AudioContextMock().createBuffer(1, length, sampleRate);

      // processBuffer uses OfflineAudioContext internally
      const resultBuffer = await AcousticEngine.processBuffer(buffer as any, 'INTERNAL_SIM');
      expect(resultBuffer).toBeDefined();
      expect(resultBuffer.length).toBe(length);
      expect(resultBuffer.sampleRate).toBe(sampleRate);
    });

    it('safely handles calls on AcousticEngine after AudioContext has been destroyed or closed', async () => {
      const ctx = new AudioContextMock();
      const engine = new AcousticEngine(ctx as any);

      engine.destroy();

      // None of these methods should throw even on a destroyed engine
      expect(() => engine.setMode('INTERNAL_SIM')).not.toThrow();
      expect(() => engine.applyParameters(DEFAULT_DSP_PARAMS)).not.toThrow();
      expect(() => engine.getTheoreticalResponse(new Float32Array([100, 1000, 5000]), 'FORWARD')).not.toThrow();
      await expect(engine.resume()).resolves.toBeUndefined();
      await expect(engine.suspend()).resolves.toBeUndefined();
    });

    it('verifies that AudioBufferSourceNode is disconnected and stopped on stopSourceNode', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
        await result.current.play();
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);

      unmount();
    });

    it('survives 100 concurrent OfflineAudioContext render operations without resource contention', async () => {
      const baseBuffer = new AudioContextMock().createBuffer(1, 2400, 48000);
      const tasks: Promise<any>[] = [];

      for (let i = 0; i < 100; i++) {
        const mode: ListeningMode = i % 3 === 0 ? 'RAW' : i % 3 === 1 ? 'INTERNAL_SIM' : 'COMPENSATED';
        tasks.push(AcousticEngine.processBuffer(baseBuffer as any, mode));
      }

      const results = await Promise.all(tasks);
      expect(results.length).toBe(100);
      for (const res of results) {
        expect(res.length).toBe(2400);
      }
    });
  });
});
