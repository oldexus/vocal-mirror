/**
 * VocalMirror — useAudioStudio Hook Comprehensive Unit Test Suite
 * 
 * Tests AudioContext lifecycle, autoplay unlock, demo audio loading,
 * MediaRecorder microphone capture, playback transport controls,
 * zero-pop A/B/C mode switching, real-time parameter tweaking, and unmount teardown.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useAudioStudio, UseAudioStudioOptions } from '../../../src/hooks/useAudioStudio';
import {
  DEFAULT_DSP_PARAMS,
  ACOUSTIC_PRESETS,
  PARAMETER_LIMITS,
} from '../../../src/audio/constants';
import {
  installWebAudioMocks,
} from '../../mocks/webAudioMock';

// ==========================================
// Test Render Hook Utility (React 18 createRoot + act)
// ==========================================
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
    rerender: (_newOptions?: UseAudioStudioOptions) => {
      act(() => {
        root.render(React.createElement(TestHarness));
      });
    },
    unmount: unmountFn,
  };
}

describe('useAudioStudio Custom Hook Test Suite', () => {
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

  // ==========================================
  // Suite 1: Initial Hook State & Topology
  // ==========================================
  describe('1. Hook Initialization & Default Topology', () => {
    it('initializes with default state, suspended context, RAW mode, and Natural Standard preset', () => {
      const { result, unmount } = renderAudioStudioHook();

      expect(result.current.contextState).toBe('suspended');
      expect(result.current.mode).toBe('RAW');
      expect(result.current.audioSource).toBe('NONE');
      expect(result.current.audioBuffer).toBeNull();
      expect(result.current.isRecording).toBe(false);
      expect(result.current.recordingDuration).toBe(0);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.isLooping).toBe(false);
      expect(result.current.activePreset).toBe('natural_standard');
      expect(result.current.error).toBeNull();

      // Parameters should match DEFAULT_DSP_PARAMS
      expect(result.current.parameters.lowShelfFreq).toBe(DEFAULT_DSP_PARAMS.lowShelfFreq);
      expect(result.current.parameters.lowShelfGain).toBe(DEFAULT_DSP_PARAMS.lowShelfGain);
      expect(result.current.parameters.tissueCutoffFreq).toBe(DEFAULT_DSP_PARAMS.tissueCutoffFreq);
      expect(result.current.parameters.masterGain).toBe(DEFAULT_DSP_PARAMS.masterGain);

      // Engine & Analyser nodes should be instantiated
      expect(result.current.engine).toBeDefined();
      expect(result.current.rawAnalyser).toBeDefined();
      expect(result.current.processedAnalyser).toBeDefined();
      expect(result.current.rawAnalyser?.fftSize).toBe(2048);
      expect(result.current.processedAnalyser?.fftSize).toBe(2048);

      unmount();
    });

    it('initializes with custom options (initialMode, initialPreset, initialLoop)', () => {
      const { result, unmount } = renderAudioStudioHook({
        initialMode: 'INTERNAL_SIM',
        initialPreset: 'deep_chest_male',
        initialLoop: true,
      });

      expect(result.current.mode).toBe('INTERNAL_SIM');
      expect(result.current.activePreset).toBe('deep_chest_male');
      expect(result.current.isLooping).toBe(true);
      expect(result.current.parameters.lowShelfFreq).toBe(ACOUSTIC_PRESETS.deep_chest_male.params.lowShelfFreq);

      unmount();
    });
  });

  // ==========================================
  // Suite 2: AudioContext Resume & Autoplay Policy Unlock
  // ==========================================
  describe('2. AudioContext Resume & Autoplay Unlock', () => {
    it('resumes suspended AudioContext when resumeContext is invoked', async () => {
      const { result, unmount } = renderAudioStudioHook();
      expect(result.current.contextState).toBe('suspended');

      await act(async () => {
        await result.current.resumeContext();
      });

      expect(result.current.contextState).toBe('running');
      unmount();
    });

    it('unlocks audio context via unlockAudio()', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.unlockAudio();
      });

      expect(result.current.contextState).toBe('running');
      unmount();
    });

    it('retrieves AudioContext instance via ensureAudioContext()', async () => {
      const { result, unmount } = renderAudioStudioHook();

      let ctx: any = null;
      await act(async () => {
        ctx = await result.current.ensureAudioContext();
      });

      expect(ctx).not.toBeNull();
      expect(ctx.sampleRate).toBe(48000);
      unmount();
    });

    it('automatically triggers context resume when play is called on suspended context', async () => {
      const { result, unmount } = renderAudioStudioHook();

      // Load demo audio first
      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
      });

      expect(result.current.contextState).toBe('suspended');

      await act(async () => {
        await result.current.play();
      });

      expect(result.current.contextState).toBe('running');
      expect(result.current.isPlaying).toBe(true);

      unmount();
    });

    it('automatically unlocks and warms AudioContext on iOS touchstart user interaction', async () => {
      const { result, unmount } = renderAudioStudioHook();
      expect(result.current.contextState).toBe('suspended');

      act(() => {
        window.dispatchEvent(new Event('touchstart'));
      });

      expect(result.current.contextState).toBe('running');
      unmount();
    });

    it('exposes dynamic hardware sampleRate from active AudioContext', () => {
      const { result, unmount } = renderAudioStudioHook();
      expect(result.current.sampleRate).toBe(result.current.engine?.getContext().sampleRate);
      unmount();
    });
  });

  // ==========================================
  // Suite 3: Demo Vocal Audio Loading & Buffer Management
  // ==========================================
  describe('3. Synthetic Demo Vocal Audio Loading', () => {
    it('loads synthetic baritone demo audio buffer successfully', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
      });

      expect(result.current.audioBuffer).not.toBeNull();
      expect(result.current.audioSource).toBe('SAMPLE');
      expect(result.current.duration).toBeCloseTo(4.0, 1);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.isPlaying).toBe(false);

      unmount();
    });

    it('loads synthetic soprano and tenor demo presets correctly', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('female_alto');
      });
      expect(result.current.audioBuffer).not.toBeNull();
      expect(result.current.audioSource).toBe('SAMPLE');

      await act(async () => {
        await result.current.loadDemoAudio('tenor_vowel_ah');
      });
      expect(result.current.audioBuffer).not.toBeNull();

      unmount();
    });

    it('clears audio buffer and resets playback state on clearAudio()', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
      });
      expect(result.current.audioBuffer).not.toBeNull();

      act(() => {
        result.current.clearAudio();
      });

      expect(result.current.audioBuffer).toBeNull();
      expect(result.current.audioSource).toBe('NONE');
      expect(result.current.duration).toBe(0);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.isPlaying).toBe(false);

      unmount();
    });

    it('sets custom audio buffer via setAudioBuffer()', async () => {
      const { result, unmount } = renderAudioStudioHook();

      const engine = result.current.engine;
      const customBuffer = engine!.getContext().createBuffer(1, 48000 * 2, 48000);

      act(() => {
        result.current.setAudioBuffer(customBuffer, 'BUFFER');
      });

      expect(result.current.audioBuffer).toBe(customBuffer);
      expect(result.current.audioSource).toBe('BUFFER');
      expect(result.current.duration).toBe(2);

      unmount();
    });

    it('clears error state via clearError()', () => {
      const { result, unmount } = renderAudioStudioHook();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      unmount();
    });
  });

  // ==========================================
  // Suite 4: Microphone Recording Lifecycle
  // ==========================================
  describe('4. Microphone Recording Lifecycle & Permission Handling', () => {
    it('starts microphone recording and updates recording state', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(result.current.recordingDuration).toBe(0);

      // Advance timer by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.recordingDuration).toBeGreaterThanOrEqual(2);

      // Stop recording
      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.audioSource).toBe('MIC');
      expect(result.current.audioBuffer).not.toBeNull();
      expect(result.current.duration).toBeGreaterThan(0);

      unmount();
    });

    it('handles getUserMedia rejection gracefully without crashing', async () => {
      const { result, unmount } = renderAudioStudioHook();

      // Mock getUserMedia failure
      navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toMatch(/Permission denied|Microphone access failed/i);

      unmount();
    });

    it('stops media stream tracks when recording finishes to release microphone hardware', async () => {
      const { result, unmount } = renderAudioStudioHook();
      let capturedTrack: any = null;

      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await originalGetUserMedia(constraints);
        capturedTrack = stream.getAudioTracks()[0];
        vi.spyOn(capturedTrack, 'stop');
        return stream;
      };

      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.isRecording).toBe(true);

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(capturedTrack.stop).toHaveBeenCalled();
      unmount();
    });

    it('cancels active recording via cancelRecording()', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.isRecording).toBe(true);

      act(() => {
        result.current.cancelRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.recordingDuration).toBe(0);
      expect(result.current.audioBuffer).toBeNull();

      unmount();
    });

    it('triggers cancelRecording and sets error when dynamic track disconnection (track.onended) occurs', async () => {
      const { result, unmount } = renderAudioStudioHook();
      let capturedTrack: any = null;

      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await originalGetUserMedia(constraints);
        capturedTrack = stream.getAudioTracks()[0];
        return stream;
      };

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(capturedTrack).not.toBeNull();
      expect(typeof capturedTrack.onended).toBe('function');

      // Simulate dynamic physical mic disconnection or permission revocation
      act(() => {
        capturedTrack.onended(new Event('ended'));
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBe('Microphone disconnected or permission revoked');
      expect(result.current.recordingDuration).toBe(0);

      unmount();
    });

    it('triggers cancelRecording and sets error when MediaRecorder.onerror occurs', async () => {
      const { result, unmount } = renderAudioStudioHook();
      let capturedRecorder: any = null;

      const OriginalMediaRecorder = globalThis.MediaRecorder;
      globalThis.MediaRecorder = class extends OriginalMediaRecorder {
        constructor(stream: any, options: any) {
          super(stream, options);
          capturedRecorder = this;
        }
      } as any;

      try {
        await act(async () => {
          await result.current.startRecording();
        });

        expect(result.current.isRecording).toBe(true);
        expect(capturedRecorder).not.toBeNull();
        expect(typeof capturedRecorder.onerror).toBe('function');

        // Simulate hardware recording crash / buffer exhaustion
        act(() => {
          capturedRecorder.onerror(new Event('error'));
        });

        expect(result.current.isRecording).toBe(false);
        expect(result.current.error).toBe('Recording failed due to media hardware error');
        expect(result.current.recordingDuration).toBe(0);
      } finally {
        globalThis.MediaRecorder = OriginalMediaRecorder;
        unmount();
      }
    });
  });

  // ==========================================
  // Suite 5: Playback Transport Controls
  // ==========================================
  describe('5. Playback Transport Controls (Play, Pause, Stop, Seek, Loop)', () => {
    it('plays and pauses loaded audio buffer correctly', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
      });

      await act(async () => {
        await result.current.play();
      });
      expect(result.current.isPlaying).toBe(true);

      // Advance playback time
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        result.current.pause();
      });
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBeGreaterThanOrEqual(1.0);

      unmount();
    });

    it('stops playback and resets currentTime to 0 on stop()', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
      });

      await act(async () => {
        await result.current.play();
      });
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      act(() => {
        result.current.stop();
      });
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);

      unmount();
    });

    it('seeks to specified timestamp and clamps within valid duration', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
      });

      act(() => {
        result.current.seek(2.5);
      });
      expect(result.current.currentTime).toBeCloseTo(2.5, 1);

      // Seek beyond duration -> clamp to duration
      act(() => {
        result.current.seek(999);
      });
      expect(result.current.currentTime).toBeCloseTo(result.current.duration, 1);

      // Seek below 0 -> clamp to 0
      act(() => {
        result.current.seek(-10);
      });
      expect(result.current.currentTime).toBe(0);

      unmount();
    });

    it('toggles loop mode on toggleLoop()', async () => {
      const { result, unmount } = renderAudioStudioHook();
      expect(result.current.isLooping).toBe(false);

      act(() => {
        result.current.toggleLoop();
      });
      expect(result.current.isLooping).toBe(true);

      act(() => {
        result.current.toggleLoop();
      });
      expect(result.current.isLooping).toBe(false);

      unmount();
    });

    it('does not throw when play() is called with no audio buffer loaded', async () => {
      const { result, unmount } = renderAudioStudioHook();
      expect(result.current.audioBuffer).toBeNull();

      await act(async () => {
        await result.current.play();
      });
      expect(result.current.isPlaying).toBe(false);

      unmount();
    });

    it('toggles play/pause via togglePlay()', async () => {
      const { result, unmount } = renderAudioStudioHook();

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
      });

      await act(async () => {
        await result.current.togglePlay();
      });
      expect(result.current.isPlaying).toBe(true);

      await act(async () => {
        await result.current.togglePlay();
      });
      expect(result.current.isPlaying).toBe(false);

      unmount();
    });
  });

  // ==========================================
  // Suite 6: A/B/C Zero-Pop Listening Mode Switching
  // ==========================================
  describe('6. A/B/C Listening Mode Switching', () => {
    it('switches between RAW, INTERNAL_SIM, and COMPENSATED modes and updates engine', () => {
      const { result, unmount } = renderAudioStudioHook();
      expect(result.current.mode).toBe('RAW');
      expect(result.current.engine?.getMode()).toBe('RAW');

      act(() => {
        result.current.setMode('INTERNAL_SIM');
      });
      expect(result.current.mode).toBe('INTERNAL_SIM');
      expect(result.current.engine?.getMode()).toBe('INTERNAL_SIM');

      act(() => {
        result.current.setMode('COMPENSATED');
      });
      expect(result.current.mode).toBe('COMPENSATED');
      expect(result.current.engine?.getMode()).toBe('COMPENSATED');

      act(() => {
        result.current.setMode('RAW');
      });
      expect(result.current.mode).toBe('RAW');
      expect(result.current.engine?.getMode()).toBe('RAW');

      unmount();
    });
  });

  // ==========================================
  // Suite 7: Parameter Updates, Presets & Clamping
  // ==========================================
  describe('7. Parameter Updates, Clamping & Physiological Presets', () => {
    it('updates individual parameters and marks activePreset as custom', () => {
      const { result, unmount } = renderAudioStudioHook();
      expect(result.current.activePreset).toBe('natural_standard');

      act(() => {
        result.current.updateParameter('lowShelfGain', 12.0);
      });
      expect(result.current.parameters.lowShelfGain).toBe(12.0);
      expect(result.current.activePreset).toBe('custom');
      expect(result.current.engine?.getParameters().lowShelfGain).toBe(12.0);

      unmount();
    });

    it('updates bulk parameters via updateParameters()', () => {
      const { result, unmount } = renderAudioStudioHook();

      act(() => {
        result.current.updateParameters({
          lowShelfGain: 10.0,
          mandibleResGain: 6.0,
        });
      });

      expect(result.current.parameters.lowShelfGain).toBe(10.0);
      expect(result.current.parameters.mandibleResGain).toBe(6.0);
      expect(result.current.activePreset).toBe('custom');

      unmount();
    });

    it('clamps out-of-bounds parameter inputs within physical limits', () => {
      const { result, unmount } = renderAudioStudioHook();

      act(() => {
        result.current.updateParameter('lowShelfGain', 999);
      });
      expect(result.current.parameters.lowShelfGain).toBe(PARAMETER_LIMITS.lowShelfGain.max);

      act(() => {
        result.current.updateParameter('masterGain', -999);
      });
      expect(result.current.parameters.masterGain).toBe(PARAMETER_LIMITS.masterGain.min);

      unmount();
    });

    it('applies physiological presets correctly', () => {
      const { result, unmount } = renderAudioStudioHook();

      act(() => {
        result.current.applyPreset('deep_chest_male');
      });
      expect(result.current.activePreset).toBe('deep_chest_male');
      expect(result.current.parameters.lowShelfFreq).toBe(ACOUSTIC_PRESETS.deep_chest_male.params.lowShelfFreq);
      expect(result.current.parameters.lowShelfGain).toBe(ACOUSTIC_PRESETS.deep_chest_male.params.lowShelfGain);

      act(() => {
        result.current.applyPreset('bright_cranial_female');
      });
      expect(result.current.activePreset).toBe('bright_cranial_female');
      expect(result.current.parameters.lowShelfFreq).toBe(ACOUSTIC_PRESETS.bright_cranial_female.params.lowShelfFreq);

      unmount();
    });

    it('resets parameters to default natural standard on resetParameters()', () => {
      const { result, unmount } = renderAudioStudioHook();

      act(() => {
        result.current.applyPreset('intense_confrontation');
      });
      expect(result.current.activePreset).toBe('intense_confrontation');

      act(() => {
        result.current.resetParameters();
      });
      expect(result.current.activePreset).toBe('natural_standard');
      expect(result.current.parameters.lowShelfGain).toBe(DEFAULT_DSP_PARAMS.lowShelfGain);

      unmount();
    });

    it('updates volume master trim dB via setVolume()', () => {
      const { result, unmount } = renderAudioStudioHook();

      act(() => {
        result.current.setVolume(3.5);
      });

      expect(result.current.volume).toBe(3.5);
      expect(result.current.parameters.masterGain).toBe(3.5);

      unmount();
    });

    it('rejects prototype pollution keys and unknown keys in updateParameter and updateParameters', () => {
      const { result, unmount } = renderAudioStudioHook();

      // Attempt prototype pollution via updateParameter
      act(() => {
        result.current.updateParameter('__proto__' as any, 100);
        result.current.updateParameter('constructor' as any, 100);
        result.current.updateParameter('prototype' as any, 100);
        result.current.updateParameter('unknownKey' as any, 100);
      });

      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((result.current.parameters as any).__proto__).toBe(Object.prototype);
      expect((result.current.parameters as any).unknownKey).toBeUndefined();

      // Attempt prototype pollution via batch updateParameters
      act(() => {
        result.current.updateParameters({
          ['__proto__' as any]: { polluted: true },
          ['constructor' as any]: { polluted: true },
          ['prototype' as any]: { polluted: true },
          ['nonExistentParam' as any]: 42,
        });
      });

      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((result.current.parameters as any).nonExistentParam).toBeUndefined();

      unmount();
    });

    it('sanitizes NaN, Infinity, -Infinity, and non-numeric inputs safely to default values', () => {
      const { result, unmount } = renderAudioStudioHook();

      // NaN should fallback to default limit value without storing NaN in state
      act(() => {
        result.current.updateParameter('lowShelfGain', NaN);
      });
      expect(Number.isFinite(result.current.parameters.lowShelfGain)).toBe(true);
      expect(result.current.parameters.lowShelfGain).toBe(PARAMETER_LIMITS.lowShelfGain.default);

      // Infinity / -Infinity should fallback safely
      act(() => {
        result.current.updateParameter('lowShelfGain', Infinity);
      });
      expect(Number.isFinite(result.current.parameters.lowShelfGain)).toBe(true);
      expect(result.current.parameters.lowShelfGain).toBe(PARAMETER_LIMITS.lowShelfGain.default);

      // Batch updateParameters with NaNs
      act(() => {
        result.current.updateParameters({
          lowShelfGain: NaN,
          masterGain: -Infinity,
          mandibleResGain: 'invalid' as any,
        });
      });
      expect(Number.isFinite(result.current.parameters.lowShelfGain)).toBe(true);
      expect(Number.isFinite(result.current.parameters.masterGain)).toBe(true);
      expect(Number.isFinite(result.current.parameters.mandibleResGain)).toBe(true);
      expect(result.current.parameters.lowShelfGain).toBe(PARAMETER_LIMITS.lowShelfGain.default);
      expect(result.current.parameters.masterGain).toBe(PARAMETER_LIMITS.masterGain.default);
      expect(result.current.parameters.mandibleResGain).toBe(PARAMETER_LIMITS.mandibleResGain.default);

      unmount();
    });

    it('safely ignores invalid, prototype keys, and non-object inputs in applyPreset without throwing', () => {
      const { result, unmount } = renderAudioStudioHook();

      // Should not throw on prototype keys or arbitrary strings or non-existent presets
      expect(() => {
        act(() => {
          result.current.applyPreset('toString' as any);
          result.current.applyPreset('valueOf' as any);
          result.current.applyPreset('__proto__' as any);
          result.current.applyPreset('constructor' as any);
          result.current.applyPreset('non_existent_preset' as any);
          result.current.applyPreset(null as any);
          result.current.applyPreset(undefined as any);
        });
      }).not.toThrow();

      // Preset state and parameters should remain unaffected or valid
      expect(result.current.activePreset).toBe('natural_standard');
      expect(result.current.parameters.lowShelfFreq).toBe(DEFAULT_DSP_PARAMS.lowShelfFreq);

      unmount();
    });
  });

  // ==========================================
  // Suite 8: Teardown & Resource Cleanup on Unmount
  // ==========================================
  describe('8. Teardown & Resource Cleanup', () => {
    it('destroys AcousticEngine and stops active sources when hook unmounts', async () => {
      const { result, unmount } = renderAudioStudioHook();
      const engine = result.current.engine;
      const destroySpy = vi.spyOn(engine!, 'destroy');

      await act(async () => {
        await result.current.loadDemoAudio('male_baritone');
        await result.current.play();
      });

      expect(result.current.isPlaying).toBe(true);

      unmount();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('cleanly releases all hardware tracks during rapid start/cancel and mount/unmount cycles', async () => {
      const stopTrackSpies: any[] = [];
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await originalGetUserMedia(constraints);
        const track = stream.getAudioTracks()[0];
        const stopSpy = vi.spyOn(track, 'stop');
        stopTrackSpies.push(stopSpy);
        return stream;
      };

      const { result, unmount } = renderAudioStudioHook();

      // Rapid start and immediate cancel
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          const startPromise = result.current.startRecording();
          result.current.cancelRecording();
          await startPromise;
        });
      }

      expect(result.current.isRecording).toBe(false);

      // Start recording then unmount while active
      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.isRecording).toBe(true);

      unmount();

      // All acquired tracks must have been stopped
      expect(stopTrackSpies.length).toBeGreaterThan(0);
      for (const spy of stopTrackSpies) {
        expect(spy).toHaveBeenCalled();
      }
    });
  });

  // ==========================================
  // Suite 9: Tab Visibility & Background Hardware Management
  // ==========================================
  describe('9. Tab Visibility & Background Hardware Management', () => {
    it('cancels active recording and releases microphone track when document becomes hidden', async () => {
      const { result, unmount } = renderAudioStudioHook();
      let capturedTrack: any = null;

      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await originalGetUserMedia(constraints);
        capturedTrack = stream.getAudioTracks()[0];
        vi.spyOn(capturedTrack, 'stop');
        return stream;
      };

      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.isRecording).toBe(true);
      expect(capturedTrack).not.toBeNull();

      // Trigger visibility change to 'hidden'
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(result.current.isRecording).toBe(false);
      expect(capturedTrack.stop).toHaveBeenCalled();

      // Restore visibilityState to 'visible'
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      unmount();
    });
  });
});

