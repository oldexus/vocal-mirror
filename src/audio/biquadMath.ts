/**
 * VocalMirror — Robert Bristow-Johnson (RBJ) Audio EQ Cookbook Mathematical Engine
 * 
 * Provides analytical biquad filter coefficient generation and frequency response calculations
 * for transfer curve visualization and unit testing without active Web Audio playback.
 */

import {
  BiquadCoefficients,
  BiquadFilterType,
  DSPParameters,
  FrequencyResponse,
} from '../types/audio';
import { AUDIO_CONSTANTS } from './constants';

/**
 * Converts decibels (dB) to linear amplitude multiplier.
 */
export function dbToLinear(db: number): number {
  if (!Number.isFinite(db)) return 1.0;
  return Math.pow(10, db / 20);
}

/**
 * Converts linear amplitude multiplier to decibels (dB).
 */
export function linearToDb(linear: number, minDb = -120): number {
  if (!Number.isFinite(linear) || linear <= 0) return minDb;
  return 20 * Math.log10(Math.max(Math.pow(10, minDb / 20), Math.abs(linear)));
}

/**
 * Computes dynamic headroom pre-attenuation level based on active boost parameters.
 */
export function calculateDynamicPreAttenuation(params: DSPParameters): {
  preAttenDb: number;
  preGainLinear: number;
} {
  const boostSum =
    Math.max(0, params.lowShelfGain) +
    0.6 * Math.max(0, params.mandibleResGain) +
    0.4 * Math.max(0, params.sinusResGain);

  const preAttenDb = -Math.min(
    AUDIO_CONSTANTS.DYNAMIC_HEADROOM_MAX_ATTEN_DB,
    Math.max(
      AUDIO_CONSTANTS.DYNAMIC_HEADROOM_MIN_ATTEN_DB,
      boostSum * AUDIO_CONSTANTS.DYNAMIC_HEADROOM_SCALE_FACTOR
    )
  );

  return {
    preAttenDb,
    preGainLinear: dbToLinear(preAttenDb),
  };
}

/**
 * Computes standard Robert Bristow-Johnson (RBJ) biquad digital filter coefficients.
 * Reference: RBJ Audio EQ Cookbook
 */
export function computeBiquadCoefficients(
  type: BiquadFilterType,
  f0: number,
  fs: number,
  Q = 0.707,
  gainDb = 0
): BiquadCoefficients {
  const safeFs = Number.isFinite(fs) ? Math.max(1000, fs) : 48000;
  const safeF0 = Number.isFinite(f0) ? Math.max(1, Math.min(safeFs / 2 - 1, f0)) : 1000;
  const safeQ = Number.isFinite(Q) ? Math.max(0.0001, Q) : 0.707;
  const safeGainDb = Number.isFinite(gainDb) ? gainDb : 0;

  const w0 = (2 * Math.PI * safeF0) / safeFs;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const A = Math.pow(10, safeGainDb / 40); // sqrt(10^(gainDb/20))
  const alpha = sinW0 / (2 * safeQ);
  const beta = Math.sqrt(A) * sinW0; // for shelf slope S = 1

  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

  switch (type) {
    case 'lowpass':
      b0 = (1 - cosW0) / 2;
      b1 = 1 - cosW0;
      b2 = (1 - cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'highpass':
      b0 = (1 + cosW0) / 2;
      b1 = -(1 + cosW0);
      b2 = (1 + cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'peaking':
      b0 = 1 + alpha * A;
      b1 = -2 * cosW0;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cosW0;
      a2 = 1 - alpha / A;
      break;

    case 'lowshelf':
      b0 = A * ((A + 1) - (A - 1) * cosW0 + beta);
      b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
      b2 = A * ((A + 1) - (A - 1) * cosW0 - beta);
      a0 = (A + 1) + (A - 1) * cosW0 + beta;
      a1 = -2 * ((A - 1) + (A + 1) * cosW0);
      a2 = (A + 1) + (A - 1) * cosW0 - beta;
      break;

    case 'highshelf':
      b0 = A * ((A + 1) + (A - 1) * cosW0 + beta);
      b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
      b2 = A * ((A + 1) + (A - 1) * cosW0 - beta);
      a0 = (A + 1) - (A - 1) * cosW0 + beta;
      a1 = 2 * ((A - 1) - (A + 1) * cosW0);
      a2 = (A + 1) - (A - 1) * cosW0 - beta;
      break;

    case 'notch':
      b0 = 1;
      b1 = -2 * cosW0;
      b2 = 1;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'bandpass':
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'allpass':
      b0 = 1 - alpha;
      b1 = -2 * cosW0;
      b2 = 1 + alpha;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
  }

  return { b0, b1, b2, a0, a1, a2 };
}

/**
 * Calculates complex frequency and phase responses across an array of frequencies for a given biquad.
 */
export function calculateBiquadResponse(
  coeffs: BiquadCoefficients,
  frequencies: Float32Array,
  sampleRate: number
): { magResponse: Float32Array; phaseResponse: Float32Array } {
  const n = frequencies.length;
  const magResponse = new Float32Array(n);
  const phaseResponse = new Float32Array(n);
  const { b0, b1, b2, a0, a1, a2 } = coeffs;

  for (let k = 0; k < n; k++) {
    const f = frequencies[k];
    const theta = (2 * Math.PI * f) / sampleRate;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const cos2T = Math.cos(2 * theta);
    const sin2T = Math.sin(2 * theta);

    const numRe = b0 + b1 * cosT + b2 * cos2T;
    const numIm = -b1 * sinT - b2 * sin2T;
    const denRe = a0 + a1 * cosT + a2 * cos2T;
    const denIm = -a1 * sinT - a2 * sin2T;

    const numMag2 = numRe * numRe + numIm * numIm;
    const denMag2 = denRe * denRe + denIm * denIm;
    const mag = Math.sqrt(numMag2 / Math.max(1e-12, denMag2));

    magResponse[k] = mag;

    const numPhase = Math.atan2(numIm, numRe);
    const denPhase = Math.atan2(denIm, denRe);
    phaseResponse[k] = numPhase - denPhase;
  }

  return { magResponse, phaseResponse };
}

/**
 * Evaluates the cumulative linear and dB magnitude frequency response of a cascade of biquad filters.
 */
export function calculateCascadeResponse(
  filters: Array<{ type: BiquadFilterType; f0: number; Q: number; gainDb: number }>,
  frequencies: Float32Array,
  sampleRate: number
): FrequencyResponse {
  const n = frequencies.length;
  const totalMag = new Float32Array(n).fill(1.0);
  const dBMagnitudes = new Float32Array(n);

  for (const filter of filters) {
    const coeffs = computeBiquadCoefficients(
      filter.type,
      filter.f0,
      sampleRate,
      filter.Q,
      filter.gainDb
    );
    const { magResponse } = calculateBiquadResponse(coeffs, frequencies, sampleRate);
    for (let i = 0; i < n; i++) {
      totalMag[i] *= magResponse[i];
    }
  }

  for (let i = 0; i < n; i++) {
    dBMagnitudes[i] = linearToDb(totalMag[i]);
  }

  return {
    frequencies,
    magnitudes: totalMag,
    dBMagnitudes,
  };
}

/**
 * Generates theoretical frequency response for Forward (Bone Simulation) or Inverse (Compensation) branches.
 */
export function calculateTheoreticalBranchResponse(
  params: DSPParameters,
  branch: 'FORWARD' | 'INVERSE',
  frequencies: Float32Array,
  sampleRate = 48000
): FrequencyResponse {
  const filterSpecs: Array<{ type: BiquadFilterType; f0: number; Q: number; gainDb: number }> =
    branch === 'FORWARD'
      ? [
          { type: 'lowshelf', f0: params.lowShelfFreq, Q: 0.707, gainDb: params.lowShelfGain },
          { type: 'peaking', f0: params.mandibleResFreq, Q: params.mandibleResQ, gainDb: params.mandibleResGain },
          { type: 'peaking', f0: params.sinusResFreq, Q: params.sinusResQ, gainDb: params.sinusResGain },
          { type: 'peaking', f0: params.antiResFreq, Q: params.antiResQ, gainDb: params.antiResGain },
          { type: 'lowpass', f0: params.tissueCutoffFreq, Q: params.tissueCutoffQ, gainDb: 0 },
          { type: 'highshelf', f0: params.highShelfFreq, Q: 0.707, gainDb: params.highShelfGain },
        ]
      : [
          { type: 'highpass', f0: AUDIO_CONSTANTS.INVERSE_SUBSONIC_HIGHPASS_FREQ, Q: AUDIO_CONSTANTS.INVERSE_SUBSONIC_HIGHPASS_Q, gainDb: 0 },
          { type: 'lowshelf', f0: params.lowShelfFreq, Q: 0.707, gainDb: -params.lowShelfGain },
          { type: 'peaking', f0: params.mandibleResFreq, Q: params.mandibleResQ, gainDb: -params.mandibleResGain },
          { type: 'peaking', f0: params.sinusResFreq, Q: params.sinusResQ, gainDb: -params.sinusResGain },
          { type: 'peaking', f0: params.antiResFreq, Q: params.antiResQ, gainDb: -params.antiResGain },
          {
            type: 'highshelf',
            f0: AUDIO_CONSTANTS.INVERSE_HIGHSHELF_AIR_FREQ,
            Q: 0.707,
            gainDb: Math.min(AUDIO_CONSTANTS.INVERSE_MAX_AIR_BOOST_DB, -params.highShelfGain),
          },
        ];

  return calculateCascadeResponse(filterSpecs, frequencies, sampleRate);
}
