/**
 * VocalMirror — Logarithmic Frequency & Spectral Mapping Unit Tests
 * 
 * Validates coordinate transformation, boundary conditions, strict monotonicity,
 * round-trip bijective mapping, continuous FFT bin interpolation, and gap metric calculations.
 */

import { describe, it, expect } from 'vitest';
import {
  frequencyToNormX,
  frequencyToX,
  normXToFrequency,
  xToFrequency,
  dbToY,
  yToDb,
  dbToCanvasY,
  canvasYToDb,
  getBinForFrequency,
  interpolateMagnitude,
  getInterpolatedMagnitude,
  formatFrequency,
  getFrequencyGridTicks,
  generateFrequencyGrid,
  calculateBandEnergy,
  calculateDifferentialBandGap,
  calculateSpectralGapSummary,
  calculateSpectralGapMetrics,
  interpolateSpectrumToCanvas,
  FREQ_CONSTANTS,
  FREQ_MAPPING_CONSTANTS,
  MAJOR_GRID_FREQUENCIES,
} from '../../../src/utils/frequencyMapping';

describe('Logarithmic Frequency Mapping & DSP Calculations', () => {
  const width = 1000;
  const height = 400;
  const fMin = 20;
  const fMax = 20000;

  describe('1. Logarithmic Frequency Mapping (frequencyToNormX & frequencyToX)', () => {
    it('maps lower and upper boundary frequencies exactly to 0 and width', () => {
      expect(frequencyToNormX(20, fMin, fMax)).toBeCloseTo(0.0, 5);
      expect(frequencyToNormX(20000, fMin, fMax)).toBeCloseTo(1.0, 5);
      expect(frequencyToX(20, width, fMin, fMax)).toBeCloseTo(0.0, 2);
      expect(frequencyToX(20000, width, fMin, fMax)).toBeCloseTo(1000.0, 2);
    });

    it('maps landmark frequencies accurately to theoretical log10 positions', () => {
      // 100Hz: log10(100/20) / log10(20000/20) = log10(5)/3 = 0.69897 / 3 = 0.23299
      expect(frequencyToNormX(100, fMin, fMax)).toBeCloseTo(0.23299, 4);
      expect(frequencyToX(100, width, fMin, fMax)).toBeCloseTo(232.99, 1);

      // 1000Hz: log10(1000/20)/3 = log10(50)/3 = 1.69897 / 3 = 0.56632
      expect(frequencyToNormX(1000, fMin, fMax)).toBeCloseTo(0.56632, 4);
      expect(frequencyToX(1000, width, fMin, fMax)).toBeCloseTo(566.32, 1);

      // 4000Hz: log10(4000/20)/3 = log10(200)/3 = 2.30103 / 3 = 0.76701
      expect(frequencyToNormX(4000, fMin, fMax)).toBeCloseTo(0.76701, 4);
      expect(frequencyToX(4000, width, fMin, fMax)).toBeCloseTo(767.01, 1);

      // 10000Hz: log10(10000/20)/3 = log10(500)/3 = 2.69897 / 3 = 0.89966
      expect(frequencyToNormX(10000, fMin, fMax)).toBeCloseTo(0.89966, 4);
      expect(frequencyToX(10000, width, fMin, fMax)).toBeCloseTo(899.66, 1);
    });

    it('is strictly monotonic across the entire 20Hz - 20kHz audible spectrum', () => {
      const frequencies = [20, 50, 100, 200, 440, 1000, 2500, 5000, 10000, 20000];
      for (let i = 0; i < frequencies.length - 1; i++) {
        const xA = frequencyToX(frequencies[i], width, fMin, fMax);
        const xB = frequencyToX(frequencies[i + 1], width, fMin, fMax);
        expect(xA).toBeLessThan(xB);
      }
    });

    it('clamps out-of-range, NaN, and invalid inputs gracefully without throwing', () => {
      expect(frequencyToNormX(0, fMin, fMax)).toBe(0.0);
      expect(frequencyToNormX(-50, fMin, fMax)).toBe(0.0);
      expect(frequencyToNormX(5, fMin, fMax)).toBe(0.0);
      expect(frequencyToNormX(30000, fMin, fMax)).toBe(1.0);
      expect(frequencyToNormX(NaN, fMin, fMax)).toBe(0.0);
      expect(frequencyToNormX(Infinity, fMin, fMax)).toBe(0.0);

      expect(frequencyToX(-100, width, fMin, fMax)).toBe(0.0);
      expect(frequencyToX(25000, width, fMin, fMax)).toBe(1000.0);
      expect(frequencyToX(1000, 0, fMin, fMax)).toBe(0.0);
      expect(frequencyToX(1000, -500, fMin, fMax)).toBe(0.0);
    });
  });

  describe('2. Bijective Inverse Mapping (normXToFrequency & xToFrequency)', () => {
    it('recovers frequencies with high numerical precision (round-trip bijective fidelity)', () => {
      const testFreqs = [20, 50, 100, 180, 250, 440, 1000, 2500, 4000, 8000, 16000, 20000];
      for (const freq of testFreqs) {
        const normX = frequencyToNormX(freq, fMin, fMax);
        const recoveredFreq = normXToFrequency(normX, fMin, fMax);
        expect(recoveredFreq).toBeCloseTo(freq, 4);

        const x = frequencyToX(freq, width, fMin, fMax);
        const xRecovered = xToFrequency(x, width, fMin, fMax);
        expect(xRecovered).toBeCloseTo(freq, 2);
      }
    });

    it('clamps out-of-range X coordinates and normalized inputs safely', () => {
      expect(normXToFrequency(-0.5, fMin, fMax)).toBeCloseTo(20, 4);
      expect(normXToFrequency(1.5, fMin, fMax)).toBeCloseTo(20000, 4);
      expect(normXToFrequency(NaN, fMin, fMax)).toBe(20);

      expect(xToFrequency(-100, width, fMin, fMax)).toBeCloseTo(20, 2);
      expect(xToFrequency(1500, width, fMin, fMax)).toBeCloseTo(20000, 2);
      expect(xToFrequency(NaN, width, fMin, fMax)).toBe(20);
      expect(xToFrequency(500, 0, fMin, fMax)).toBe(20);
    });
  });

  describe('3. Decibel to Canvas Y Mapping (dbToY & yToDb)', () => {
    const minDb = -100;
    const maxDb = -30;

    it('maps maxDb (-30dB) to Y = 0 and minDb (-100dB) to Y = height', () => {
      expect(dbToY(-30, height, minDb, maxDb)).toBeCloseTo(0, 2);
      expect(dbToY(-100, height, minDb, maxDb)).toBeCloseTo(400, 2);
      expect(dbToCanvasY(-30, height, minDb, maxDb)).toBeCloseTo(0, 2);
      expect(dbToCanvasY(-100, height, minDb, maxDb)).toBeCloseTo(400, 2);
    });

    it('maps midpoint decibels (-65dB) to height / 2', () => {
      expect(dbToY(-65, height, minDb, maxDb)).toBeCloseTo(200, 2);
    });

    it('clamps out-of-range dB values and recovers dB accurately with yToDb', () => {
      expect(dbToY(0, height, minDb, maxDb)).toBe(0);
      expect(dbToY(-150, height, minDb, maxDb)).toBe(400);
      expect(dbToY(NaN, height, minDb, maxDb)).toBe(400);

      const testDbs = [-30, -45, -60, -75, -90, -100];
      for (const db of testDbs) {
        const y = dbToY(db, height, minDb, maxDb);
        const recovered = yToDb(y, height, minDb, maxDb);
        expect(recovered).toBeCloseTo(db, 2);
        expect(canvasYToDb(y, height, minDb, maxDb)).toBeCloseTo(db, 2);
      }
    });

    it('handles zero or negative height gracefully in dB mapping', () => {
      expect(dbToY(-50, 0, minDb, maxDb)).toBe(0);
      expect(yToDb(50, 0, minDb, maxDb)).toBe(minDb);
    });
  });

  describe('4. FFT Bin Index & Continuous Magnitude Interpolation', () => {
    it('computes exact continuous bin indices for given sample rate and FFT size', () => {
      const sampleRate = 48000;
      const fftSize = 2048;
      // binWidth = 48000 / 2048 = 23.4375 Hz
      expect(getBinForFrequency(0, sampleRate, fftSize)).toBe(0);
      expect(getBinForFrequency(24000, sampleRate, fftSize)).toBe(1024);
      expect(getBinForFrequency(1000, sampleRate, fftSize)).toBeCloseTo(42.666, 2);
    });

    it('interpolates magnitude linearly between integer FFT bins', () => {
      const sampleRate = 48000;
      const fftSize = 2048;
      const freqData = new Float32Array(1024);
      freqData[10] = -40.0;
      freqData[11] = -30.0;

      // Frequency at bin 10.5: f = 10.5 * (48000/2048) = 246.09375 Hz
      const fMid = 10.5 * (sampleRate / fftSize);
      const valMid = interpolateMagnitude(freqData, fMid, sampleRate, fftSize);
      expect(valMid).toBeCloseTo(-35.0, 2);
      expect(getInterpolatedMagnitude(freqData, fMid, sampleRate, fftSize)).toBeCloseTo(-35.0, 2);
    });

    it('handles boundary and invalid frequencies in magnitude interpolation', () => {
      const freqData = new Float32Array([ -80, -70, -60, -50 ]);
      expect(interpolateMagnitude(freqData, 0, 48000, 8)).toBe(-80);
      expect(interpolateMagnitude(freqData, 100000, 48000, 8)).toBe(-50);
      expect(interpolateMagnitude(null, 1000)).toBe(FREQ_CONSTANTS.MIN_DB);
      expect(interpolateMagnitude(new Float32Array(0), 1000)).toBe(FREQ_CONSTANTS.MIN_DB);
    });
  });

  describe('5. Frequency Label & Grid Generation', () => {
    it('formats frequency with Hz and kHz units correctly', () => {
      expect(formatFrequency(50)).toBe('50 Hz');
      expect(formatFrequency(250)).toBe('250 Hz');
      expect(formatFrequency(1000)).toBe('1 kHz');
      expect(formatFrequency(2500)).toBe('2.5 kHz');
      expect(formatFrequency(4000)).toBe('4 kHz');
      expect(formatFrequency(16000)).toBe('16 kHz');

      // Short mode
      expect(formatFrequency(50, true)).toBe('50');
      expect(formatFrequency(1000, true)).toBe('1k');
      expect(formatFrequency(2500, true)).toBe('2.5k');
      expect(formatFrequency(NaN)).toBe('0 Hz');
    });

    it('generates standard frequency grid ticks with normalized monotonic coordinates', () => {
      const ticks = getFrequencyGridTicks();
      expect(ticks.length).toBe(9);
      expect(ticks.map((t) => t.label)).toEqual([
        '50Hz', '100Hz', '250Hz', '500Hz', '1k', '2k', '4k', '8k', '16k'
      ]);

      for (let i = 0; i < ticks.length - 1; i++) {
        expect(ticks[i].xNormalized).toBeLessThan(ticks[i + 1].xNormalized);
        expect(ticks[i].xNormalized).toBeGreaterThanOrEqual(0);
        expect(ticks[i].xNormalized).toBeLessThanOrEqual(1);
      }
    });

    it('generates frequency grid lines across canvas width with options', () => {
      const grid = generateFrequencyGrid(1000, 20, 20000);
      expect(grid.length).toBe(9);
      expect(grid[0].x).toBeCloseTo(frequencyToX(50, 1000), 1);
      expect(grid[0].isMajor).toBe(true);

      const extendedGrid = generateFrequencyGrid(1000, 20, 20000, { includeExtended: true });
      expect(extendedGrid.length).toBeGreaterThan(15);

      const emptyGrid = generateFrequencyGrid(0);
      expect(emptyGrid).toEqual([]);
    });
  });

  describe('6. Band Energy & Differential Gap Metrics', () => {
    it('calculates band energy and statistics correctly', () => {
      const sampleRate = 48000;
      const fftSize = 2048;
      const freqData = new Float32Array(1024).fill(-60);

      // Boost 100Hz bin
      const bin100 = Math.round(100 / (sampleRate / fftSize));
      freqData[bin100] = -40;

      const energy = calculateBandEnergy(freqData, [50, 300], sampleRate, fftSize);
      expect(energy.peakDb).toBe(-40);
      expect(energy.peakFreq).toBeCloseTo(93.75, 1);
      expect(energy.meanDb).toBeGreaterThan(-60);
    });

    it('calculates differential band gaps and identifies dominant source', () => {
      const sampleRate = 48000;
      const fftSize = 2048;
      const rawData = new Float32Array(1024).fill(-60);
      const boneData = new Float32Array(1024).fill(-60);

      // Low boost: bone > raw
      for (let i = 2; i <= 13; i++) {
        boneData[i] = -48;
      }

      const bassGap = calculateDifferentialBandGap(rawData, boneData, [50, 300], 'Bass', sampleRate, fftSize);
      expect(bassGap.deltaDb).toBeGreaterThan(5);
      expect(bassGap.dominantSource).toBe('BONE_BOOST');

      const balancedGap = calculateDifferentialBandGap(rawData, rawData, [50, 300], 'Bass', sampleRate, fftSize);
      expect(balancedGap.deltaDb).toBeCloseTo(0, 4);
      expect(balancedGap.dominantSource).toBe('BALANCED');
    });

    it('calculates multi-band spectral gap summary and voice detection', () => {
      const rawData = new Float32Array(1024).fill(-70);
      const boneData = new Float32Array(1024).fill(-70);

      // Add voice energy in 80-1000Hz
      for (let i = 3; i <= 42; i++) {
        rawData[i] = -45;
        boneData[i] = -38;
      }

      const summary = calculateSpectralGapSummary(rawData, boneData);
      expect(summary.activeVoiceDetected).toBe(true);
      expect(summary.bassGap.deltaDb).toBeGreaterThan(0);
      expect(summary.bassGap.bandName).toBe('Bone Bass Resonance');
    });

    it('calculates composite SpectralGapMetrics and Voice Confrontation Index (VCI)', () => {
      const rawData = new Float32Array(1024).fill(-50);
      const boneData = new Float32Array(1024).fill(-50);

      // Low boost: +8dB in 50-300Hz
      for (let i = 2; i <= 13; i++) {
        boneData[i] = -42;
      }
      // High tissue rolloff: -12dB in >4kHz
      for (let i = 170; i <= 680; i++) {
        boneData[i] = -62;
      }

      const metrics = calculateSpectralGapMetrics(rawData, boneData);
      expect(metrics.lowResonanceBoostDb).toBeGreaterThan(5.0);
      expect(metrics.hfTissueRolloffDb).toBeLessThan(-8.0);
      expect(metrics.voiceConfrontationIndex).toBeGreaterThan(40);
      expect(metrics.voiceConfrontationIndex).toBeLessThanOrEqual(100);
      expect(metrics.peakResonanceFreq).toBeGreaterThanOrEqual(50);
      expect(metrics.peakResonanceFreq).toBeLessThanOrEqual(300);
    });

    it('returns safe default metrics for null or silent audio inputs', () => {
      const metrics = calculateSpectralGapMetrics(null, null);
      expect(metrics.lowResonanceBoostDb).toBe(0);
      expect(metrics.hfTissueRolloffDb).toBe(0);
      expect(metrics.voiceConfrontationIndex).toBe(0);
      expect(metrics.rmsDifferential).toBe(0);
    });
  });

  describe('7. Batch Zero-Allocation Spectrum Interpolator (interpolateSpectrumToCanvas)', () => {
    it('populates pre-allocated Float32Array with valid Canvas Y pixel values', () => {
      const freqData = new Float32Array(1024).fill(-50);
      const outputY = new Float32Array(500);

      interpolateSpectrumToCanvas(
        freqData,
        outputY,
        500,
        300,
        48000,
        2048,
        20,
        20000,
        -100,
        -20
      );

      // At -50dB with range -100 to -20: norm = (-50 - (-100)) / 80 = 50/80 = 0.625
      // Y = 300 * (1 - 0.625) = 300 * 0.375 = 112.5
      for (let i = 0; i < 500; i++) {
        expect(outputY[i]).toBeCloseTo(112.5, 1);
      }
    });

    it('handles zero or invalid dimensions in batch interpolation without errors', () => {
      const freqData = new Float32Array(1024);
      const outputY = new Float32Array(100);
      expect(() => interpolateSpectrumToCanvas(freqData, outputY, 0, 300)).not.toThrow();
      expect(() => interpolateSpectrumToCanvas(freqData, outputY, 100, 0)).not.toThrow();
    });
  });

  describe('8. Adversarial & Extreme Boundary Hardening', () => {
    it('handles non-standard sample rates (44.1kHz, 96kHz) correctly across FFT functions', () => {
      const freqData = new Float32Array(512).fill(-45);
      // 44.1kHz with 1024 FFT -> binWidth = 44100 / 1024 = 43.0664 Hz
      const binIndex44k = getBinForFrequency(1000, 44100, 1024);
      expect(binIndex44k).toBeCloseTo(1000 / 43.0664, 2);

      const val = interpolateMagnitude(freqData, 1000, 44100, 1024);
      expect(val).toBeCloseTo(-45, 2);

      // 96kHz with 4096 FFT -> binWidth = 96000 / 4096 = 23.4375 Hz
      const binIndex96k = getBinForFrequency(1000, 96000, 4096);
      expect(binIndex96k).toBeCloseTo(1000 / 23.4375, 2);
    });

    it('clamps Voice Confrontation Index to maximum 100 under extreme differential gain (+30dB)', () => {
      const rawData = new Float32Array(1024).fill(-70);
      const boneData = new Float32Array(1024).fill(-70);

      // Massive +30dB low boost and -40dB high damping
      for (let i = 2; i <= 13; i++) {
        boneData[i] = -40; // +30dB
      }
      for (let i = 170; i <= 680; i++) {
        boneData[i] = -100; // -30dB
      }

      const metrics = calculateSpectralGapMetrics(rawData, boneData);
      expect(metrics.voiceConfrontationIndex).toBeLessThanOrEqual(100);
      expect(metrics.voiceConfrontationIndex).toBeGreaterThanOrEqual(90);
    });

    it('handles custom frequency lists in generateFrequencyGrid correctly', () => {
      const custom = [60, 120, 240, 480, 960, 1920];
      const grid = generateFrequencyGrid(800, 20, 20000, { customFrequencies: custom, shortLabels: true });
      expect(grid.length).toBe(6);
      expect(grid[0].frequency).toBe(60);
      expect(grid[0].label).toBe('60');
      expect(grid[5].frequency).toBe(1920);
      expect(grid[5].label).toBe('1.9k');
    });

    it('handles inverted frequency ranges in calculateBandEnergy safely', () => {
      const freqData = new Float32Array(1024).fill(-50);
      // Inverted range [300, 50]
      const energy = calculateBandEnergy(freqData, [300, 50], 48000, 2048);
      expect(energy.meanDb).toBeCloseTo(-50, 1);
    });
  });
});
