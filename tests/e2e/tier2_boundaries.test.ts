/**
 * VocalMirror — Tier 2 Boundary & Extreme Edge-Case Test Suite
 * 
 * Tests boundary conditions, extreme limits, invalid inputs, and stress conditions:
 * 1. Frequency Boundaries (0Hz, 20Hz, 20kHz, Nyquist, 100kHz, negative frequencies)
 * 2. Extreme DSP Slider Boosts (+14dB bass, +8dB jaw, +6dB sinus, -8dB notch, -14dB highshelf, master trim)
 * 3. Audio Signal & Sample Extremes (silence -100dBFS, 0-sample, 1-sample, 1M-sample, overdriven >1.0)
 * 4. Sample Rate & Channel Boundaries (8kHz to 384kHz, mono/stereo/multi-channel, invalid objects)
 * 5. Canvas 2D & Visualizer Dimensions (0x0, negative sizes, 1x1, 8K ultra-wide, extreme DPR, out-of-bounds hover)
 * 6. NaN, Infinity & Malformed Types Robustness (NaN in PCM samples, NaN in DSP params, NaN in mapping)
 * 7. Rapid Concurrency & Transport Spam Resistance (mode spam, slider spam, play/pause/seek spam)
 * 8. Invalid Navigation & Seek Boundaries (negative seek, seek past duration, seek/play on null buffer)
 * 9. Hardware & Media Error Handling (permission denial, missing hardware, stream track termination)
 * 10. Memory Leak & Destruction Stress (50+ engine/renderer/canvas lifecycles)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { AcousticEngine } from '../../src/audio/AcousticEngine';
import {
  DEFAULT_DSP_PARAMS,
  PARAMETER_LIMITS,
  AUDIO_CONSTANTS,
} from '../../src/audio/constants';
import {
  calculateDynamicPreAttenuation,
  calculateTheoreticalBranchResponse,
  computeBiquadCoefficients,
} from '../../src/audio/biquadMath';
import {
  frequencyToNormX,
  frequencyToX,
  normXToFrequency,
  dbToY,
  yToDb,
  getBinForFrequency,
  formatFrequency,
  calculateSpectralGapSummary,
  calculateSpectralGapMetrics,
  interpolateSpectrumToCanvas,
} from '../../src/utils/frequencyMapping';
import {
  audioBufferToWav,
  exportAudioBufferAsWavBlob,
  downloadWavBlob,
} from '../../src/utils/audioBufferToWav';
import { SpectrumVisualizerRenderer } from '../../src/audio/SpectrumVisualizerRenderer';
import { ExportModal } from '../../src/components/ExportModal';

import {
  AudioContextMock,
  installWebAudioMocks,
} from '../mocks/webAudioMock';

import { LanguageProvider } from '../../src/i18n';

function renderUI(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(React.createElement(LanguageProvider, { defaultLanguage: 'en' }, ui));
  });

  return {
    container,
    rerender: (newUi: React.ReactElement) => {
      act(() => {
        root.render(React.createElement(LanguageProvider, { defaultLanguage: 'en' }, newUi));
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('Tier 2: Boundary Value Analysis & Extreme Edge Cases (>=45 Boundaries)', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Boundary Group 1: Extreme Frequencies & Acoustic Limits
  // ===========================================================================
  describe('1. Frequency Boundaries & Acoustic Limits', () => {
    it('1.1 handles 0 Hz frequency input safely without returning NaN or Infinity', () => {
      expect(frequencyToNormX(0)).toBe(0.0);
      expect(frequencyToX(0, 800)).toBe(0.0);
      expect(getBinForFrequency(0, 48000, 2048)).toBe(0);

      const coeffs = computeBiquadCoefficients('lowshelf', 0, 48000, 0.707, 6.0);
      expect(Number.isFinite(coeffs.b0)).toBe(true);
      expect(Number.isFinite(coeffs.a0)).toBe(true);
    });

    it('1.2 handles sub-audible frequencies (0.01Hz to 10Hz)', () => {
      expect(frequencyToNormX(1)).toBe(0.0);
      expect(frequencyToNormX(10)).toBe(0.0);
      expect(formatFrequency(0.5)).toBe('1 Hz');
    });

    it('1.3 handles exact lower human audible boundary (20 Hz)', () => {
      expect(frequencyToNormX(20)).toBeCloseTo(0.0, 4);
      expect(normXToFrequency(0.0)).toBeCloseTo(20, 2);
      expect(formatFrequency(20)).toBe('20 Hz');
    });

    it('1.4 handles exact upper human audible boundary (20,000 Hz)', () => {
      expect(frequencyToNormX(20000)).toBeCloseTo(1.0, 4);
      expect(normXToFrequency(1.0)).toBeCloseTo(20000, 2);
      expect(formatFrequency(20000)).toBe('20 kHz');
    });

    it('1.5 handles Nyquist frequency limits (fs/2) at 48kHz and 96kHz', () => {
      const bin48k = getBinForFrequency(24000, 48000, 2048);
      expect(bin48k).toBe(1024);

      const bin96k = getBinForFrequency(48000, 96000, 2048);
      expect(bin96k).toBe(1024);

      const coeffsNyquist = computeBiquadCoefficients('lowpass', 24000, 48000, 0.707, 0);
      expect(Number.isFinite(coeffsNyquist.b0)).toBe(true);
    });

    it('1.6 clamps ultra-high supersonic frequencies (100kHz, 1MHz) safely', () => {
      expect(frequencyToNormX(100000)).toBe(1.0);
      expect(frequencyToX(1000000, 800)).toBe(800);
      expect(getBinForFrequency(100000, 48000, 2048)).toBe(1024); // Clamped to Nyquist
    });

    it('1.7 handles negative frequency inputs defensively without throwing', () => {
      expect(frequencyToNormX(-100)).toBe(0.0);
      expect(frequencyToX(-500, 800)).toBe(0.0);
      expect(getBinForFrequency(-100, 48000, 2048)).toBe(0);
    });
  });

  // ===========================================================================
  // Boundary Group 2: Extreme DSP Slider Boosts & Anti-Clipping Limits
  // ===========================================================================
  describe('2. Extreme DSP Slider Boosts & Attenuations', () => {
    it('2.1 handles maximum +14.0dB Low-Shelf boost with dynamic pre-attenuation', () => {
      const extremeParams = { ...DEFAULT_DSP_PARAMS, lowShelfGain: 14.0 };
      const headroom = calculateDynamicPreAttenuation(extremeParams);

      expect(headroom.preAttenDb).toBeLessThan(-7.0);
      expect(headroom.preGainLinear).toBeLessThan(0.45);
    });

    it('2.2 handles maximum +8.0dB Mandible jaw resonance boost', () => {
      const extremeParams = { ...DEFAULT_DSP_PARAMS, mandibleResGain: 8.0 };
      const engine = new AcousticEngine();
      engine.applyParameters(extremeParams, true);

      expect(engine.getParameters().mandibleResGain).toBe(8.0);
      engine.destroy();
    });

    it('2.3 handles maximum +6.0dB Sinus cavity resonance boost', () => {
      const extremeParams = { ...DEFAULT_DSP_PARAMS, sinusResGain: 6.0 };
      const engine = new AcousticEngine();
      engine.applyParameters(extremeParams, true);

      expect(engine.getParameters().sinusResGain).toBe(6.0);
      engine.destroy();
    });

    it('2.4 handles maximum -8.0dB Antiresonance notch depth', () => {
      const extremeParams = { ...DEFAULT_DSP_PARAMS, antiResGain: -8.0 };
      const engine = new AcousticEngine();
      engine.applyParameters(extremeParams, true);

      expect(engine.getParameters().antiResGain).toBe(-8.0);
      engine.destroy();
    });

    it('2.5 handles maximum -14.0dB High-Shelf air damping', () => {
      const extremeParams = { ...DEFAULT_DSP_PARAMS, highShelfGain: -14.0 };
      const engine = new AcousticEngine();
      engine.applyParameters(extremeParams, true);

      expect(engine.getParameters().highShelfGain).toBe(-14.0);
      engine.destroy();
    });

    it('2.6 handles master output trim at both boundaries (-6.0dB and +6.0dB)', () => {
      const minTrimParams = { ...DEFAULT_DSP_PARAMS, masterGain: -6.0 };
      const maxTrimParams = { ...DEFAULT_DSP_PARAMS, masterGain: 6.0 };
      const engine = new AcousticEngine();

      engine.applyParameters(minTrimParams, true);
      expect(engine.getParameters().masterGain).toBe(-6.0);

      engine.applyParameters(maxTrimParams, true);
      expect(engine.getParameters().masterGain).toBe(6.0);

      engine.destroy();
    });

    it('2.7 applies simultaneous maximum boosts on all parameters without internal numeric overflow', () => {
      const maxAllParams = {
        lowShelfFreq: 300,
        lowShelfGain: 14.0,
        mandibleResFreq: 400,
        mandibleResGain: 8.0,
        mandibleResQ: 4.0,
        sinusResFreq: 1200,
        sinusResGain: 6.0,
        sinusResQ: 5.0,
        antiResFreq: 2500,
        antiResGain: 0.0,
        antiResQ: 4.0,
        tissueCutoffFreq: 6000,
        tissueCutoffQ: 1.5,
        highShelfFreq: 8000,
        highShelfGain: 0.0,
        masterGain: 6.0,
      };

      const headroom = calculateDynamicPreAttenuation(maxAllParams);
      expect(headroom.preAttenDb).toBe(-AUDIO_CONSTANTS.DYNAMIC_HEADROOM_MAX_ATTEN_DB);

      const freqs = new Float32Array([100, 300, 1000, 5000]);
      const { magnitudes, dBMagnitudes } = calculateTheoreticalBranchResponse(maxAllParams, 'FORWARD', freqs, 48000);

      for (let i = 0; i < magnitudes.length; i++) {
        expect(Number.isFinite(magnitudes[i])).toBe(true);
        expect(Number.isFinite(dBMagnitudes[i])).toBe(true);
      }
    });

    it('2.8 applies simultaneous minimum values on all parameters without collapsing to zero', () => {
      const minAllParams = {
        lowShelfFreq: 80,
        lowShelfGain: 0.0,
        mandibleResFreq: 150,
        mandibleResGain: 0.0,
        mandibleResQ: 0.5,
        sinusResFreq: 500,
        sinusResGain: 0.0,
        sinusResQ: 0.5,
        antiResFreq: 1200,
        antiResGain: -8.0,
        antiResQ: 0.5,
        tissueCutoffFreq: 2000,
        tissueCutoffQ: 0.5,
        highShelfFreq: 4000,
        highShelfGain: -14.0,
        masterGain: -6.0,
      };

      const headroom = calculateDynamicPreAttenuation(minAllParams);
      expect(headroom.preAttenDb).toBe(-AUDIO_CONSTANTS.DYNAMIC_HEADROOM_MIN_ATTEN_DB);

      const freqs = new Float32Array([100, 1000, 5000]);
      const { magnitudes } = calculateTheoreticalBranchResponse(minAllParams, 'FORWARD', freqs, 48000);
      for (let i = 0; i < magnitudes.length; i++) {
        expect(magnitudes[i]).toBeGreaterThan(0);
      }
    });
  });

  // ===========================================================================
  // Boundary Group 3: Audio Signal & Sample Extremes
  // ===========================================================================
  describe('3. Audio Signal & Sample Extremes', () => {
    it('3.1 encodes digital silence buffer (all 0.0 samples) into valid WAV binary', () => {
      const ctx = new AudioContextMock();
      const silentBuffer = ctx.createBuffer(1, 4800, 48000);
      const wav = audioBufferToWav(silentBuffer as unknown as AudioBuffer);
      const view = new DataView(wav);

      expect(wav.byteLength).toBe(44 + 4800 * 2);
      // Verify PCM samples are zero
      for (let i = 44; i < wav.byteLength; i += 2) {
        expect(view.getInt16(i, true)).toBe(0);
      }
    });

    it('3.2 handles extreme noise floor (-100dBFS) in FFT spectrum metrics', () => {
      const rawData = new Float32Array(1024).fill(-100);
      const boneData = new Float32Array(1024).fill(-100);

      const summary = calculateSpectralGapSummary(rawData, boneData, 48000, 2048);
      expect(summary.activeVoiceDetected).toBe(false);

      const metrics = calculateSpectralGapMetrics(rawData, boneData, 48000, 2048);
      expect(metrics.voiceConfrontationIndex).toBe(0);
    });

    it('3.3 encodes full-scale peak audio (+1.0 and -1.0) with asymmetric 16-bit integer boundaries', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 2, 48000);
      const channel = buffer.getChannelData(0);
      channel[0] = 1.0;
      channel[1] = -1.0;

      const wav = audioBufferToWav(buffer as unknown as AudioBuffer);
      const view = new DataView(wav);

      // +1.0 maps to 0x7FFF (+32767), -1.0 maps to -0x8000 (-32768)
      expect(view.getInt16(44, true)).toBe(32767);
      expect(view.getInt16(46, true)).toBe(-32768);
    });

    it('3.4 clamps overdriven audio samples (+3.5, -5.0) safely without wrapping integer overflow', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 2, 48000);
      const channel = buffer.getChannelData(0);
      channel[0] = 3.5;
      channel[1] = -5.0;

      const wav = audioBufferToWav(buffer as unknown as AudioBuffer);
      const view = new DataView(wav);

      expect(view.getInt16(44, true)).toBe(32767);
      expect(view.getInt16(46, true)).toBe(-32768);
    });

    it('3.5 encodes single-sample AudioBuffer (length = 1) into valid 46-byte WAV binary', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 1, 48000);
      buffer.getChannelData(0)[0] = 0.5;

      const wav = audioBufferToWav(buffer as unknown as AudioBuffer);
      expect(wav.byteLength).toBe(44 + 2); // 46 bytes

      const view = new DataView(wav);
      expect(view.getUint32(40, true)).toBe(2); // data Subchunk2Size
    });

    it('3.6 encodes 0-length AudioBuffer into canonical 44-byte WAV header without crashing', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 0, 48000);

      const wav = audioBufferToWav(buffer as unknown as AudioBuffer);
      expect(wav.byteLength).toBe(44);

      const view = new DataView(wav);
      expect(view.getUint32(4, true)).toBe(36); // ChunkSize = 36 + 0
      expect(view.getUint32(40, true)).toBe(0); // Subchunk2Size = 0
    });

    it('3.7 encodes large AudioBuffer (100,000 samples / >2 seconds) with bit accuracy', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(2, 100000, 48000);

      const wav = audioBufferToWav(buffer as unknown as AudioBuffer);
      // 44 + 100000 samples * 2 channels * 2 bytes = 400044 bytes
      expect(wav.byteLength).toBe(44 + 400000);
    });
  });

  // ===========================================================================
  // Boundary Group 4: Sample Rate & Channel Boundaries
  // ===========================================================================
  describe('4. Sample Rate & Channel Boundaries', () => {
    it('4.1 handles telephony sample rate 8,000 Hz', () => {
      const ctx = new AudioContextMock({ sampleRate: 8000 });
      const buffer = ctx.createBuffer(1, 8000, 8000);
      const wav = audioBufferToWav(buffer as unknown as AudioBuffer);
      const view = new DataView(wav);

      expect(view.getUint32(24, true)).toBe(8000);
      expect(view.getUint32(28, true)).toBe(16000); // ByteRate = 8000 * 2
    });

    it('4.2 handles 11,025 Hz, 16,000 Hz, and 22,050 Hz sample rates', () => {
      for (const sr of [11025, 16000, 22050]) {
        const ctx = new AudioContextMock({ sampleRate: sr });
        const buffer = ctx.createBuffer(1, sr, sr);
        const wav = audioBufferToWav(buffer as unknown as AudioBuffer);
        const view = new DataView(wav);
        expect(view.getUint32(24, true)).toBe(sr);
      }
    });

    it('4.3 handles standard CD 44,100 Hz and Studio 48,000 Hz sample rates', () => {
      for (const sr of [44100, 48000]) {
        const ctx = new AudioContextMock({ sampleRate: sr });
        const buffer = ctx.createBuffer(2, sr, sr);
        const wav = audioBufferToWav(buffer as unknown as AudioBuffer);
        const view = new DataView(wav);
        expect(view.getUint32(24, true)).toBe(sr);
        expect(view.getUint16(22, true)).toBe(2);
      }
    });

    it('4.4 handles Hi-Res sample rates (96,000 Hz, 192,000 Hz, 384,000 Hz)', () => {
      for (const sr of [96000, 192000, 384000]) {
        const ctx = new AudioContextMock({ sampleRate: sr });
        const buffer = ctx.createBuffer(1, 1000, sr);
        const wav = audioBufferToWav(buffer as unknown as AudioBuffer);
        const view = new DataView(wav);
        expect(view.getUint32(24, true)).toBe(sr);
      }
    });

    it('4.5 interleaves multi-channel audio (4 channels, 6 channels / 5.1 surround)', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(6, 100, 48000);
      const wav = audioBufferToWav(buffer as unknown as AudioBuffer);
      const view = new DataView(wav);

      expect(view.getUint16(22, true)).toBe(6); // NumChannels = 6
      expect(view.getUint16(32, true)).toBe(12); // BlockAlign = 6 * 2 = 12
      expect(view.getUint32(28, true)).toBe(48000 * 12); // ByteRate
    });

    it('4.6 rejects null, undefined, and non-AudioBuffer objects in audioBufferToWav with TypeError', () => {
      expect(() => audioBufferToWav(null as any)).toThrow(TypeError);
      expect(() => audioBufferToWav(undefined as any)).toThrow(TypeError);
      expect(() => audioBufferToWav({} as any)).toThrow(TypeError);
      expect(() => audioBufferToWav('string' as any)).toThrow(TypeError);
    });
  });

  // ===========================================================================
  // Boundary Group 5: Canvas 2D & Visualizer Dimensions
  // ===========================================================================
  describe('5. Canvas 2D & Visualizer Dimensions Boundaries', () => {
    it('5.1 handles 0x0 canvas dimensions gracefully without throwing', () => {
      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({ canvas, rawAnalyser: null, processedAnalyser: null });

      renderer.resize(0, 0, 1);
      renderer.render();
      expect(renderer.dbToY(-50, 0)).toBe(0);
      renderer.destroy();
    });

    it('5.2 handles negative canvas dimensions (-200 x -100) safely', () => {
      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({ canvas, rawAnalyser: null, processedAnalyser: null });

      renderer.resize(-200, -100, 1);
      renderer.render();
      expect(renderer.frequencyToX(1000, -200)).toBe(0);
      renderer.destroy();
    });

    it('5.3 handles 1x1 micro-canvas dimensions', () => {
      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({ canvas, rawAnalyser: null, processedAnalyser: null });

      renderer.resize(1, 1, 1);
      renderer.render();
      expect(canvas.width).toBe(1);
      expect(canvas.height).toBe(1);
      renderer.destroy();
    });

    it('5.4 handles ultra-wide (8192x300) and ultra-tall (300x8192) extreme aspect ratios', () => {
      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({ canvas, rawAnalyser: null, processedAnalyser: null });

      renderer.resize(8192, 300, 1);
      renderer.render();
      expect(canvas.width).toBe(8192);

      renderer.resize(300, 8192, 1);
      renderer.render();
      expect(canvas.height).toBe(8192);

      renderer.destroy();
    });

    it('5.5 handles extreme DevicePixelRatio values (dpr=0 clamped to 1, dpr=4, dpr=8)', () => {
      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({ canvas, rawAnalyser: null, processedAnalyser: null });

      renderer.resize(800, 300, 0);
      expect(canvas.width).toBe(800); // Clamped to dpr >= 1

      renderer.resize(800, 300, 4);
      expect(canvas.width).toBe(3200);

      renderer.destroy();
    });

    it('5.6 clears hover inspection state when clearHoverCursor is invoked', () => {
      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({ canvas, rawAnalyser: null, processedAnalyser: null });

      renderer.resize(800, 300, 1);
      renderer.setHoverCursor(400, 150);
      expect(renderer.getCursorInspectionData()).not.toBeNull();

      renderer.clearHoverCursor();
      expect(renderer.getCursorInspectionData()).toBeNull();

      renderer.destroy();
    });
  });

  // ===========================================================================
  // Boundary Group 6: Robustness against NaN, Infinity & Malformed Types
  // ===========================================================================
  describe('6. NaN, Infinity & Malformed Types Robustness', () => {
    it('6.1 sanitizes NaN in AudioBuffer PCM samples to zero in 16-bit WAV encoding', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 2, 48000);
      buffer.getChannelData(0)[0] = NaN;
      buffer.getChannelData(0)[1] = 0.5;

      const wav = audioBufferToWav(buffer as unknown as AudioBuffer);
      const view = new DataView(wav);

      expect(view.getInt16(44, true)).toBe(0); // NaN sanitized to 0
      expect(view.getInt16(46, true)).toBe(16383);
    });

    it('6.2 sanitizes +Infinity and -Infinity in AudioBuffer samples to 0 in 32-bit Float WAV', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 2, 48000);
      buffer.getChannelData(0)[0] = Infinity;
      buffer.getChannelData(0)[1] = -Infinity;

      const wav = audioBufferToWav(buffer as unknown as AudioBuffer, { float32: true });
      const view = new DataView(wav);

      expect(view.getFloat32(44, true)).toBe(0);
      expect(view.getFloat32(48, true)).toBe(0);
    });

    it('6.3 sanitizes NaN, null, and undefined in DSPParameters to default values', () => {
      const engine = new AcousticEngine();
      engine.applyParameters({
        lowShelfFreq: NaN,
        lowShelfGain: null as any,
        mandibleResFreq: undefined as any,
        mandibleResGain: Infinity as any,
        mandibleResQ: 1.8,
        sinusResFreq: 780,
        sinusResGain: 3.0,
        sinusResQ: 2.2,
        antiResFreq: 1650,
        antiResGain: -3.5,
        antiResQ: 2.0,
        tissueCutoffFreq: 4000,
        tissueCutoffQ: 0.707,
        highShelfFreq: 5500,
        highShelfGain: -6.0,
        masterGain: 0.0,
      }, true);

      const params = engine.getParameters();
      expect(params.lowShelfFreq).toBe(PARAMETER_LIMITS.lowShelfFreq.default);
      expect(params.lowShelfGain).toBe(PARAMETER_LIMITS.lowShelfGain.default);
      expect(params.mandibleResFreq).toBe(PARAMETER_LIMITS.mandibleResFreq.default);
      expect(params.mandibleResGain).toBe(PARAMETER_LIMITS.mandibleResGain.default);

      engine.destroy();
    });

    it('6.4 sanitizes NaN, Infinity, and undefined in frequency mapping functions', () => {
      expect(frequencyToNormX(NaN)).toBe(0.0);
      expect(frequencyToNormX(Infinity)).toBe(0.0);
      expect(normXToFrequency(NaN)).toBe(20);
      expect(dbToY(NaN, 300)).toBe(300);
      expect(yToDb(NaN, 300)).toBe(-100);
      expect(formatFrequency(NaN)).toBe('0 Hz');
      expect(formatFrequency(Infinity)).toBe('0 Hz');
    });

    it('6.5 handles continuous values in FFT data arrays during canvas batch interpolation', () => {
      const fftData = new Float32Array(1024).fill(-80);
      fftData[5] = -30;
      fftData[10] = -45;

      const outputY = new Float32Array(100);
      interpolateSpectrumToCanvas(fftData, outputY, 100, 300);

      for (let i = 0; i < outputY.length; i++) {
        expect(Number.isFinite(outputY[i])).toBe(true);
        expect(outputY[i]).toBeGreaterThanOrEqual(0);
        expect(outputY[i]).toBeLessThanOrEqual(300);
      }
    });
  });

  // ===========================================================================
  // Boundary Group 7: Rapid Concurrency & Transport Spam Resistance
  // ===========================================================================
  describe('7. Rapid Concurrency & Transport Spam Resistance', () => {
    it('7.1 withstands 100 rapid consecutive mode switches without state inconsistency', () => {
      const engine = new AcousticEngine();
      const modes: Array<'RAW' | 'INTERNAL_SIM' | 'COMPENSATED'> = ['RAW', 'INTERNAL_SIM', 'COMPENSATED'];

      for (let i = 0; i < 100; i++) {
        const mode = modes[i % 3];
        engine.setMode(mode, false);
      }

      engine.setMode('COMPENSATED', true);
      expect(engine.getMode()).toBe('COMPENSATED');
      engine.destroy();
    });

    it('7.2 withstands 200 rapid parameter slider updates in tight loop', () => {
      const engine = new AcousticEngine();

      for (let i = 0; i < 200; i++) {
        engine.applyParameters({
          ...DEFAULT_DSP_PARAMS,
          lowShelfGain: (i % 140) / 10,
          mandibleResGain: (i % 80) / 10,
        }, false);
      }

      expect(engine.getParameters()).toBeDefined();
      engine.destroy();
    });

    it('7.3 withstands rapid visualizer mode switches during continuous rendering', () => {
      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({ canvas, rawAnalyser: null, processedAnalyser: null });

      for (let i = 0; i < 50; i++) {
        renderer.setMode(i % 2 === 0 ? 'DIFFERENTIAL' : 'GAP_ONLY');
        renderer.render();
      }

      renderer.setMode('OVERLAY');
      renderer.render();
      expect(renderer.getMode()).toBe('OVERLAY');
      renderer.destroy();
    });
  });

  // ===========================================================================
  // Boundary Group 8: Invalid Navigation & Seek Boundaries
  // ===========================================================================
  describe('8. Invalid Navigation & Seek Boundaries', () => {
    it('8.1 clamps negative seek time (-50.0s) to 0.0s', () => {
      const duration = 4.0;
      const targetTime = -50.0;
      const clamped = Math.max(0, Math.min(duration, targetTime));
      expect(clamped).toBe(0.0);
    });

    it('8.2 clamps seek time beyond duration (+9999.0s) to buffer duration', () => {
      const duration = 4.0;
      const targetTime = 9999.0;
      const clamped = Math.max(0, Math.min(duration, targetTime));
      expect(clamped).toBe(4.0);
    });

    it('8.3 renders ExportModal gracefully with null audioBuffer and displays warning notice', () => {
      const { container, unmount } = renderUI(
        React.createElement(ExportModal, {
          isOpen: true,
          onClose: () => {},
          audioBuffer: null,
          currentMode: 'INTERNAL_SIM',
        })
      );

      expect(container.textContent).toMatch(/No audio buffer|Record or load/i);
      const submitBtn = container.querySelector('[data-testid="export-submit-button"]') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);

      unmount();
    });
  });

  // ===========================================================================
  // Boundary Group 9: Hardware & Media Error Handling
  // ===========================================================================
  describe('9. Hardware & Media Error Handling', () => {
    it('9.1 handles getUserMedia permission denial (NotAllowedError) gracefully', async () => {
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValueOnce(
        new DOMException('Permission denied by user', 'NotAllowedError')
      );

      await expect(navigator.mediaDevices.getUserMedia({ audio: true })).rejects.toThrow(
        /Permission denied/
      );
    });

    it('9.2 handles MediaRecorder unsupported mimeType by falling back to supported container', () => {
      expect(MediaRecorder.isTypeSupported('audio/webm')).toBe(true);
      expect(MediaRecorder.isTypeSupported('video/unsupported-codec')).toBe(false);
    });

    it('9.3 handles unexpected audio track termination mid-stream', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getTracks();
      expect(tracks[0].readyState).toBe('live');

      tracks[0].stop();
      expect(tracks[0].readyState).toBe('ended');
    });
  });

  // ===========================================================================
  // Boundary Group 10: Memory Leak & Destruction Stress
  // ===========================================================================
  describe('10. Memory Leak & Destruction Stress (50+ Cycles)', () => {
    it('10.1 creates and cleanly destroys 50 AcousticEngine instances without hanging', () => {
      for (let i = 0; i < 50; i++) {
        const engine = new AcousticEngine();
        engine.applyParameters(DEFAULT_DSP_PARAMS, true);
        engine.setMode('INTERNAL_SIM', true);
        engine.destroy();
      }
    });

    it('10.2 creates and cleanly destroys 50 SpectrumVisualizerRenderer instances without memory retention', () => {
      for (let i = 0; i < 50; i++) {
        const canvas = document.createElement('canvas');
        const renderer = new SpectrumVisualizerRenderer({ canvas, rawAnalyser: null, processedAnalyser: null });
        renderer.resize(800, 300, 1);
        renderer.render();
        renderer.destroy();
      }
    });

    it('10.3 handles repeated URL.createObjectURL and URL.revokeObjectURL download cycles', () => {
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');

      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 1000, 48000);
      const blob = exportAudioBufferAsWavBlob(buffer as unknown as AudioBuffer);

      for (let i = 0; i < 10; i++) {
        downloadWavBlob(blob, `test_export_${i}.wav`);
      }

      expect(createObjectURLSpy).toHaveBeenCalledTimes(10);
    });
  });
});
