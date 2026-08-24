/**
 * VocalMirror — Audio Types & Interface Contracts
 * 
 * Defines core data models for the Web Audio DSP Engine, physiological presets,
 * listening modes, filter parameters, and frequency analysis.
 */

export type ListeningMode = 'RAW' | 'INTERNAL_SIM' | 'COMPENSATED';

export type FilterBranchType = 'FORWARD' | 'INVERSE';

export type BiquadFilterType =
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'lowshelf'
  | 'highshelf'
  | 'peaking'
  | 'notch'
  | 'allpass';

/**
 * 16-parameter physiological DSP parameter configuration.
 * All units are standard SI (Hz, dB, Q-factor ratio).
 */
export interface DSPParameters {
  /** Low-shelf center frequency (Hz, range: 80 - 300) - Chest & larynx resonance */
  lowShelfFreq: number;
  /** Low-shelf gain boost (dB, range: 0 - 14) */
  lowShelfGain: number;

  /** Mandibular jawbone vibration resonance frequency (Hz, range: 150 - 400) */
  mandibleResFreq: number;
  /** Mandibular resonance gain boost (dB, range: 0 - 8) */
  mandibleResGain: number;
  /** Mandibular resonance filter quality factor (range: 0.5 - 4.0) */
  mandibleResQ: number;

  /** Maxillary/frontal sinus cavity resonance frequency (Hz, range: 500 - 1200) */
  sinusResFreq: number;
  /** Sinus cavity resonance gain boost (dB, range: 0 - 6) */
  sinusResGain: number;
  /** Sinus cavity resonance filter quality factor (range: 0.5 - 5.0) */
  sinusResQ: number;

  /** Nasopharyngeal acoustic antiresonance / notch frequency (Hz, range: 1200 - 2500) */
  antiResFreq: number;
  /** Antiresonance notch depth (dB, range: -8 - 0) */
  antiResGain: number;
  /** Antiresonance filter quality factor (range: 0.5 - 4.0) */
  antiResQ: number;

  /** Viscoelastic cranial tissue low-pass cutoff frequency (Hz, range: 2000 - 6000) */
  tissueCutoffFreq: number;
  /** Viscoelastic tissue low-pass quality factor (range: 0.5 - 1.5, default 0.707 Butterworth) */
  tissueCutoffQ: number;

  /** High-frequency air damping shelf frequency (Hz, range: 4000 - 8000) */
  highShelfFreq: number;
  /** High-frequency sibilance damping gain (dB, range: -14 - 0) */
  highShelfGain: number;

  /** Master volume trim (dB, range: -6 - +6) */
  masterGain: number;
}

export type ParameterGroup = 'chest_bone' | 'cavity_resonance' | 'tissue_damping' | 'master';

export interface ParameterLimit {
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
  label: string;
  description: string;
  group: ParameterGroup;
}

export type ParameterLimits = Record<keyof DSPParameters, ParameterLimit>;

export type PhysiologicalPresetKey =
  | 'natural_standard'
  | 'deep_chest_male'
  | 'bright_cranial_female'
  | 'intense_confrontation';

export interface PhysiologicalPreset {
  id: PhysiologicalPresetKey;
  name: string;
  tag: string;
  description: string;
  params: DSPParameters;
}

export interface CompressorConfig {
  threshold: number; // dBFS (-100 to 0)
  knee: number;      // dB (0 to 40)
  ratio: number;     // 1 to 20
  attack: number;    // seconds (0.001 to 1.0)
  release: number;   // seconds (0.01 to 1.0)
}

export interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a0: number;
  a1: number;
  a2: number;
}

export interface FrequencyResponse {
  frequencies: Float32Array;
  magnitudes: Float32Array;
  dBMagnitudes: Float32Array;
  phases?: Float32Array;
}

export interface AudioEngineState {
  mode: ListeningMode;
  isRunning: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  currentPreset: PhysiologicalPresetKey | 'custom';
  params: DSPParameters;
  sampleRate: number;
}

export type AudioSourceType = 'MIC' | 'SAMPLE' | 'BUFFER' | 'NONE';
