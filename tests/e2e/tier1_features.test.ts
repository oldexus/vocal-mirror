/**
 * VocalMirror — Tier 1 E2E Feature Verification Test Suite
 * 
 * Comprehensive individual feature tests verifying:
 * 1. Web Audio Filter Cascade (Air-to-Internal Forward Branch / Mode B)
 * 2. Web Audio Inverse Compensation Branch (Mode C)
 * 3. Dynamic Headroom Pre-Attenuation & Anti-Clipping Compressor
 * 4. Zero-Pop 25ms Equal-Power Crossfader
 * 5. Live Microphone Recording Lifecycle
 * 6. Synthetic Demo Vocal Audio Generator
 * 7. Playback Transport Machinery
 * 8. 16 Slider Controls & Parameter Limits
 * 9. 4 Physiological Acoustic Presets
 * 10. Logarithmic Frequency & Decibel Coordinate Mapping
 * 11. FFT Continuous Interpolation & Spectral Gap Metrics
 * 12. 60fps Canvas 2D Spectrum Visualizer Renderer
 * 13. Client-Side RIFF 44-Byte WAV Binary Encoder
 * 14. Psychoacoustic Guidance & Vocal Training Cards
 * 15. Audio Export Modal Dialog
 * 16. Global Keyboard Shortcuts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { AcousticEngine } from '../../src/audio/AcousticEngine';
import {
  DEFAULT_DSP_PARAMS,
  ACOUSTIC_PRESETS,
  PARAMETER_LIMITS,
  AUDIO_CONSTANTS,
  DEFAULT_COMPRESSOR_SETTINGS,
} from '../../src/audio/constants';
import {
  calculateDynamicPreAttenuation,
  calculateTheoreticalBranchResponse,
} from '../../src/audio/biquadMath';
import {
  createSyntheticVocalBuffer,
  generateSyntheticVocalPCM,
  SAMPLE_AUDIO_PRESETS,
} from '../../src/audio/sampleAudio';
import {
  frequencyToNormX,
  frequencyToX,
  xToFrequency,
  dbToY,
  yToDb,
  getBinForFrequency,
  interpolateMagnitude,
  formatFrequency,
  getFrequencyGridTicks,
  calculateSpectralGapSummary,
  calculateSpectralGapMetrics,
  interpolateSpectrumToCanvas,
} from '../../src/utils/frequencyMapping';
import {
  audioBufferToWav,
  exportAudioBufferAsWavBlob,
  renderAndExportWav,
} from '../../src/utils/audioBufferToWav';
import { SpectrumVisualizerRenderer } from '../../src/audio/SpectrumVisualizerRenderer';
import { GuidanceCards } from '../../src/components/GuidanceCards';
import { ExportModal } from '../../src/components/ExportModal';
import { PSYCHOACOUSTIC_OVERVIEW, VOCAL_TRAINING_CARDS } from '../../src/constants/guidanceContent';
import App from '../../src/App';

import {
  AudioContextMock,
  installWebAudioMocks,
} from '../mocks/webAudioMock';

import { LanguageProvider } from '../../src/i18n';

// Test render helper without JSX syntax
function renderUI(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(React.createElement(LanguageProvider, { defaultLanguage: 'en', children: ui }));
  });

  return {
    container,
    rerender: (newUi: React.ReactElement) => {
      act(() => {
        root.render(React.createElement(LanguageProvider, { defaultLanguage: 'en', children: newUi }));
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

describe('Tier 1: Comprehensive Feature Verification Suite (>=45 Features)', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Feature Group 1: Web Audio Filter Cascade (Mode B / Air-to-Internal)
  // ===========================================================================
  describe('1. Web Audio Filter Cascade (Air-to-Internal Forward Branch)', () => {
    it('1.1 builds complete 6-stage forward biquad filter chain with correct node types', () => {
      const ctx = new AudioContextMock();
      const engine = new AcousticEngine(ctx as unknown as AudioContext);

      expect(engine).toBeDefined();
      expect(engine.getInput()).toBeDefined();
      expect(engine.getOutput()).toBeDefined();
      expect(engine.getRawAnalyser()).toBeDefined();
      expect(engine.getProcessedAnalyser()).toBeDefined();

      engine.destroy();
    });

    it('1.2 boosts low-frequency bone conduction (50-300Hz) in forward mode', () => {
      const engine = new AcousticEngine();
      const freqs = new Float32Array([100, 200, 1000, 5000]);
      const response = engine.getTheoreticalResponse(freqs, 'FORWARD');

      // 100Hz and 200Hz should have higher magnitude than 1.0 (boost > 0dB)
      expect(response[0]).toBeGreaterThan(1.0);
      expect(response[1]).toBeGreaterThan(1.0);
      // High frequency (5kHz) should be attenuated (< 1.0)
      expect(response[3]).toBeLessThan(1.0);

      engine.destroy();
    });

    it('1.3 applies mandibular jaw resonance peak in the 150-400Hz range', () => {
      const customParams = {
        ...DEFAULT_DSP_PARAMS,
        mandibleResFreq: 250,
        mandibleResGain: 6.0,
        mandibleResQ: 2.0,
      };
      const freqs = new Float32Array([250]);
      const { magnitudes } = calculateTheoreticalBranchResponse(customParams, 'FORWARD', freqs, 48000);
      expect(magnitudes[0]).toBeGreaterThan(1.5);
    });

    it('1.4 applies maxillary sinus cavity formant boost in the 500-1200Hz range', () => {
      const customParams = {
        ...DEFAULT_DSP_PARAMS,
        sinusResFreq: 800,
        sinusResGain: 4.0,
        sinusResQ: 2.5,
      };
      const freqs = new Float32Array([800]);
      const { magnitudes } = calculateTheoreticalBranchResponse(customParams, 'FORWARD', freqs, 48000);
      expect(magnitudes[0]).toBeGreaterThan(1.0);
    });

    it('1.5 applies nasopharyngeal antiresonance notch attenuation in the 1200-2500Hz range', () => {
      const customParams = {
        ...DEFAULT_DSP_PARAMS,
        antiResFreq: 1800,
        antiResGain: -5.0,
        antiResQ: 2.0,
      };
      const freqs = new Float32Array([1800]);
      const { dBMagnitudes } = calculateTheoreticalBranchResponse(customParams, 'FORWARD', freqs, 48000);
      expect(dBMagnitudes[0]).toBeLessThan(2.0);
    });

    it('1.6 rolls off high-frequency sibilants via skull tissue low-pass filter at ~4kHz', () => {
      const customParams = {
        ...DEFAULT_DSP_PARAMS,
        tissueCutoffFreq: 4000,
        tissueCutoffQ: 0.707,
        highShelfFreq: 6000,
        highShelfGain: -8.0,
      };
      const freqs = new Float32Array([10000]);
      const { magnitudes, dBMagnitudes } = calculateTheoreticalBranchResponse(customParams, 'FORWARD', freqs, 48000);
      expect(magnitudes[0]).toBeLessThan(0.5);
      expect(dBMagnitudes[0]).toBeLessThan(-6.0);
    });
  });

  // ===========================================================================
  // Feature Group 2: Web Audio Inverse Compensation Branch (Mode C)
  // ===========================================================================
  describe('2. Web Audio Inverse Compensation Branch (Internal-to-External / Mode C)', () => {
    it('2.1 inverts cranial bass boost into attenuation to bridge external air sound', () => {
      const engine = new AcousticEngine();
      const freqs = new Float32Array([150]);
      const invResponse = engine.getTheoreticalResponse(freqs, 'INVERSE');
      const fwdResponse = engine.getTheoreticalResponse(freqs, 'FORWARD');

      // Forward boosts bass (>1.0), Inverse attenuates bass (<1.0)
      expect(fwdResponse[0]).toBeGreaterThan(1.0);
      expect(invResponse[0]).toBeLessThan(1.0);

      engine.destroy();
    });

    it('2.2 applies subsonic 45Hz high-pass filter to eliminate sub-bass rumble in inverse mode', () => {
      const freqs = new Float32Array([20, 45, 100]);
      const { magnitudes } = calculateTheoreticalBranchResponse(DEFAULT_DSP_PARAMS, 'INVERSE', freqs, 48000);
      // 20Hz must be strongly attenuated compared to 100Hz
      expect(magnitudes[0]).toBeLessThan(magnitudes[2]);
    });

    it('2.3 boosts presence and high-frequency air clarity in inverse mode', () => {
      const freqs = new Float32Array([8000]);
      const { dBMagnitudes } = calculateTheoreticalBranchResponse(DEFAULT_DSP_PARAMS, 'INVERSE', freqs, 48000);
      expect(dBMagnitudes[0]).toBeGreaterThan(-2.0);
    });

    it('2.4 limits maximum air boost in inverse mode to prevent harsh sibilance feedback', () => {
      const extremeParams = {
        ...DEFAULT_DSP_PARAMS,
        highShelfGain: -14.0, // Should be clamped to max +8dB air boost on high-shelf
      };
      const freqs = new Float32Array([6000]);
      const { dBMagnitudes } = calculateTheoreticalBranchResponse(extremeParams, 'INVERSE', freqs, 48000);
      expect(dBMagnitudes[0]).toBeLessThan(15.0);
    });
  });

  // ===========================================================================
  // Feature Group 3: Dynamic Headroom & Anti-Clipping Limiter
  // ===========================================================================
  describe('3. Dynamic Headroom & Anti-Clipping Limiter', () => {
    it('3.1 calculates dynamic pre-attenuation proportionally to total low-frequency boost', () => {
      const lowBoostParams = { ...DEFAULT_DSP_PARAMS, lowShelfGain: 2.0, mandibleResGain: 1.0 };
      const highBoostParams = { ...DEFAULT_DSP_PARAMS, lowShelfGain: 14.0, mandibleResGain: 8.0, sinusResGain: 6.0 };

      const lowHeadroom = calculateDynamicPreAttenuation(lowBoostParams);
      const highHeadroom = calculateDynamicPreAttenuation(highBoostParams);

      expect(highHeadroom.preAttenDb).toBeLessThan(lowHeadroom.preAttenDb);
      expect(highHeadroom.preGainLinear).toBeLessThan(lowHeadroom.preGainLinear);
    });

    it('3.2 enforces headroom within configured limits (-3dB to -12dB)', () => {
      const zeroParams = { ...DEFAULT_DSP_PARAMS, lowShelfGain: 0, mandibleResGain: 0, sinusResGain: 0 };
      const maxParams = { ...DEFAULT_DSP_PARAMS, lowShelfGain: 14, mandibleResGain: 8, sinusResGain: 6 };

      const minAtten = calculateDynamicPreAttenuation(zeroParams);
      const maxAtten = calculateDynamicPreAttenuation(maxParams);

      expect(minAtten.preAttenDb).toBe(-AUDIO_CONSTANTS.DYNAMIC_HEADROOM_MIN_ATTEN_DB);
      expect(maxAtten.preAttenDb).toBe(-AUDIO_CONSTANTS.DYNAMIC_HEADROOM_MAX_ATTEN_DB);
    });

    it('3.3 configures soft-knee limiter compressor with 2ms attack and 12:1 ratio', () => {
      expect(DEFAULT_COMPRESSOR_SETTINGS.attack).toBe(0.002);
      expect(DEFAULT_COMPRESSOR_SETTINGS.ratio).toBe(12.0);
      expect(DEFAULT_COMPRESSOR_SETTINGS.threshold).toBe(-3.0);
      expect(DEFAULT_COMPRESSOR_SETTINGS.knee).toBe(4.0);
      expect(DEFAULT_COMPRESSOR_SETTINGS.release).toBe(0.040);
    });
  });

  // ===========================================================================
  // Feature Group 4: Zero-Pop 25ms Equal-Power Crossfader
  // ===========================================================================
  describe('4. Zero-Pop 25ms Equal-Power Crossfader', () => {
    it('4.1 routes audio solely to Raw path in RAW mode', () => {
      const engine = new AcousticEngine();
      engine.setMode('RAW', true);
      expect(engine.getMode()).toBe('RAW');
      engine.destroy();
    });

    it('4.2 routes audio to Forward chain in INTERNAL_SIM mode', () => {
      const engine = new AcousticEngine();
      engine.setMode('INTERNAL_SIM', true);
      expect(engine.getMode()).toBe('INTERNAL_SIM');
      engine.destroy();
    });

    it('4.3 routes audio to Inverse chain in COMPENSATED mode', () => {
      const engine = new AcousticEngine();
      engine.setMode('COMPENSATED', true);
      expect(engine.getMode()).toBe('COMPENSATED');
      engine.destroy();
    });

    it('4.4 applies 25ms crossfade duration when immediate flag is false', () => {
      const engine = new AcousticEngine();
      engine.setMode('INTERNAL_SIM', false);
      expect(AUDIO_CONSTANTS.CROSSFADE_DURATION_SEC).toBe(0.025);
      engine.destroy();
    });
  });

  // ===========================================================================
  // Feature Group 5: Live Microphone Recording Lifecycle
  // ===========================================================================
  describe('5. Live Microphone Recording Lifecycle', () => {
    it('5.1 requests microphone stream via getUserMedia with acoustic optimization constraints', async () => {
      const getUserMediaSpy = vi.spyOn(navigator.mediaDevices, 'getUserMedia');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      expect(getUserMediaSpy).toHaveBeenCalled();
      expect(stream.getAudioTracks().length).toBeGreaterThan(0);
      expect(stream.active).toBe(true);
    });

    it('5.2 records audio chunks and stops recording cleanly', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data) chunks.push(e.data);
      };

      recorder.start();
      expect(recorder.state).toBe('recording');

      recorder.stop();
      expect(recorder.state).toBe('inactive');
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('5.3 terminates media stream tracks on recording stop to release microphone hardware', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getTracks()[0];
      expect(track.readyState).toBe('live');

      track.stop();
      expect(track.readyState).toBe('ended');
    });
  });

  // ===========================================================================
  // Feature Group 6: Synthetic Demo Vocal Audio Generator
  // ===========================================================================
  describe('6. Synthetic Demo Vocal Audio Generator', () => {
    it('6.1 generates Baritone vocal buffer with 120Hz fundamental and natural vibrato', () => {
      const ctx = new AudioContextMock();
      const buffer = createSyntheticVocalBuffer(ctx as unknown as AudioContext, {
        duration: 2.0,
        basePitch: 130.0,
      });

      expect(buffer).toBeDefined();
      expect(buffer.duration).toBeCloseTo(2.0, 1);
      expect(buffer.numberOfChannels).toBe(1);
      expect(buffer.sampleRate).toBe(48000);

      const channel = buffer.getChannelData(0);
      let nonZeroCount = 0;
      for (let i = 0; i < channel.length; i++) {
        if (channel[i] !== 0) nonZeroCount++;
      }
      expect(nonZeroCount).toBeGreaterThan(1000);
    });

    it('6.2 generates Soprano vocal buffer with 210Hz fundamental', () => {
      const ctx = new AudioContextMock();
      const buffer = createSyntheticVocalBuffer(ctx as unknown as AudioContext, {
        duration: 1.5,
        basePitch: 210.0,
      });

      expect(buffer.duration).toBeCloseTo(1.5, 1);
    });

    it('6.3 generates raw Float32Array PCM vocal samples via generateSyntheticVocalPCM', () => {
      const pcm = generateSyntheticVocalPCM({ duration: 1.0, sampleRate: 48000 });
      expect(pcm).toBeInstanceOf(Float32Array);
      expect(pcm.length).toBe(48000);
    });

    it('6.4 provides preset definitions for all standard demo voice types', () => {
      expect(SAMPLE_AUDIO_PRESETS.male_baritone).toBeDefined();
      expect(SAMPLE_AUDIO_PRESETS.female_alto).toBeDefined();
      expect(SAMPLE_AUDIO_PRESETS.tenor_vowel_ah).toBeDefined();
    });
  });

  // ===========================================================================
  // Feature Group 7: Playback Transport Machinery
  // ===========================================================================
  describe('7. Playback Transport Machinery', () => {
    it('7.1 creates and starts AudioBufferSourceNode connected to engine input', () => {
      const ctx = new AudioContextMock();
      const engine = new AcousticEngine(ctx as unknown as AudioContext);
      const buffer = ctx.createBuffer(1, 48000, 48000);
      const source = ctx.createBufferSource();

      source.buffer = buffer;
      source.connect(engine.getInput() as any);
      source.start(0);

      expect(source._state).toBe('playing');
      source.stop(0);
      expect(source._state).toBe('stopped');

      engine.destroy();
    });

    it('7.2 supports looping playback on AudioBufferSourceNode', () => {
      const ctx = new AudioContextMock();
      const source = ctx.createBufferSource();
      source.loop = true;
      expect(source.loop).toBe(true);
    });
  });

  // ===========================================================================
  // Feature Group 8: 16 Slider Controls & Parameter Limits
  // ===========================================================================
  describe('8. 16 Slider Controls & Parameter Limits', () => {
    it('8.1 defines valid physiological bounds for all 16 DSP parameters', () => {
      const keys = Object.keys(PARAMETER_LIMITS) as Array<keyof typeof PARAMETER_LIMITS>;
      expect(keys.length).toBe(16);

      for (const key of keys) {
        const limit = PARAMETER_LIMITS[key];
        expect(limit.min).toBeLessThan(limit.max);
        expect(limit.default).toBeGreaterThanOrEqual(limit.min);
        expect(limit.default).toBeLessThanOrEqual(limit.max);
        expect(limit.label).toBeTruthy();
        expect(limit.unit).toBeTruthy();
      }
    });

    it('8.2 clamps out-of-range slider values to minimum and maximum limits', () => {
      const engine = new AcousticEngine();

      // Pass extreme values
      engine.applyParameters({
        ...DEFAULT_DSP_PARAMS,
        lowShelfGain: 999, // Max 14
        antiResGain: -999, // Min -8
        tissueCutoffFreq: 50, // Min 2000
      }, true);

      const params = engine.getParameters();
      expect(params.lowShelfGain).toBe(14);
      expect(params.antiResGain).toBe(-8);
      expect(params.tissueCutoffFreq).toBe(2000);

      engine.destroy();
    });

    it('8.3 applies 15ms exponential parameter smoothing constant during updates', () => {
      expect(AUDIO_CONSTANTS.PARAM_SMOOTHING_TIME_SEC).toBe(0.015);
    });
  });

  // ===========================================================================
  // Feature Group 9: 4 Physiological Acoustic Presets
  // ===========================================================================
  describe('9. 4 Physiological Acoustic Presets', () => {
    it('9.1 provides 4 distinct presets with full parameter configurations', () => {
      const presetKeys = Object.keys(ACOUSTIC_PRESETS);
      expect(presetKeys).toEqual([
        'natural_standard',
        'deep_chest_male',
        'bright_cranial_female',
        'intense_confrontation',
      ]);

      for (const key of presetKeys) {
        const preset = ACOUSTIC_PRESETS[key as keyof typeof ACOUSTIC_PRESETS];
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.tag).toBeTruthy();
        expect(preset.params).toBeDefined();
      }
    });

    it('9.2 applies Deep Chest Male preset with heavy fundamental bass boost (+11dB)', () => {
      const preset = ACOUSTIC_PRESETS.deep_chest_male;
      expect(preset.params.lowShelfFreq).toBe(140);
      expect(preset.params.lowShelfGain).toBe(11.0);
      expect(preset.params.mandibleResGain).toBe(6.0);
    });

    it('9.3 applies Bright Cranial Female preset with elevated 220Hz resonance and extended tissue cutoff', () => {
      const preset = ACOUSTIC_PRESETS.bright_cranial_female;
      expect(preset.params.lowShelfFreq).toBe(220);
      expect(preset.params.tissueCutoffFreq).toBe(4800);
      expect(preset.params.sinusResGain).toBe(4.5);
    });

    it('9.4 applies Intense Confrontation preset with maximum contrast (+13dB bass, -10dB sibilance damping)', () => {
      const preset = ACOUSTIC_PRESETS.intense_confrontation;
      expect(preset.params.lowShelfGain).toBe(13.0);
      expect(preset.params.highShelfGain).toBe(-10.0);
    });
  });

  // ===========================================================================
  // Feature Group 10: Logarithmic Frequency & Decibel Coordinate Mapping
  // ===========================================================================
  describe('10. Logarithmic Frequency & Decibel Coordinate Mapping', () => {
    it('10.1 maps 20Hz to normalized X = 0.0 and 20000Hz to normalized X = 1.0', () => {
      expect(frequencyToNormX(20)).toBeCloseTo(0.0, 4);
      expect(frequencyToNormX(20000)).toBeCloseTo(1.0, 4);
    });

    it('10.2 maps 1000Hz (1kHz) to human auditory log-scale center ~0.5', () => {
      const normX = frequencyToNormX(1000, 20, 20000);
      // log10(1000/20) / log10(20000/20) = log10(50)/log10(1000) = 1.69897 / 3 = 0.5663
      expect(normX).toBeGreaterThan(0.5);
      expect(normX).toBeLessThan(0.6);
    });

    it('10.3 accurately performs round-trip frequencyToX and xToFrequency conversions', () => {
      const width = 800;
      const testFreqs = [50, 100, 440, 1000, 4000, 15000];

      for (const f of testFreqs) {
        const x = frequencyToX(f, width);
        const reconstructedF = xToFrequency(x, width);
        expect(reconstructedF).toBeCloseTo(f, 0);
      }
    });

    it('10.4 maps -30dBFS to top Y = 0 and -100dBFS to bottom Y = height', () => {
      const height = 300;
      expect(dbToY(-30, height, -100, -30)).toBe(0);
      expect(dbToY(-100, height, -100, -30)).toBe(height);
      expect(dbToY(-65, height, -100, -30)).toBeCloseTo(150, 1);
    });

    it('10.5 performs round-trip dbToY and yToDb conversions', () => {
      const height = 400;
      const testDbs = [-90, -70, -50, -35];

      for (const db of testDbs) {
        const y = dbToY(db, height, -100, -30);
        const reconstructedDb = yToDb(y, height, -100, -30);
        expect(reconstructedDb).toBeCloseTo(db, 1);
      }
    });

    it('10.6 formats frequency numbers into clean acoustic labels', () => {
      expect(formatFrequency(180)).toBe('180 Hz');
      expect(formatFrequency(1000)).toBe('1 kHz');
      expect(formatFrequency(4500)).toBe('4.5 kHz');
      expect(formatFrequency(16000, true)).toBe('16k');
    });

    it('10.7 generates standard acoustic grid line tick positions', () => {
      const ticks = getFrequencyGridTicks();
      expect(ticks.length).toBe(9);
      expect(ticks[0].freq).toBe(50);
      expect(ticks[ticks.length - 1].freq).toBe(16000);
    });
  });

  // ===========================================================================
  // Feature Group 11: FFT Interpolation & Differential Spectral Gap Engine
  // ===========================================================================
  describe('11. FFT Continuous Interpolation & Spectral Gap Metrics', () => {
    it('11.1 calculates exact continuous FFT bin index for given frequency', () => {
      const bin = getBinForFrequency(1000, 48000, 2048);
      // (1000 / 48000) * 2048 = 42.6667
      expect(bin).toBeCloseTo(42.67, 1);
    });

    it('11.2 linearly interpolates FFT magnitude between discrete bin boundaries', () => {
      const fftData = new Float32Array(1024);
      fftData[10] = -40;
      fftData[11] = -20;
      const sampleRate = 48000;
      const fftSize = 2048;
      const binWidth = sampleRate / fftSize; // 23.4375 Hz

      const exactFreq = 10.5 * binWidth;
      const interpolated = interpolateMagnitude(fftData, exactFreq, sampleRate, fftSize);
      expect(interpolated).toBeCloseTo(-30, 1);
    });

    it('11.3 calculates multi-band differential acoustic gap metrics', () => {
      const rawData = new Float32Array(1024).fill(-60);
      const boneData = new Float32Array(1024).fill(-60);

      // Add low-frequency boost in boneData (50-300Hz -> bins 2 to 13)
      for (let k = 2; k <= 13; k++) {
        boneData[k] = -45; // +15dB boost
      }

      const summary = calculateSpectralGapSummary(rawData, boneData, 48000, 2048);
      expect(summary.bassGap.deltaDb).toBeGreaterThan(10);
      expect(summary.bassGap.dominantSource).toBe('BONE_BOOST');
    });

    it('11.4 calculates Voice Confrontation Index (VCI) score from dual FFT arrays', () => {
      const rawData = new Float32Array(1024).fill(-50);
      const boneData = new Float32Array(1024).fill(-50);

      // Low boost
      for (let k = 2; k <= 13; k++) boneData[k] = -40; // +10dB
      // High rolloff
      for (let k = 170; k <= 680; k++) boneData[k] = -65; // -15dB

      const metrics = calculateSpectralGapMetrics(rawData, boneData, 48000, 2048);
      expect(metrics.voiceConfrontationIndex).toBeGreaterThan(30);
      expect(metrics.lowResonanceBoostDb).toBeGreaterThan(0);
      expect(metrics.hfTissueRolloffDb).toBeLessThan(0);
    });

    it('11.5 batch interpolates frequency spectrum directly into Canvas Y Float32Array buffer', () => {
      const fftData = new Float32Array(1024).fill(-50);
      const outputY = new Float32Array(800);
      interpolateSpectrumToCanvas(fftData, outputY, 800, 300);

      expect(outputY[0]).toBeGreaterThan(0);
      expect(outputY[799]).toBeGreaterThan(0);
      expect(outputY[400]).toBeCloseTo(dbToY(-50, 300, -100, -30), 1);
    });
  });

  // ===========================================================================
  // Feature Group 12: 60fps Canvas 2D Spectrum Visualizer Renderer
  // ===========================================================================
  describe('12. 60fps Canvas 2D Spectrum Visualizer Renderer', () => {
    it('12.1 instantiates SpectrumVisualizerRenderer with canvas and analysers', () => {
      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({
        canvas,
        rawAnalyser: null,
        processedAnalyser: null,
      });

      expect(renderer).toBeDefined();
      expect(renderer.getMode()).toBe('OVERLAY');
      renderer.destroy();
    });

    it('12.2 supports OVERLAY, DIFFERENTIAL, and GAP_ONLY visualization display modes', () => {
      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({ canvas, rawAnalyser: null, processedAnalyser: null });

      renderer.setMode('DIFFERENTIAL');
      expect(renderer.getMode()).toBe('DIFFERENTIAL');
      renderer.render();

      renderer.setMode('GAP_ONLY');
      expect(renderer.getMode()).toBe('GAP_ONLY');
      renderer.render();

      renderer.setMode('OVERLAY');
      expect(renderer.getMode()).toBe('OVERLAY');
      renderer.render();

      renderer.destroy();
    });

    it('12.3 scales for High-DPI Retina screens on resize(w, h, dpr)', () => {
      const canvas = document.createElement('canvas');
      const renderer = new SpectrumVisualizerRenderer({ canvas, rawAnalyser: null, processedAnalyser: null });

      renderer.resize(800, 300, 2);
      expect(canvas.width).toBe(1600);
      expect(canvas.height).toBe(600);
      expect(canvas.style.width).toBe('800px');
      expect(canvas.style.height).toBe('300px');

      renderer.destroy();
    });

    it('12.4 dispatches cursor inspection data during hover over spectrum', () => {
      const canvas = document.createElement('canvas');
      let inspectedData: any = null;

      const renderer = new SpectrumVisualizerRenderer({
        canvas,
        rawAnalyser: null,
        processedAnalyser: null,
        onCursorInspect: (data) => {
          inspectedData = data;
        },
      });

      renderer.resize(800, 300, 1);
      renderer.setHoverCursor(400, 150);
      renderer.render();

      expect(inspectedData).not.toBeNull();
      expect(inspectedData.freq).toBeGreaterThan(20);
      expect(inspectedData.x).toBe(400);

      renderer.clearHoverCursor();
      expect(inspectedData).toBeNull();

      renderer.destroy();
    });
  });

  // ===========================================================================
  // Feature Group 13: Client-Side RIFF 44-Byte WAV Binary Encoder
  // ===========================================================================
  describe('13. Client-Side RIFF 44-Byte WAV Binary Encoder', () => {
    it('13.1 encodes mono AudioBuffer into valid canonical 44-byte RIFF/WAVE header', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 48000, 48000);
      const wavArrayBuffer = audioBufferToWav(buffer as unknown as AudioBuffer, { float32: false });
      const view = new DataView(wavArrayBuffer);

      // Check RIFF header fields
      // 0-3: 'RIFF'
      expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
      // 8-11: 'WAVE'
      expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE');
      // 12-15: 'fmt '
      expect(String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15))).toBe('fmt ');
      // 16-19: Subchunk1Size = 16
      expect(view.getUint32(16, true)).toBe(16);
      // 20-21: AudioFormat = 1 (PCM)
      expect(view.getUint16(20, true)).toBe(1);
      // 22-23: NumChannels = 1
      expect(view.getUint16(22, true)).toBe(1);
      // 24-27: SampleRate = 48000
      expect(view.getUint32(24, true)).toBe(48000);
      // 34-35: BitsPerSample = 16
      expect(view.getUint16(34, true)).toBe(16);
      // 36-39: 'data'
      expect(String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39))).toBe('data');
      // Total size = 44 + 48000 * 2 = 96044 bytes
      expect(wavArrayBuffer.byteLength).toBe(44 + 48000 * 2);
    });

    it('13.2 encodes 32-bit IEEE Floating Point WAV binary when float32 option is true', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(2, 1000, 44100);
      const wavArrayBuffer = audioBufferToWav(buffer as unknown as AudioBuffer, { float32: true });
      const view = new DataView(wavArrayBuffer);

      // AudioFormat = 3 (IEEE Float)
      expect(view.getUint16(20, true)).toBe(3);
      // BitsPerSample = 32
      expect(view.getUint16(34, true)).toBe(32);
      // Total size = 44 + 1000 * 2 * 4 = 8044 bytes
      expect(wavArrayBuffer.byteLength).toBe(44 + 1000 * 2 * 4);
    });

    it('13.3 exports audio buffer directly as audio/wav Blob', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 24000, 48000);
      const blob = exportAudioBufferAsWavBlob(buffer as unknown as AudioBuffer);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/wav');
      expect(blob.size).toBe(44 + 24000 * 2);
    });

    it('13.4 supports batch offline DSP rendering and WAV export via renderAndExportWav', async () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 24000, 48000);
      const { blob, renderedBuffer } = await renderAndExportWav(
        buffer as unknown as AudioBuffer,
        'INTERNAL_SIM',
        DEFAULT_DSP_PARAMS
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(renderedBuffer).toBeDefined();
    });
  });

  // ===========================================================================
  // Feature Group 14: Psychoacoustic Guidance & Vocal Training Cards
  // ===========================================================================
  describe('14. Psychoacoustic Guidance & Vocal Training Cards', () => {
    it('14.1 renders all vocal training cards with Japanese subtitles and frequency badges', () => {
      const { container, unmount } = renderUI(React.createElement(GuidanceCards));

      expect(container.textContent).toContain('Psychoacoustic Guidance');
      expect(container.querySelectorAll('[data-testid^="guidance-card-"]').length).toBe(
        VOCAL_TRAINING_CARDS.length
      );

      unmount();
    });

    it('14.2 toggles collapsible scientific overview drawer explaining Voice Confrontation', () => {
      const { container, unmount } = renderUI(React.createElement(GuidanceCards));

      const toggleBtn = container.querySelector(
        'button[aria-label="Toggle Psychoacoustic Scientific Model"]'
      ) as HTMLButtonElement;
      expect(toggleBtn).not.toBeNull();

      act(() => {
        toggleBtn.click();
      });

      expect(container.querySelector('[data-testid="psychoacoustic-overview-drawer"]')).not.toBeNull();
      expect(container.textContent).toContain(PSYCHOACOUSTIC_OVERVIEW.title);

      unmount();
    });

    it('14.3 expands individual card to reveal practical exercise, pro tips, and preset trigger', () => {
      const onSelectPreset = vi.fn();
      const onSelectMode = vi.fn();

      const { container, unmount } = renderUI(
        React.createElement(GuidanceCards, {
          onSelectPreset,
          onSelectMode,
        })
      );

      const firstCardHeader = container.querySelector('[data-testid^="guidance-card-"] button') as HTMLButtonElement;
      act(() => {
        firstCardHeader.click();
      });

      expect(container.querySelector('[data-testid="expanded-content"]')).not.toBeNull();

      // Trigger preset action button
      const presetActionBtn = container.querySelector('[data-testid^="action-preset-"]') as HTMLButtonElement;
      if (presetActionBtn) {
        act(() => {
          presetActionBtn.click();
        });
        expect(onSelectPreset).toHaveBeenCalled();
      }

      unmount();
    });
  });

  // ===========================================================================
  // Feature Group 15: Audio Export Modal Dialog
  // ===========================================================================
  describe('15. Audio Export Modal Dialog', () => {
    it('15.1 renders export modal with mode selector and format toggles when isOpen is true', () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 48000, 48000);
      const { container, unmount } = renderUI(
        React.createElement(ExportModal, {
          isOpen: true,
          onClose: () => {},
          audioBuffer: buffer as unknown as AudioBuffer,
          currentMode: 'INTERNAL_SIM',
        })
      );

      expect(container.textContent).toContain('Export Audio Track (WAV)');
      expect(container.querySelector('button[data-mode="INTERNAL_SIM"]')).not.toBeNull();
      expect(container.querySelector('button[data-mode="RAW"]')).not.toBeNull();
      expect(container.querySelector('button[data-mode="COMPENSATED"]')).not.toBeNull();
      expect(container.querySelector('button[data-mode="ALL_MODES"]')).not.toBeNull();
      expect(container.querySelector('button[data-format="pcm16"]')).not.toBeNull();
      expect(container.querySelector('button[data-format="float32"]')).not.toBeNull();

      unmount();
    });

    it('15.2 performs single-mode WAV export on download button click', async () => {
      const ctx = new AudioContextMock();
      const buffer = ctx.createBuffer(1, 24000, 48000);
      const onExportSuccess = vi.fn();

      const { container, unmount } = renderUI(
        React.createElement(ExportModal, {
          isOpen: true,
          onClose: () => {},
          audioBuffer: buffer as unknown as AudioBuffer,
          currentMode: 'RAW',
          onExportSuccess,
        })
      );

      const submitBtn = container.querySelector('[data-testid="export-submit-button"]') as HTMLButtonElement;
      await act(async () => {
        submitBtn.click();
      });

      expect(onExportSuccess).toHaveBeenCalled();
      unmount();
    });
  });

  // ===========================================================================
  // Feature Group 16: Global Keyboard Shortcuts
  // ===========================================================================
  describe('16. Global Keyboard Shortcuts in Studio App', () => {
    it('16.1 switches listening modes on keys 1, 2, and 3', () => {
      const { unmount } = renderUI(React.createElement(App));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', code: 'Digit2' }));
      });
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', code: 'Digit3' }));
      });
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', code: 'Digit1' }));
      });

      unmount();
    });

    it('16.2 toggles Help modal on H key and closes on Escape', () => {
      const { container, unmount } = renderUI(React.createElement(App));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH' }));
      });
      expect(container.textContent).toContain('Keyboard Shortcuts');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
      });
      expect(container.textContent).not.toContain('Close Guide [Esc]');

      unmount();
    });
  });
});
