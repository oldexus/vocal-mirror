import { describe, it, expect, beforeEach } from 'vitest';
import {
  AudioContextMock,
  installWebAudioMocks,
} from '../../mocks/webAudioMock';
import {
  computeBiquadCoefficients,
  calculateBiquadResponse,
  calculateTheoreticalBranchResponse,
  calculateDynamicPreAttenuation,
  dbToLinear,
  linearToDb,
} from '../../../src/audio/biquadMath';
import { ACOUSTIC_PRESETS } from '../../../src/audio/constants';

describe('AcousticMath & Biquad Analytical Transfer Functions', () => {
  let ctx: AudioContextMock;
  const SAMPLE_RATE = 48000;

  // Standard test frequencies spanning the full audible acoustic spectrum
  const TEST_FREQUENCIES = new Float32Array([
    50,    // Sub-bass bone conduction onset
    150,   // Low-shelf chest resonance band
    780,   // Maxillary/sinus cranial cavity resonance
    1650,  // Nasopharyngeal antiresonance notch
    4000,  // Viscoelastic skull tissue cutoff
    8000,  // Upper air sibilance damping band
    16000, // Extreme high-frequency limit
  ]);

  beforeEach(() => {
    installWebAudioMocks(globalThis);
    ctx = new AudioContextMock({ sampleRate: SAMPLE_RATE });
  });

  describe('1. Decibel & Linear Conversions', () => {
    it('converts dB to linear amplitude accurately', () => {
      expect(dbToLinear(0)).toBeCloseTo(1.0, 5);
      expect(dbToLinear(6)).toBeCloseTo(1.99526, 3);
      expect(dbToLinear(-6)).toBeCloseTo(0.501187, 3);
      expect(dbToLinear(14)).toBeCloseTo(5.01187, 3);
      expect(dbToLinear(-20)).toBeCloseTo(0.1, 4);
    });

    it('converts linear amplitude to dB accurately', () => {
      expect(linearToDb(1.0)).toBeCloseTo(0.0, 4);
      expect(linearToDb(2.0)).toBeCloseTo(6.0206, 2);
      expect(linearToDb(0.5)).toBeCloseTo(-6.0206, 2);
      expect(linearToDb(0.001)).toBeCloseTo(-60.0, 1);
    });
  });

  describe('2. Dynamic Pre-Attenuation Calculation', () => {
    it('calculates expected pre-attenuation for standard adult preset', () => {
      const { preAttenDb, preGainLinear } = calculateDynamicPreAttenuation(
        ACOUSTIC_PRESETS.natural_standard.params
      );
      // boostSum = 8.0 + 0.6 * 4.5 + 0.4 * 3.0 = 8.0 + 2.7 + 1.2 = 11.9 dB
      // preAtten = -clamp(3.0, 12.0, 11.9 * 0.75) = -clamp(3.0, 12.0, 8.925) = -8.925 dB
      expect(preAttenDb).toBeLessThanOrEqual(-3.0);
      expect(preAttenDb).toBeGreaterThanOrEqual(-12.0);
      expect(preGainLinear).toBeLessThan(1.0);
      expect(preGainLinear).toBeGreaterThan(0.2);
    });

    it('clamps pre-attenuation within [-12dB, -3dB] on extreme boost settings', () => {
      const maxBoost = {
        ...ACOUSTIC_PRESETS.natural_standard.params,
        lowShelfGain: 14.0,
        mandibleResGain: 8.0,
        sinusResGain: 6.0,
      };
      const { preAttenDb } = calculateDynamicPreAttenuation(maxBoost);
      expect(preAttenDb).toBe(-12.0);

      const minBoost = {
        ...ACOUSTIC_PRESETS.natural_standard.params,
        lowShelfGain: 0.0,
        mandibleResGain: 0.0,
        sinusResGain: 0.0,
      };
      const { preAttenDb: minAtten } = calculateDynamicPreAttenuation(minBoost);
      expect(minAtten).toBe(-3.0);
    });
  });

  describe('3. Low-Shelf Biquad Filter Analytical Transfer Function', () => {
    it('accurately calculates low-frequency boost and high-frequency transparency (+8dB boost)', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowshelf';
      filter.frequency.value = 180;
      filter.gain.value = 8.0; // +8.0 dB boost

      const mag = new Float32Array(TEST_FREQUENCIES.length);
      const phase = new Float32Array(TEST_FREQUENCIES.length);
      filter.getFrequencyResponse(TEST_FREQUENCIES, mag, phase);

      // 50Hz: Approaching full +8dB boost (~2.512 linear)
      expect(mag[0]).toBeGreaterThanOrEqual(2.3);
      expect(mag[0]).toBeLessThanOrEqual(2.6);

      // 150Hz: Near center frequency (180Hz) transition (~+5dB to +6dB, ~1.7-2.1 linear)
      expect(mag[1]).toBeGreaterThanOrEqual(1.7);
      expect(mag[1]).toBeLessThanOrEqual(2.1);

      // 780Hz, 1650Hz, 4kHz, 8kHz, 16kHz: Unity gain (0dB -> 1.0 linear)
      for (let i = 2; i < TEST_FREQUENCIES.length; i++) {
        expect(mag[i]).toBeCloseTo(1.0, 1);
      }
    });

    it('accurately calculates low-frequency cut for inverse equalization (-8dB cut)', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowshelf';
      filter.frequency.value = 180;
      filter.gain.value = -8.0; // -8.0 dB cut

      const mag = new Float32Array(TEST_FREQUENCIES.length);
      filter.getFrequencyResponse(TEST_FREQUENCIES, mag);

      // 50Hz: -8dB cut (~0.398 linear)
      expect(mag[0]).toBeGreaterThanOrEqual(0.35);
      expect(mag[0]).toBeLessThanOrEqual(0.45);

      // 1650Hz, 4kHz, 8kHz, 16kHz: Unity gain (1.0 linear)
      for (let i = 3; i < TEST_FREQUENCIES.length; i++) {
        expect(mag[i]).toBeCloseTo(1.0, 1);
      }
    });

    it('returns exact unity gain across all frequencies when gain is 0dB', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowshelf';
      filter.frequency.value = 200;
      filter.gain.value = 0.0;

      const mag = new Float32Array(TEST_FREQUENCIES.length);
      filter.getFrequencyResponse(TEST_FREQUENCIES, mag);

      for (let i = 0; i < TEST_FREQUENCIES.length; i++) {
        expect(mag[i]).toBeCloseTo(1.0, 4);
      }
    });
  });

  describe('4. Peaking Resonances & Anti-Resonance Notches', () => {
    it('calculates Mandible Jawbone resonance peak (+4.5dB at 240Hz, Q=1.8)', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = 240;
      filter.Q.value = 1.8;
      filter.gain.value = 4.5;

      const freqs = new Float32Array([50, 240, 1000, 4000, 16000]);
      const mag = new Float32Array(freqs.length);
      filter.getFrequencyResponse(freqs, mag);

      // 240Hz: Peak at +4.5dB (~1.679 linear)
      expect(mag[1]).toBeCloseTo(1.679, 1);

      // Baseline outside Q bandwidth converges to 1.0 (0dB)
      expect(mag[0]).toBeCloseTo(1.0, 1);
      expect(mag[3]).toBeCloseTo(1.0, 1);
      expect(mag[4]).toBeCloseTo(1.0, 1);
    });

    it('calculates Sinus Cavity resonance peak (+3.0dB at 780Hz, Q=2.2)', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = 780;
      filter.Q.value = 2.2;
      filter.gain.value = 3.0;

      const mag = new Float32Array(TEST_FREQUENCIES.length);
      filter.getFrequencyResponse(TEST_FREQUENCIES, mag);

      // 780Hz (index 2): +3.0dB boost (~1.413 linear)
      expect(mag[2]).toBeCloseTo(1.413, 1);

      // 50Hz, 150Hz, 8kHz, 16kHz should remain unaffected
      expect(mag[0]).toBeCloseTo(1.0, 1);
      expect(mag[1]).toBeCloseTo(1.0, 1);
      expect(mag[5]).toBeCloseTo(1.0, 1);
      expect(mag[6]).toBeCloseTo(1.0, 1);
    });

    it('calculates Nasopharyngeal Anti-Resonance notch (-3.5dB at 1650Hz, Q=2.0)', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = 1650;
      filter.Q.value = 2.0;
      filter.gain.value = -3.5;

      const mag = new Float32Array(TEST_FREQUENCIES.length);
      filter.getFrequencyResponse(TEST_FREQUENCIES, mag);

      // 1650Hz (index 3): -3.5dB attenuation (~0.668 linear)
      expect(mag[3]).toBeCloseTo(0.668, 1);

      // Low and high ends remain transparent
      expect(mag[0]).toBeCloseTo(1.0, 1);
      expect(mag[6]).toBeCloseTo(1.0, 1);
    });
  });

  describe('5. Skull Tissue Viscoelastic Low-Pass Damping', () => {
    it('verifies 2nd-order Butterworth low-pass characteristics at 4000Hz (Q=0.7071)', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 4000;
      filter.Q.value = 0.7071;

      const mag = new Float32Array(TEST_FREQUENCIES.length);
      filter.getFrequencyResponse(TEST_FREQUENCIES, mag);

      // 50Hz, 150Hz, 780Hz, 1650Hz: Flat in passband (~0dB -> 1.0 linear)
      expect(mag[0]).toBeCloseTo(1.0, 2);
      expect(mag[1]).toBeCloseTo(1.0, 2);
      expect(mag[2]).toBeCloseTo(1.0, 1);
      expect(mag[3]).toBeCloseTo(1.0, 1);

      // 4000Hz: -3.01dB cutoff point (1/sqrt(2) ~ 0.7071 linear)
      expect(mag[4]).toBeCloseTo(0.7071, 1);

      // 8000Hz (1 octave above cutoff): -12.3dB (~0.242 linear)
      expect(mag[5]).toBeLessThanOrEqual(0.30);
      expect(mag[5]).toBeGreaterThanOrEqual(0.20);

      // 16000Hz (2 octaves above cutoff): Digital biquad bilinear transform steep rolloff
      expect(mag[6]).toBeLessThanOrEqual(0.08);
      expect(mag[6]).toBeGreaterThanOrEqual(0.01);
    });
  });

  describe('6. Infrasound Subsonic High-Pass Protection', () => {
    it('verifies high-pass rolloff at 45Hz for microphone rumble protection', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 45;
      filter.Q.value = 0.7071;

      const freqs = new Float32Array([10, 20, 45, 150, 1000, 8000]);
      const mag = new Float32Array(freqs.length);
      filter.getFrequencyResponse(freqs, mag);

      // 10Hz, 20Hz: Deep subsonic attenuation
      expect(mag[0]).toBeLessThan(0.1);
      expect(mag[1]).toBeLessThan(0.25);

      // 45Hz: -3.01dB cutoff (0.7071 linear)
      expect(mag[2]).toBeCloseTo(0.7071, 1);

      // 150Hz and above: Passband unity gain
      expect(mag[3]).toBeCloseTo(1.0, 1);
      expect(mag[4]).toBeCloseTo(1.0, 2);
      expect(mag[5]).toBeCloseTo(1.0, 2);
    });
  });

  describe('7. High-Shelf Damping & Presence Boost', () => {
    it('attenuates high-frequency sibilance (-6dB at 5500Hz)', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'highshelf';
      filter.frequency.value = 5500;
      filter.gain.value = -6.0;

      const mag = new Float32Array(TEST_FREQUENCIES.length);
      filter.getFrequencyResponse(TEST_FREQUENCIES, mag);

      // 50Hz ~ 1650Hz: Unaffected (~1.0 linear)
      expect(mag[0]).toBeCloseTo(1.0, 2);
      expect(mag[1]).toBeCloseTo(1.0, 2);
      expect(mag[2]).toBeCloseTo(1.0, 1);
      expect(mag[3]).toBeCloseTo(1.0, 1);

      // 8kHz, 16kHz: Attenuated to -6.0dB (~0.501 linear)
      expect(mag[5]).toBeCloseTo(0.501, 1);
      expect(mag[6]).toBeCloseTo(0.501, 1);
    });

    it('boosts high air clarity in inverse mode (+6dB at 3500Hz)', () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'highshelf';
      filter.frequency.value = 3500;
      filter.gain.value = 6.0;

      const mag = new Float32Array(TEST_FREQUENCIES.length);
      filter.getFrequencyResponse(TEST_FREQUENCIES, mag);

      // 50Hz, 150Hz, 780Hz: Unaffected (~1.0 linear)
      expect(mag[0]).toBeCloseTo(1.0, 2);
      expect(mag[1]).toBeCloseTo(1.0, 2);
      expect(mag[2]).toBeCloseTo(1.0, 1);

      // 8kHz, 16kHz: Boosted to ~+6.0dB (~1.995 - 2.10 linear)
      expect(mag[5]).toBeGreaterThanOrEqual(1.9);
      expect(mag[5]).toBeLessThanOrEqual(2.2);
      expect(mag[6]).toBeCloseTo(1.995, 1);
    });
  });

  describe('8. Cascade Evaluator & Theoretical Branch Calculations', () => {
    it('evaluates cumulative forward cascade response correctly', () => {
      const response = calculateTheoreticalBranchResponse(
        ACOUSTIC_PRESETS.natural_standard.params,
        'FORWARD',
        TEST_FREQUENCIES,
        SAMPLE_RATE
      );

      expect(response.magnitudes).toHaveLength(TEST_FREQUENCIES.length);
      expect(response.dBMagnitudes).toHaveLength(TEST_FREQUENCIES.length);

      // Low end (50-150Hz) must show net positive boost
      expect(response.dBMagnitudes[0]).toBeGreaterThan(6.0);
      expect(response.dBMagnitudes[1]).toBeGreaterThan(6.0);

      // High end (8kHz-16kHz) must show tissue + highshelf attenuation
      expect(response.dBMagnitudes[5]).toBeLessThan(-10.0);
      expect(response.dBMagnitudes[6]).toBeLessThan(-20.0);
    });

    it('evaluates cumulative inverse cascade response correctly', () => {
      const response = calculateTheoreticalBranchResponse(
        ACOUSTIC_PRESETS.natural_standard.params,
        'INVERSE',
        TEST_FREQUENCIES,
        SAMPLE_RATE
      );

      // Subsonic protection: 50Hz has -8dB cut
      expect(response.dBMagnitudes[0]).toBeLessThan(-6.0);

      // High presence boost at 8kHz
      expect(response.dBMagnitudes[5]).toBeGreaterThan(3.0);
    });
  });

  describe('9. Numerical Stability & Edge Cases', () => {
    it('remains stable and free of NaN/Inf near Nyquist frequency (fs/2 - 1)', () => {
      const nyquist = SAMPLE_RATE / 2;
      const nearNyquist = nyquist - 10;

      const filterTypes: Array<'lowpass' | 'highpass' | 'peaking' | 'lowshelf' | 'highshelf'> = [
        'lowpass',
        'highpass',
        'peaking',
        'lowshelf',
        'highshelf',
      ];

      for (const type of filterTypes) {
        const coeffs = computeBiquadCoefficients(type, nearNyquist, SAMPLE_RATE, 1.0, 6.0);
        expect(Number.isFinite(coeffs.b0)).toBe(true);
        expect(Number.isFinite(coeffs.b1)).toBe(true);
        expect(Number.isFinite(coeffs.b2)).toBe(true);
        expect(Number.isFinite(coeffs.a0)).toBe(true);
        expect(Number.isFinite(coeffs.a1)).toBe(true);
        expect(Number.isFinite(coeffs.a2)).toBe(true);
        expect(coeffs.a0).not.toBe(0);
      }
    });

    it('handles extreme Q values without division by zero', () => {
      const highQ = computeBiquadCoefficients('peaking', 1000, SAMPLE_RATE, 100.0, 6.0);
      expect(Number.isFinite(highQ.b0)).toBe(true);
      expect(Number.isFinite(highQ.a0)).toBe(true);

      const lowQ = computeBiquadCoefficients('peaking', 1000, SAMPLE_RATE, 0.05, 6.0);
      expect(Number.isFinite(lowQ.b0)).toBe(true);
      expect(Number.isFinite(lowQ.a0)).toBe(true);
    });

    it('handles calculateBiquadResponse with empty frequencies gracefully', () => {
      const coeffs = computeBiquadCoefficients('lowshelf', 200, SAMPLE_RATE, 0.707, 6.0);
      const empty = new Float32Array(0);
      const res = calculateBiquadResponse(coeffs, empty, SAMPLE_RATE);
      expect(res.magResponse).toHaveLength(0);
      expect(res.phaseResponse).toHaveLength(0);
    });
  });
});
