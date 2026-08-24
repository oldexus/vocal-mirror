import { describe, it, expect, beforeEach } from 'vitest';
import { AcousticEngine } from '../../../src/audio/AcousticEngine';
import { ACOUSTIC_PRESETS } from '../../../src/audio/constants';
import { DSPParameters } from '../../../src/types/audio';
import {
  OfflineAudioContextMock,
  installWebAudioMocks,
} from '../../mocks/webAudioMock';

describe('AcousticEngine Headroom Staging & Anti-Clipping Integrity', () => {
  const SAMPLE_RATE = 48000;
  const DURATION_SEC = 0.2; // 200ms per test frame
  const FRAME_LENGTH = Math.floor(SAMPLE_RATE * DURATION_SEC);

  beforeEach(() => {
    installWebAudioMocks(globalThis);
  });

  /**
   * Helper to create a synthetic sine buffer
   */
  function createSineBuffer(
    ctx: OfflineAudioContextMock,
    freqHz: number,
    amplitude = 1.0
  ) {
    const buffer = ctx.createBuffer(1, FRAME_LENGTH, SAMPLE_RATE);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < FRAME_LENGTH; i++) {
      data[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / SAMPLE_RATE);
    }
    return buffer;
  }

  function createImpulseTrainBuffer(
    ctx: OfflineAudioContextMock,
    f0Hz = 120,
    amplitude = 1.0
  ) {
    const buffer = ctx.createBuffer(1, FRAME_LENGTH, SAMPLE_RATE);
    const data = buffer.getChannelData(0);
    const periodSamples = Math.floor(SAMPLE_RATE / f0Hz);
    for (let i = 0; i < FRAME_LENGTH; i++) {
      data[i] = i % periodSamples === 0 ? amplitude : 0.0;
    }
    return buffer;
  }

  function createHarmonicChordBuffer(
    ctx: OfflineAudioContextMock,
    f0Hz = 130
  ) {
    const buffer = ctx.createBuffer(1, FRAME_LENGTH, SAMPLE_RATE);
    const data = buffer.getChannelData(0);
    const harmonics = [1, 2, 3, 4, 5, 6];
    for (let i = 0; i < FRAME_LENGTH; i++) {
      let sum = 0;
      for (const h of harmonics) {
        sum += (1 / h) * Math.sin((2 * Math.PI * f0Hz * h * i) / SAMPLE_RATE);
      }
      data[i] = sum;
    }

    // Normalize to exact 1.0 (0dBFS) peak
    let max = 0;
    for (let i = 0; i < FRAME_LENGTH; i++) {
      if (Math.abs(data[i]) > max) max = Math.abs(data[i]);
    }
    if (max > 0) {
      for (let i = 0; i < FRAME_LENGTH; i++) {
        data[i] /= max;
      }
    }
    return buffer;
  }

  async function renderAndMeasurePeak(
    engineParams: DSPParameters,
    mode: 'RAW' | 'INTERNAL_SIM' | 'COMPENSATED',
    inputBuffer: any
  ): Promise<{ maxPeak: number; rms: number }> {
    const offlineCtx = new OfflineAudioContextMock(1, FRAME_LENGTH, SAMPLE_RATE) as unknown as OfflineAudioContext;
    const engine = new AcousticEngine(offlineCtx);
    engine.applyParameters(engineParams, true);
    engine.setMode(mode, true);

    const src = (offlineCtx as any).createBufferSource();
    src.buffer = inputBuffer;
    src.connect(engine.getInput() as any);
    (engine.getOutput() as any).connect((offlineCtx as any).destination);
    src.start(0);

    const rendered = await (offlineCtx as any).startRendering();
    const outData = rendered.getChannelData(0);

    let maxPeak = 0;
    let sumSq = 0;
    for (let i = 0; i < outData.length; i++) {
      const abs = Math.abs(outData[i]);
      if (abs > maxPeak) maxPeak = abs;
      sumSq += abs * abs;
    }
    const rms = Math.sqrt(sumSq / outData.length);

    return { maxPeak, rms };
  }

  describe('1. 0dBFS Full-Scale Sine Waves at Critical Resonances', () => {
    const testFrequencies = [50, 150, 240, 780, 1650, 4000, 8000];

    it.each(testFrequencies)(
      'maintains max peak <= 1.0 (0dBFS) for %i Hz 0dBFS sine in INTERNAL_SIM mode (Standard Preset)',
      async (freqHz) => {
        const dummyCtx = new OfflineAudioContextMock(1, FRAME_LENGTH, SAMPLE_RATE);
        const sineBuffer = createSineBuffer(dummyCtx, freqHz, 1.0);

        const { maxPeak } = await renderAndMeasurePeak(
          ACOUSTIC_PRESETS.natural_standard.params,
          'INTERNAL_SIM',
          sineBuffer
        );

        expect(maxPeak).toBeLessThanOrEqual(1.0);
        expect(maxPeak).toBeGreaterThan(0.01); // Signal is passing through
      }
    );

    it.each(testFrequencies)(
      'maintains max peak <= 1.0 (0dBFS) for %i Hz 0dBFS sine in COMPENSATED mode',
      async (freqHz) => {
        const dummyCtx = new OfflineAudioContextMock(1, FRAME_LENGTH, SAMPLE_RATE);
        const sineBuffer = createSineBuffer(dummyCtx, freqHz, 1.0);

        const { maxPeak } = await renderAndMeasurePeak(
          ACOUSTIC_PRESETS.natural_standard.params,
          'COMPENSATED',
          sineBuffer
        );

        expect(maxPeak).toBeLessThanOrEqual(1.0);
      }
    );
  });

  describe('2. Extreme High-Boost Presets Stress Test', () => {
    it('prevents clipping under intense_confrontation preset (+13dB shelf, +7dB mandible, +5dB sinus)', async () => {
      const dummyCtx = new OfflineAudioContextMock(1, FRAME_LENGTH, SAMPLE_RATE);
      const sineBuffer = createSineBuffer(dummyCtx, 160, 1.0);

      const { maxPeak } = await renderAndMeasurePeak(
        ACOUSTIC_PRESETS.intense_confrontation.params,
        'INTERNAL_SIM',
        sineBuffer
      );

      expect(maxPeak).toBeLessThanOrEqual(1.0);
    });

    it('prevents clipping when all boost parameters are maxed out (+14dB shelf, +8dB mandible, +6dB sinus, +6dB master)', async () => {
      const maxBoostParams: DSPParameters = {
        lowShelfFreq: 180,
        lowShelfGain: 14.0,     // Max +14dB
        mandibleResFreq: 240,
        mandibleResGain: 8.0,   // Max +8dB
        mandibleResQ: 2.0,
        sinusResFreq: 780,
        sinusResGain: 6.0,      // Max +6dB
        sinusResQ: 2.5,
        antiResFreq: 1650,
        antiResGain: 0.0,
        antiResQ: 1.0,
        tissueCutoffFreq: 6000,
        tissueCutoffQ: 0.707,
        highShelfFreq: 8000,
        highShelfGain: 0.0,
        masterGain: 6.0,        // Max +6dB
      };

      const dummyCtx = new OfflineAudioContextMock(1, FRAME_LENGTH, SAMPLE_RATE);
      const chordBuffer = createHarmonicChordBuffer(dummyCtx, 150);

      const { maxPeak } = await renderAndMeasurePeak(
        maxBoostParams,
        'INTERNAL_SIM',
        chordBuffer
      );

      expect(maxPeak).toBeLessThanOrEqual(1.0);
    });
  });

  describe('3. Glottal Impulse Trains & Complex Vocal Harmonics', () => {
    it('clamps glottal pulse train (120Hz F0) without overshoot or numerical instability', async () => {
      const dummyCtx = new OfflineAudioContextMock(1, FRAME_LENGTH, SAMPLE_RATE);
      const impulseBuffer = createImpulseTrainBuffer(dummyCtx, 120, 1.0);

      const { maxPeak } = await renderAndMeasurePeak(
        ACOUSTIC_PRESETS.deep_chest_male.params,
        'INTERNAL_SIM',
        impulseBuffer
      );

      expect(maxPeak).toBeLessThanOrEqual(1.0);
    });

    it('handles rich 6-harmonic vocal chord across all 4 presets without clipping', async () => {
      const presets = [
        ACOUSTIC_PRESETS.natural_standard,
        ACOUSTIC_PRESETS.deep_chest_male,
        ACOUSTIC_PRESETS.bright_cranial_female,
        ACOUSTIC_PRESETS.intense_confrontation,
      ];

      const dummyCtx = new OfflineAudioContextMock(1, FRAME_LENGTH, SAMPLE_RATE);
      const chordBuffer = createHarmonicChordBuffer(dummyCtx, 130);

      for (const preset of presets) {
        const { maxPeak } = await renderAndMeasurePeak(
          preset.params,
          'INTERNAL_SIM',
          chordBuffer
        );
        expect(maxPeak).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('4. Bypass (RAW) Mode Bit-Fidelity', () => {
    it('passes signal through RAW mode with unity gain and without alteration', async () => {
      const dummyCtx = new OfflineAudioContextMock(1, FRAME_LENGTH, SAMPLE_RATE);
      const sineBuffer = createSineBuffer(dummyCtx, 440, 0.5);

      const { maxPeak } = await renderAndMeasurePeak(
        ACOUSTIC_PRESETS.natural_standard.params,
        'RAW',
        sineBuffer
      );

      // In RAW mode, 0.5 sine should emerge as 0.5 (+/- compressor threshold)
      expect(maxPeak).toBeCloseTo(0.5, 2);
    });
  });
});
