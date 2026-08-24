/**
 * VocalMirror — Audio Studio Types & Interface Contracts
 */

import {
  DSPParameters,
  ListeningMode,
  PhysiologicalPresetKey,
  AudioSourceType,
} from './audio';
import { AcousticEngine } from '../audio/AcousticEngine';

export type DemoVoicePresetKey = 'male_baritone' | 'female_alto' | 'tenor_vowel_ah';

export interface AudioStudioState {
  // Mode & Parameters
  mode: ListeningMode;
  params: DSPParameters;
  parameters: DSPParameters; // alias for params
  currentPreset: PhysiologicalPresetKey | 'custom';
  activePreset: PhysiologicalPresetKey | 'custom'; // alias for currentPreset

  // Playback State
  isPlaying: boolean;
  isPaused: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;

  // Audio Buffer & Source
  audioBuffer: AudioBuffer | null;
  hasAudio: boolean;
  hasAudioBuffer: boolean; // alias for hasAudio
  sourceType: AudioSourceType;
  audioSource: AudioSourceType; // alias for sourceType
  audioSourceType: AudioSourceType; // alias for sourceType

  // Recording State
  isRecording: boolean;
  recordingDuration: number;

  // Audio Engine & Analysers
  audioContextState: AudioContextState;
  contextState: AudioContextState; // alias for audioContextState
  engine: AcousticEngine | null;
  rawAnalyser: AnalyserNode | null;
  processedAnalyser: AnalyserNode | null;

  // Status & Diagnostics
  isProcessing: boolean;
  error: string | null;
  volume: number; // Master trim dB (-6 to +6)
  latencyMs: number;
  sampleRate: number;
}

export interface AudioStudioActions {
  // Engine & Context
  ensureAudioContext: () => Promise<AudioContext | null>;
  unlockAudio: () => Promise<void>;
  resumeContext: () => Promise<void>;

  // Transport Controls
  play: (startTimeOffset?: number) => Promise<void>;
  pause: () => void;
  stop: () => void;
  togglePlay: () => Promise<void>;
  seek: (timeSeconds: number) => void;
  setLoop: (loop: boolean) => void;
  toggleLoop: () => void;

  // Recording
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;

  // Demo Fallback Audio
  loadDemoAudio: (presetKey?: DemoVoicePresetKey | string) => Promise<void>;

  // DSP & Preset Controls
  setMode: (mode: ListeningMode) => void;
  updateParameter: <K extends keyof DSPParameters>(key: K, value: number) => void;
  updateParam: <K extends keyof DSPParameters>(key: K, value: number) => void;
  updateParameters: (newParams: Partial<DSPParameters>) => void;
  loadPreset: (presetKey: PhysiologicalPresetKey) => void;
  applyPreset: (presetKey: PhysiologicalPresetKey) => void;
  setPreset: (presetKey: PhysiologicalPresetKey) => void;
  resetToDefault: () => void;
  resetParameters: () => void;
  resetAllParams: () => void;
  resetParam: (key: keyof DSPParameters) => void;
  setVolume: (dB: number) => void;

  // Buffer Management
  setAudioBuffer: (buffer: AudioBuffer | null, sourceType?: AudioSourceType) => void;
  clearAudio: () => void;
  clearError: () => void;
}

export type UseAudioStudioReturn = AudioStudioState & AudioStudioActions;
