/**
 * VocalMirror — Logarithmic Frequency & Spectral Gap Mapping Utilities
 * 
 * Mathematical core for transforming acoustic frequencies (20Hz - 20kHz) to Canvas 2D
 * coordinates, interpolating discrete FFT bins, generating musical frequency grid lines,
 * and computing differential gap energy metrics between raw air and simulated bone signals.
 */

// ============================================================================
// 1. Constants & Default Configurations
// ============================================================================

export const FREQ_CONSTANTS = {
  MIN_FREQ: 20,       // 20 Hz (Human lower audible limit)
  MAX_FREQ: 20000,    // 20,000 Hz (Human upper audible limit)
  MIN_DB: -100,       // Noise floor / minimum dBFS
  MAX_DB: -30,        // Peak display dBFS ceiling
  DEFAULT_SAMPLE_RATE: 48000,
  DEFAULT_FFT_SIZE: 2048,
  GRID_FREQUENCIES: [50, 100, 250, 500, 1000, 2000, 4000, 8000, 16000] as const,
  LOW_BAND_MIN: 50,
  LOW_BAND_MAX: 300,
  HIGH_BAND_MIN: 4000,
  HIGH_BAND_MAX: 16000,
  NOISE_FLOOR_GATE_DB: -95,
} as const;

export const FREQ_MAPPING_CONSTANTS = {
  DEFAULT_MIN_FREQ: 20,
  DEFAULT_MAX_FREQ: 20000,
  DEFAULT_SAMPLE_RATE: 48000,
  DEFAULT_FFT_SIZE: 2048,
  DEFAULT_MIN_DB: -100,
  DEFAULT_MAX_DB: -30,
  NOISE_FLOOR_GATE_DB: -95,
  MIN_FREQ_HZ: 20,
  MAX_FREQ_HZ: 20000,
  MIN_DB: -100,
  MAX_DB: -30,
} as const;

export const MAJOR_GRID_FREQUENCIES: readonly number[] = [
  50, 100, 250, 500, 1000, 2000, 4000, 8000, 16000,
];

export const EXTENDED_GRID_FREQUENCIES: readonly number[] = [
  20, 30, 50, 70, 100, 150, 200, 250, 300, 500, 700,
  1000, 1500, 2000, 3000, 4000, 6000, 8000, 10000, 12000, 16000, 20000,
];

// ============================================================================
// 2. TypeScript Interfaces
// ============================================================================

export interface FrequencyGridTick {
  freq: number;
  label: string;
  xNormalized: number; // 0.0 to 1.0
}

export interface FrequencyGridLine {
  frequency: number;
  x: number;
  normX: number;
  label: string;
  isMajor: boolean;
}

export interface FrequencyGridOptions {
  includeExtended?: boolean;
  shortLabels?: boolean;
  customFrequencies?: number[];
}

export interface SpectralGapMetrics {
  /** Average or peak low-frequency bone conduction boost in 50-300Hz (dB) */
  lowResonanceBoostDb: number;
  /** High-frequency tissue attenuation in >4000Hz (dB, negative value) */
  hfTissueRolloffDb: number;
  /** Composite Voice Confrontation Index (0 - 100) */
  voiceConfrontationIndex: number;
  /** Frequency of maximum low-frequency boost (Hz) */
  peakResonanceFreq: number;
  /** Overall RMS spectral divergence (dB) */
  rmsDifferential: number;
}

export interface CursorInspectionData {
  freq: number;
  rawDb: number;
  boneDb: number;
  deltaDb: number;
  x: number;
  yRaw: number;
  yBone: number;
}

export interface BandGapMetric {
  bandName: string;
  freqRange: [number, number];
  rawMeanDb: number;
  processedMeanDb: number;
  deltaDb: number;
  rawRmsDb: number;
  processedRmsDb: number;
  deltaRmsDb: number;
  peakDeltaFreq: number;
  peakDeltaDb: number;
  dominantSource: 'BONE_BOOST' | 'AIR_DOMINANT' | 'BALANCED';
}

export interface SpectralGapSummary {
  bassGap: BandGapMetric;     // 50Hz - 300Hz (Cranial bone resonance)
  midGap: BandGapMetric;      // 300Hz - 4000Hz (Vocal tract & nasal cavity)
  trebleGap: BandGapMetric;   // 4000Hz - 20000Hz (Tissue absorption / air clarity)
  overallMeanGapDb: number;   // Global mean spectral difference
  overallRmsGapDb: number;    // Global RMS spectral difference
  activeVoiceDetected: boolean;
}

// ============================================================================
// 3. Logarithmic Coordinate Mapping Functions
// ============================================================================

/**
 * Maps a frequency (Hz) to a normalized [0.0, 1.0] coordinate using log10 scale.
 */
export function frequencyToNormX(
  freq: number,
  minFreq: number = FREQ_CONSTANTS.MIN_FREQ,
  maxFreq: number = FREQ_CONSTANTS.MAX_FREQ
): number {
  if (freq === undefined || freq === null || isNaN(freq) || !isFinite(freq) || freq <= 0) {
    return 0.0;
  }
  const safeMin = Math.max(1e-6, minFreq);
  const safeMax = Math.max(safeMin + 1e-6, maxFreq);

  if (freq <= safeMin) return 0.0;
  if (freq >= safeMax) return 1.0;

  const logMin = Math.log10(safeMin);
  const logMax = Math.log10(safeMax);
  const logFreq = Math.log10(freq);

  const norm = (logFreq - logMin) / (logMax - logMin);
  return Math.max(0.0, Math.min(1.0, norm));
}

/**
 * Maps a frequency (Hz) to a Canvas horizontal pixel X coordinate on a log10 scale.
 */
export function frequencyToX(
  freq: number,
  width: number,
  minFreq: number = FREQ_CONSTANTS.MIN_FREQ,
  maxFreq: number = FREQ_CONSTANTS.MAX_FREQ
): number {
  if (width <= 0 || isNaN(width) || !isFinite(width)) return 0.0;
  return frequencyToNormX(freq, minFreq, maxFreq) * width;
}

/**
 * Converts a normalized [0.0, 1.0] coordinate back to frequency (Hz) using log10 scale.
 */
export function normXToFrequency(
  normX: number,
  minFreq: number = FREQ_CONSTANTS.MIN_FREQ,
  maxFreq: number = FREQ_CONSTANTS.MAX_FREQ
): number {
  if (normX === undefined || normX === null || isNaN(normX) || !isFinite(normX)) {
    return minFreq;
  }
  const safeMin = Math.max(1e-6, minFreq);
  const safeMax = Math.max(safeMin + 1e-6, maxFreq);
  const clampedNorm = Math.max(0.0, Math.min(1.0, normX));

  const logMin = Math.log10(safeMin);
  const logMax = Math.log10(safeMax);
  const logFreq = logMin + clampedNorm * (logMax - logMin);

  return Math.pow(10, logFreq);
}

/**
 * Converts a Canvas horizontal pixel X coordinate back to frequency (Hz) on a log10 scale.
 */
export function xToFrequency(
  x: number,
  width: number,
  minFreq: number = FREQ_CONSTANTS.MIN_FREQ,
  maxFreq: number = FREQ_CONSTANTS.MAX_FREQ
): number {
  if (width <= 0 || isNaN(width) || !isFinite(width)) return minFreq;
  const normX = x / width;
  return normXToFrequency(normX, minFreq, maxFreq);
}

// ============================================================================
// 4. Decibel to Canvas Y Coordinate Mapping
// ============================================================================

/**
 * Maps a decibel magnitude (dBFS) to a Canvas vertical pixel Y coordinate.
 * maxDb corresponds to Y = 0 (top/loudest), minDb corresponds to Y = height (bottom/floor).
 */
export function dbToY(
  db: number,
  height: number,
  minDb: number = FREQ_CONSTANTS.MIN_DB,
  maxDb: number = FREQ_CONSTANTS.MAX_DB
): number {
  if (height <= 0 || isNaN(height) || !isFinite(height)) return 0.0;
  if (db === undefined || db === null || isNaN(db) || !isFinite(db)) return height;

  const safeMinDb = Math.min(minDb, maxDb - 1e-3);
  const safeMaxDb = Math.max(maxDb, minDb + 1e-3);
  const clampedDb = Math.max(safeMinDb, Math.min(safeMaxDb, db));

  const norm = (clampedDb - safeMinDb) / (safeMaxDb - safeMinDb);
  return height * (1.0 - norm);
}

/**
 * Alias for dbToY.
 */
export function dbToCanvasY(
  db: number,
  height: number,
  minDb: number = FREQ_CONSTANTS.MIN_DB,
  maxDb: number = FREQ_CONSTANTS.MAX_DB
): number {
  return dbToY(db, height, minDb, maxDb);
}

/**
 * Converts a Canvas vertical pixel Y coordinate back to decibel level (dBFS).
 */
export function yToDb(
  y: number,
  height: number,
  minDb: number = FREQ_CONSTANTS.MIN_DB,
  maxDb: number = FREQ_CONSTANTS.MAX_DB
): number {
  if (height <= 0 || isNaN(height) || !isFinite(height)) return minDb;
  if (y === undefined || y === null || isNaN(y) || !isFinite(y)) return minDb;

  const safeMinDb = Math.min(minDb, maxDb - 1e-3);
  const safeMaxDb = Math.max(maxDb, minDb + 1e-3);
  const normY = Math.max(0.0, Math.min(1.0, y / height));

  return safeMaxDb - normY * (safeMaxDb - safeMinDb);
}

/**
 * Alias for yToDb.
 */
export function canvasYToDb(
  y: number,
  height: number,
  minDb: number = FREQ_CONSTANTS.MIN_DB,
  maxDb: number = FREQ_CONSTANTS.MAX_DB
): number {
  return yToDb(y, height, minDb, maxDb);
}

// ============================================================================
// 5. FFT Bin to Continuous Frequency Linear Interpolation
// ============================================================================

/**
 * Computes the continuous float FFT bin index for a given frequency.
 */
export function getBinForFrequency(
  freq: number,
  sampleRate: number = FREQ_CONSTANTS.DEFAULT_SAMPLE_RATE,
  fftSize: number = FREQ_CONSTANTS.DEFAULT_FFT_SIZE
): number {
  if (sampleRate <= 0 || fftSize <= 0) return 0;
  const nyquist = sampleRate / 2;
  const clampedFreq = Math.max(0, Math.min(nyquist, freq));
  return (clampedFreq / sampleRate) * fftSize;
}

/**
 * Linearly interpolates FFT magnitude in dB domain at an arbitrary continuous frequency.
 */
export function interpolateMagnitude(
  freqData: Float32Array | number[] | null,
  freq: number,
  sampleRate: number = FREQ_CONSTANTS.DEFAULT_SAMPLE_RATE,
  fftSize: number = FREQ_CONSTANTS.DEFAULT_FFT_SIZE,
  defaultDb: number = FREQ_CONSTANTS.MIN_DB
): number {
  if (!freqData || freqData.length === 0) return defaultDb;
  if (!isFinite(freq) || isNaN(freq) || freq <= 0) {
    const val = freqData[0];
    return isFinite(val) ? val : defaultDb;
  }

  const binWidth = sampleRate / fftSize;
  const binFloat = freq / binWidth;

  if (binFloat <= 0) {
    const val = freqData[0];
    return isFinite(val) ? val : defaultDb;
  }
  if (binFloat >= freqData.length - 1) {
    const val = freqData[freqData.length - 1];
    return isFinite(val) ? val : defaultDb;
  }

  const bin0 = Math.floor(binFloat);
  const bin1 = Math.min(bin0 + 1, freqData.length - 1);
  const frac = binFloat - bin0;

  const val0 = freqData[bin0];
  const val1 = freqData[bin1];

  const safeV0 = isFinite(val0) ? val0 : defaultDb;
  const safeV1 = isFinite(val1) ? val1 : defaultDb;

  return safeV0 * (1.0 - frac) + safeV1 * frac;
}

/**
 * Alias for interpolateMagnitude.
 */
export function getInterpolatedMagnitude(
  data: Float32Array | number[] | null,
  freq: number,
  sampleRate: number = FREQ_CONSTANTS.DEFAULT_SAMPLE_RATE,
  fftSize: number = FREQ_CONSTANTS.DEFAULT_FFT_SIZE
): number {
  return interpolateMagnitude(data, freq, sampleRate, fftSize);
}

// ============================================================================
// 6. Frequency Grid & Label Formatting
// ============================================================================

/**
 * Formats frequency into a human-readable acoustic label (e.g., '100 Hz', '1 kHz', '4 kHz').
 */
export function formatFrequency(freq: number, short = false): string {
  if (freq === undefined || freq === null || isNaN(freq) || !isFinite(freq)) {
    return '0 Hz';
  }
  const rounded = Math.round(freq);

  if (rounded >= 1000) {
    const khz = freq / 1000;
    const formattedKhz = khz % 1 === 0 ? khz.toFixed(0) : khz.toFixed(1).replace(/\.0$/, '');
    return short ? `${formattedKhz}k` : `${formattedKhz} kHz`;
  }

  return short ? `${rounded}` : `${rounded} Hz`;
}

/**
 * Generates vertical grid lines and formatted string labels for major acoustic frequencies.
 */
export function getFrequencyGridTicks(
  fMin: number = FREQ_CONSTANTS.MIN_FREQ,
  fMax: number = FREQ_CONSTANTS.MAX_FREQ
): FrequencyGridTick[] {
  const logMin = Math.log10(fMin);
  const logMax = Math.log10(fMax);

  return FREQ_CONSTANTS.GRID_FREQUENCIES.map((freq) => {
    const xNorm = (Math.log10(freq) - logMin) / (logMax - logMin);
    const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}Hz`;
    return { freq, label, xNormalized: Math.max(0, Math.min(1, xNorm)) };
  });
}

/**
 * Generates an array of frequency grid line positions and formatted labels for Canvas rendering.
 */
export function generateFrequencyGrid(
  width: number,
  minFreq: number = FREQ_CONSTANTS.MIN_FREQ,
  maxFreq: number = FREQ_CONSTANTS.MAX_FREQ,
  options: FrequencyGridOptions = {}
): FrequencyGridLine[] {
  if (width <= 0) return [];

  const sourceFreqs = options.customFrequencies
    ? options.customFrequencies
    : options.includeExtended
    ? EXTENDED_GRID_FREQUENCIES
    : MAJOR_GRID_FREQUENCIES;

  const majorSet = new Set(MAJOR_GRID_FREQUENCIES);
  const gridLines: FrequencyGridLine[] = [];

  for (const freq of sourceFreqs) {
    if (freq < minFreq || freq > maxFreq) continue;

    const normX = frequencyToNormX(freq, minFreq, maxFreq);
    const x = normX * width;
    const isMajor = majorSet.has(freq);
    const label = formatFrequency(freq, options.shortLabels);

    gridLines.push({
      frequency: freq,
      x,
      normX,
      label,
      isMajor,
    });
  }

  return gridLines;
}

// ============================================================================
// 7. Differential Gap Energy Metrics Calculation
// ============================================================================

/**
 * Computes acoustic energy and statistics for a specified frequency band.
 */
export function calculateBandEnergy(
  data: Float32Array | number[] | null,
  freqRange: [number, number],
  sampleRate: number = FREQ_CONSTANTS.DEFAULT_SAMPLE_RATE,
  fftSize: number = FREQ_CONSTANTS.DEFAULT_FFT_SIZE
): {
  meanDb: number;
  rmsDb: number;
  peakFreq: number;
  peakDb: number;
  linearEnergy: number;
} {
  if (!data || data.length === 0) {
    return {
      meanDb: FREQ_CONSTANTS.MIN_DB,
      rmsDb: FREQ_CONSTANTS.MIN_DB,
      peakFreq: freqRange[0],
      peakDb: FREQ_CONSTANTS.MIN_DB,
      linearEnergy: 0,
    };
  }

  const [fStart, fEnd] = freqRange;
  const binWidth = sampleRate / fftSize;
  const kStart = Math.max(0, Math.ceil(fStart / binWidth));
  const kEnd = Math.min(data.length - 1, Math.floor(fEnd / binWidth));

  if (kStart > kEnd) {
    const val = interpolateMagnitude(data, (fStart + fEnd) / 2, sampleRate, fftSize);
    return {
      meanDb: val,
      rmsDb: val,
      peakFreq: (fStart + fEnd) / 2,
      peakDb: val,
      linearEnergy: Math.pow(10, val / 10),
    };
  }

  let dbSum = 0;
  let powerSum = 0;
  let peakDb = -Infinity;
  let peakBin = kStart;
  const count = kEnd - kStart + 1;

  for (let k = kStart; k <= kEnd; k++) {
    const val = isFinite(data[k]) ? data[k] : FREQ_CONSTANTS.MIN_DB;
    dbSum += val;
    const power = Math.pow(10, val / 10);
    powerSum += power;

    if (val > peakDb) {
      peakDb = val;
      peakBin = k;
    }
  }

  const meanDb = dbSum / count;
  const rmsDb = 10 * Math.log10(Math.max(1e-12, powerSum / count));
  const peakFreq = peakBin * binWidth;

  return {
    meanDb,
    rmsDb,
    peakFreq,
    peakDb,
    linearEnergy: powerSum,
  };
}

/**
 * Calculates differential acoustic gap metrics between raw and processed signals in a band.
 */
export function calculateDifferentialBandGap(
  rawFreqData: Float32Array | number[] | null,
  procFreqData: Float32Array | number[] | null,
  freqRange: [number, number],
  bandName: string,
  sampleRate: number = FREQ_CONSTANTS.DEFAULT_SAMPLE_RATE,
  fftSize: number = FREQ_CONSTANTS.DEFAULT_FFT_SIZE
): BandGapMetric {
  const rawStats = calculateBandEnergy(rawFreqData, freqRange, sampleRate, fftSize);
  const procStats = calculateBandEnergy(procFreqData, freqRange, sampleRate, fftSize);

  const deltaDb = procStats.meanDb - rawStats.meanDb;
  const deltaRmsDb = procStats.rmsDb - rawStats.rmsDb;

  const [fStart, fEnd] = freqRange;
  const binWidth = sampleRate / fftSize;
  const rawLen = rawFreqData ? rawFreqData.length : 0;
  const procLen = procFreqData ? procFreqData.length : 0;
  const kStart = Math.max(0, Math.ceil(fStart / binWidth));
  const kEnd = Math.min(Math.min(rawLen, procLen) - 1, Math.floor(fEnd / binWidth));

  let maxAbsDiff = -1;
  let peakDeltaDb = deltaDb;
  let peakDeltaFreq = (fStart + fEnd) / 2;

  if (rawFreqData && procFreqData && kStart <= kEnd) {
    for (let k = kStart; k <= kEnd; k++) {
      const r = isFinite(rawFreqData[k]) ? rawFreqData[k] : FREQ_CONSTANTS.MIN_DB;
      const p = isFinite(procFreqData[k]) ? procFreqData[k] : FREQ_CONSTANTS.MIN_DB;
      const diff = p - r;
      if (Math.abs(diff) > maxAbsDiff) {
        maxAbsDiff = Math.abs(diff);
        peakDeltaDb = diff;
        peakDeltaFreq = k * binWidth;
      }
    }
  }

  let dominantSource: 'BONE_BOOST' | 'AIR_DOMINANT' | 'BALANCED' = 'BALANCED';
  if (deltaDb > 1.5) {
    dominantSource = 'BONE_BOOST';
  } else if (deltaDb < -1.5) {
    dominantSource = 'AIR_DOMINANT';
  }

  return {
    bandName,
    freqRange,
    rawMeanDb: rawStats.meanDb,
    processedMeanDb: procStats.meanDb,
    deltaDb,
    rawRmsDb: rawStats.rmsDb,
    processedRmsDb: procStats.rmsDb,
    deltaRmsDb,
    peakDeltaFreq,
    peakDeltaDb,
    dominantSource,
  };
}

/**
 * Calculates complete multi-band spectral gap summary for VocalMirror visualizer cards and badges.
 */
export function calculateSpectralGapSummary(
  rawFreqData: Float32Array | number[] | null,
  procFreqData: Float32Array | number[] | null,
  sampleRate: number = FREQ_CONSTANTS.DEFAULT_SAMPLE_RATE,
  fftSize: number = FREQ_CONSTANTS.DEFAULT_FFT_SIZE,
  noiseFloorGateDb: number = FREQ_CONSTANTS.NOISE_FLOOR_GATE_DB
): SpectralGapSummary {
  const bassGap = calculateDifferentialBandGap(
    rawFreqData,
    procFreqData,
    [50, 300],
    'Bone Bass Resonance',
    sampleRate,
    fftSize
  );

  const midGap = calculateDifferentialBandGap(
    rawFreqData,
    procFreqData,
    [300, 4000],
    'Vocal Tract & Cavities',
    sampleRate,
    fftSize
  );

  const trebleGap = calculateDifferentialBandGap(
    rawFreqData,
    procFreqData,
    [4000, 20000],
    'Tissue Damping & Air Clarity',
    sampleRate,
    fftSize
  );

  const globalGap = calculateDifferentialBandGap(
    rawFreqData,
    procFreqData,
    [50, 10000],
    'Global Vocal Spectrum',
    sampleRate,
    fftSize
  );

  const voiceBandStats = calculateBandEnergy(rawFreqData, [80, 1000], sampleRate, fftSize);
  const activeVoiceDetected = voiceBandStats.rmsDb > noiseFloorGateDb;

  return {
    bassGap,
    midGap,
    trebleGap,
    overallMeanGapDb: globalGap.deltaDb,
    overallRmsGapDb: globalGap.deltaRmsDb,
    activeVoiceDetected,
  };
}

/**
 * Computes live spectral gap metrics quantifying cranial resonance, tissue absorption, and VCI score.
 */
export function calculateSpectralGapMetrics(
  rawFreqData: Float32Array | null,
  boneFreqData: Float32Array | null,
  sampleRate: number = FREQ_CONSTANTS.DEFAULT_SAMPLE_RATE,
  fftSize: number = FREQ_CONSTANTS.DEFAULT_FFT_SIZE
): SpectralGapMetrics {
  const defaultMetrics: SpectralGapMetrics = {
    lowResonanceBoostDb: 0,
    hfTissueRolloffDb: 0,
    voiceConfrontationIndex: 0,
    peakResonanceFreq: 180,
    rmsDifferential: 0,
  };

  if (!rawFreqData || !boneFreqData || rawFreqData.length === 0 || boneFreqData.length === 0) {
    return defaultMetrics;
  }

  let lowDeltaSum = 0;
  let lowCount = 0;
  let maxLowDelta = -999;
  let peakFreq = 180;

  let highDeltaSum = 0;
  let highCount = 0;
  let sumSqDiff = 0;
  let totalCount = 0;

  const stepHz = 10;
  for (let f = FREQ_CONSTANTS.MIN_FREQ; f <= FREQ_CONSTANTS.MAX_FREQ; f += stepHz) {
    const rawVal = interpolateMagnitude(rawFreqData, f, sampleRate, fftSize);
    const boneVal = interpolateMagnitude(boneFreqData, f, sampleRate, fftSize);

    // Only compute metrics if signal is above baseline silence (-95dB)
    if (rawVal > -95 || boneVal > -95) {
      const delta = boneVal - rawVal;
      sumSqDiff += delta * delta;
      totalCount++;

      // Low band: 50 - 300Hz (Cranial bone boost)
      if (f >= FREQ_CONSTANTS.LOW_BAND_MIN && f <= FREQ_CONSTANTS.LOW_BAND_MAX) {
        lowDeltaSum += delta;
        lowCount++;
        if (delta > maxLowDelta) {
          maxLowDelta = delta;
          peakFreq = f;
        }
      }

      // High band: 4000 - 16000Hz (Tissue damping / air radiation)
      if (f >= FREQ_CONSTANTS.HIGH_BAND_MIN && f <= FREQ_CONSTANTS.HIGH_BAND_MAX) {
        highDeltaSum += delta;
        highCount++;
      }
    }
  }

  if (totalCount === 0) {
    return defaultMetrics;
  }

  const avgLowBoost = lowCount > 0 ? lowDeltaSum / lowCount : 0;
  const avgHighDelta = highCount > 0 ? highDeltaSum / highCount : 0;
  const rms = Math.sqrt(sumSqDiff / totalCount);

  // Voice Confrontation Index formula: weighted combination of low boost + high rolloff
  const lowScore = Math.max(0, avgLowBoost) * 4.5;
  const highScore = Math.max(0, -avgHighDelta) * 3.5;
  const vci = Math.min(100, Math.max(0, Math.round(lowScore + highScore)));

  return {
    lowResonanceBoostDb: Number(avgLowBoost.toFixed(1)),
    hfTissueRolloffDb: Number(avgHighDelta.toFixed(1)),
    voiceConfrontationIndex: vci,
    peakResonanceFreq: peakFreq,
    rmsDifferential: Number(rms.toFixed(1)),
  };
}

// ============================================================================
// 8. Zero-Allocation Batch Spectrum Interpolator for 60fps Canvas Loop
// ============================================================================

/**
 * Batch transforms frequency data array into Canvas Y pixel coordinates across all width columns.
 * Zero-allocation: writes directly into pre-allocated Float32Array output buffer.
 */
export function interpolateSpectrumToCanvas(
  freqData: Float32Array,
  outputY: Float32Array,
  width: number,
  height: number,
  sampleRate: number = FREQ_CONSTANTS.DEFAULT_SAMPLE_RATE,
  fftSize: number = FREQ_CONSTANTS.DEFAULT_FFT_SIZE,
  minFreq: number = FREQ_CONSTANTS.MIN_FREQ,
  maxFreq: number = FREQ_CONSTANTS.MAX_FREQ,
  minDb: number = FREQ_CONSTANTS.MIN_DB,
  maxDb: number = FREQ_CONSTANTS.MAX_DB
): void {
  const pixelCount = Math.min(outputY.length, Math.floor(width));
  if (pixelCount <= 0 || height <= 0) return;

  const logMin = Math.log10(Math.max(1e-6, minFreq));
  const logMax = Math.log10(Math.max(logMin + 1e-6, maxFreq));
  const logRange = logMax - logMin;
  const dbRange = Math.max(1e-3, maxDb - minDb);
  const binWidth = sampleRate / fftSize;
  const maxBinIdx = freqData.length - 1;

  for (let x = 0; x < pixelCount; x++) {
    const normX = x / (width - 1 || 1);
    const logFreq = logMin + normX * logRange;
    const freq = Math.pow(10, logFreq);

    const kFloat = freq / binWidth;
    let dbValue: number;

    if (kFloat <= 0) {
      dbValue = freqData[0];
    } else if (kFloat >= maxBinIdx) {
      dbValue = freqData[maxBinIdx];
    } else {
      const k0 = Math.floor(kFloat);
      const k1 = k0 + 1;
      const t = kFloat - k0;
      dbValue = (1.0 - t) * freqData[k0] + t * freqData[k1];
    }

    // Clamp dB and calculate Y
    const clampedDb = Math.max(minDb, Math.min(maxDb, dbValue));
    const normDb = (clampedDb - minDb) / dbRange;
    outputY[x] = height * (1.0 - normDb);
  }
}
