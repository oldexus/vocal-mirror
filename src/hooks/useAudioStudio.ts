/**
 * VocalMirror — useAudioStudio Hook
 * 
 * Orchestrates the Web Audio DSP Engine (`AcousticEngine`), live microphone
 * recording (MediaRecorder API), synthetic demo audio fallback (`sampleAudio.ts`),
 * zero-pop A/B/C mode crossfading, real-time parameter smoothing, and transport playback.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { AcousticEngine } from '../audio/AcousticEngine';
import {
  DEFAULT_DSP_PARAMS,
  ACOUSTIC_PRESETS,
  PARAMETER_LIMITS,
} from '../audio/constants';
import {
  createSyntheticVocalBuffer,
  SAMPLE_AUDIO_PRESETS,
} from '../audio/sampleAudio';
import {
  DSPParameters,
  ListeningMode,
  PhysiologicalPresetKey,
  AudioSourceType,
} from '../types/audio';
import {
  DemoVoicePresetKey,
  UseAudioStudioReturn,
} from '../types/studio';

export interface UseAudioStudioOptions {
  initialMode?: ListeningMode;
  initialPreset?: PhysiologicalPresetKey;
  initialParams?: Partial<DSPParameters>;
  initialLoop?: boolean;
  autoLoadDemo?: boolean;
}

export function useAudioStudio(options: UseAudioStudioOptions = {}): UseAudioStudioReturn {
  const {
    initialMode = 'RAW',
    initialPreset = 'natural_standard',
    initialParams = {},
    initialLoop = false,
    autoLoadDemo = false,
  } = options;

  // ---------------------------------------------------------------------------
  // 1. React State
  // ---------------------------------------------------------------------------
  const [mode, setModeState] = useState<ListeningMode>(initialMode);
  const [params, setParamsState] = useState<DSPParameters>(() => ({
    ...DEFAULT_DSP_PARAMS,
    ...(ACOUSTIC_PRESETS[initialPreset]?.params || {}),
    ...initialParams,
  }));
  const [currentPreset, setCurrentPreset] = useState<PhysiologicalPresetKey | 'custom'>(initialPreset);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLooping, setIsLooping] = useState(initialLoop);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [audioBuffer, setAudioBufferState] = useState<AudioBuffer | null>(null);
  const [sourceType, setSourceType] = useState<AudioSourceType>('NONE');

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [audioContextState, setAudioContextState] = useState<AudioContextState>('suspended');
  const [rawAnalyser, setRawAnalyser] = useState<AnalyserNode | null>(null);
  const [processedAnalyser, setProcessedAnalyser] = useState<AnalyserNode | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.0);

  // ---------------------------------------------------------------------------
  // 2. Mutable Engine & Transport References
  // ---------------------------------------------------------------------------
  const isMountedRef = useRef<boolean>(true);
  const engineRef = useRef<AcousticEngine | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingOpIdRef = useRef<number>(0);
  const playbackOpIdRef = useRef<number>(0);

  const playbackStartTimeRef = useRef<number>(0);
  const playbackWallStartTimeRef = useRef<number>(0);
  const pausedAtTimeRef = useRef<number>(0);
  const progressTimerRef = useRef<any>(null);

  const isPlayingRef = useRef<boolean>(false);
  const isLoopingRef = useRef<boolean>(initialLoop);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Sync mutable refs with state
  isPlayingRef.current = isPlaying;
  isLoopingRef.current = isLooping;
  audioBufferRef.current = audioBuffer;

  // Initialize engine instance immediately on creation
  if (!engineRef.current) {
    const engine = new AcousticEngine();
    engine.applyParameters(params, true);
    engine.setMode(mode, true);
    engineRef.current = engine;
  }

  // Sync analyser nodes if needed on initial mount
  useEffect(() => {
    isMountedRef.current = true;
    if (engineRef.current) {
      setRawAnalyser(engineRef.current.getRawAnalyser());
      setProcessedAnalyser(engineRef.current.getProcessedAnalyser());
      const ctx = engineRef.current.getContext();
      setAudioContextState(ctx.state);
      if ('onstatechange' in ctx) {
        ctx.onstatechange = () => {
          if (isMountedRef.current) {
            setAudioContextState(ctx.state);
          }
        };
      }
    }

    return () => {
      isMountedRef.current = false;
      if (engineRef.current) {
        try {
          const ctx = engineRef.current.getContext();
          if ('onstatechange' in ctx) {
            ctx.onstatechange = null;
          }
        } catch {}
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 3. AudioEngine Singleton & Context Lifecycle
  // ---------------------------------------------------------------------------
  const getOrCreateEngine = useCallback(async (): Promise<AcousticEngine> => {
    if (!engineRef.current) {
      const engine = new AcousticEngine();
      engine.applyParameters(params, true);
      engine.setMode(mode, true);
      engineRef.current = engine;
      setRawAnalyser(engine.getRawAnalyser());
      setProcessedAnalyser(engine.getProcessedAnalyser());
      const ctx = engine.getContext();
      if ('onstatechange' in ctx) {
        ctx.onstatechange = () => {
          if (isMountedRef.current) {
            setAudioContextState(ctx.state);
          }
        };
      }
    }

    const engine = engineRef.current;
    setAudioContextState(engine.getContext().state);
    return engine;
  }, [mode, params]);

  const resumeContext = useCallback(async () => {
    try {
      const engine = await getOrCreateEngine();
      await engine.resume();
      setAudioContextState(engine.getContext().state);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to resume AudioContext');
    }
  }, [getOrCreateEngine]);

  const unlockAudio = useCallback(async () => {
    await resumeContext();
  }, [resumeContext]);

  const ensureAudioContext = useCallback(async (): Promise<AudioContext | null> => {
    try {
      const engine = await getOrCreateEngine();
      return engine.getContext() as AudioContext;
    } catch {
      return null;
    }
  }, [getOrCreateEngine]);

  // ---------------------------------------------------------------------------
  // 4. Playback Transport Machinery
  // ---------------------------------------------------------------------------
  const stopSourceNode = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // Ignore errors from already stopped nodes
      }
      sourceNodeRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    playbackOpIdRef.current++;
    stopSourceNode();
    pausedAtTimeRef.current = 0;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
  }, [stopSourceNode]);

  const pause = useCallback(() => {
    playbackOpIdRef.current++;
    if (!isPlayingRef.current) return;

    const elapsed = (Date.now() - playbackWallStartTimeRef.current) / 1000;
    const bufDuration = audioBufferRef.current?.duration || 0;

    let pausePos = 0;
    if (bufDuration > 0) {
      pausePos = isLoopingRef.current ? elapsed % bufDuration : Math.min(elapsed, bufDuration);
    }

    stopSourceNode();
    pausedAtTimeRef.current = pausePos;
    setIsPlaying(false);
    setIsPaused(true);
    setCurrentTime(pausePos);
  }, [stopSourceNode]);

  const startPlayback = useCallback(
    async (startTimeOffset?: number) => {
      const opId = ++playbackOpIdRef.current;
      try {
        const buffer = audioBufferRef.current;
        if (!buffer) {
          return;
        }

        const engine = await getOrCreateEngine();
        if (playbackOpIdRef.current !== opId) return;

        await engine.resume();
        if (playbackOpIdRef.current !== opId) return;

        setAudioContextState(engine.getContext().state);

        stopSourceNode();
        if (playbackOpIdRef.current !== opId) return;

        const offset = Math.max(
          0,
          Math.min(buffer.duration, startTimeOffset !== undefined ? startTimeOffset : pausedAtTimeRef.current)
        );

        const source = engine.getContext().createBufferSource();
        source.buffer = buffer;
        source.loop = isLoopingRef.current;
        source.connect(engine.getInput());

        source.start(0, offset);

        sourceNodeRef.current = source;
        playbackStartTimeRef.current = engine.getContext().currentTime - offset;
        playbackWallStartTimeRef.current = Date.now() - offset * 1000;
        pausedAtTimeRef.current = offset;

        setIsPlaying(true);
        setIsPaused(false);
        setError(null);

        source.onended = () => {
          if (!isLoopingRef.current && isPlayingRef.current) {
            stop();
          }
        };

        // Periodic progress ticker for UI timeline
        progressTimerRef.current = setInterval(() => {
          if (!isPlayingRef.current || !audioBufferRef.current) return;

          const totalDur = audioBufferRef.current.duration;
          let elapsed = (Date.now() - playbackWallStartTimeRef.current) / 1000;

          if (totalDur > 0) {
            if (isLoopingRef.current) {
              elapsed = elapsed % totalDur;
            } else if (elapsed > totalDur) {
              elapsed = totalDur;
            }
          }
          setCurrentTime(elapsed);
        }, 50);
      } catch (err: any) {
        if (playbackOpIdRef.current !== opId) return;
        console.error('Audio playback failed');
        setError(err?.message || 'Playback error');
        stop();
      }
    },
    [getOrCreateEngine, stopSourceNode, stop]
  );

  const play = useCallback(
    async (startTimeOffset?: number) => {
      await startPlayback(startTimeOffset);
    },
    [startPlayback]
  );

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback(
    (timeSeconds: number) => {
      const targetDuration = audioBufferRef.current?.duration || 0;
      const clampedTime = Math.max(0, Math.min(targetDuration, timeSeconds));

      if (isPlayingRef.current) {
        startPlayback(clampedTime);
      } else {
        pausedAtTimeRef.current = clampedTime;
        setCurrentTime(clampedTime);
      }
    },
    [startPlayback]
  );

  const setLoop = useCallback((loop: boolean) => {
    setIsLooping(loop);
    isLoopingRef.current = loop;
    if (sourceNodeRef.current) {
      sourceNodeRef.current.loop = loop;
    }
  }, []);

  const toggleLoop = useCallback(() => {
    setLoop(!isLooping);
  }, [isLooping, setLoop]);

  // ---------------------------------------------------------------------------
  // 5. MediaRecorder Microphone Capture
  // ---------------------------------------------------------------------------
  const cancelRecording = useCallback(() => {
    recordingOpIdRef.current++;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    recordedChunksRef.current = [];
    setIsRecording(false);
    setIsProcessing(false);
    setRecordingDuration(0);
  }, []);

  const startRecording = useCallback(async () => {
    const opId = ++recordingOpIdRef.current;
    try {
      stop();
      setError(null);
      setIsProcessing(true);

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access failed: MediaDevices API not available');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
          },
        });
      } catch (e: any) {
        if (recordingOpIdRef.current !== opId) return;
        if (e?.name === 'NotAllowedError' || /permission/i.test(e?.message)) {
          throw e;
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      if (recordingOpIdRef.current !== opId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const engine = await getOrCreateEngine();
      if (recordingOpIdRef.current !== opId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      await engine.resume();
      if (recordingOpIdRef.current !== opId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setAudioContextState(engine.getContext().state);

      // Attach track.onended listener to every audio track
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          cancelRecording();
          setError('Microphone disconnected or permission revoked');
        };
      });

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      if (recordingOpIdRef.current !== opId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];

      let selectedMimeType = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/wav'];
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            break;
          }
        }
      }

      const recorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (_e) => {
        cancelRecording();
        setError('Recording failed due to media hardware error');
      };

      recorder.onstart = () => {
        setIsRecording(true);
        setIsProcessing(false);
        setRecordingDuration(0);
        recordingStartTimeRef.current = Date.now();

        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration((Date.now() - recordingStartTimeRef.current) / 1000);
        }, 100);
      };

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      if (recordingOpIdRef.current !== opId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      recorder.start(100);
      mediaRecorderRef.current = recorder;
    } catch (err: any) {
      if (recordingOpIdRef.current !== opId) return;
      console.error('Failed to start microphone recording');
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      const isPermission = err?.name === 'NotAllowedError' || /permission/i.test(err?.message);
      setError(isPermission ? 'Microphone permission denied' : err?.message || 'Microphone access failed');
      setIsRecording(false);
      setIsProcessing(false);
    }
  }, [stop, getOrCreateEngine, cancelRecording]);

  const stopRecording = useCallback(async () => {
    const opId = ++recordingOpIdRef.current;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    setIsProcessing(true);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        try {
          if (recordingOpIdRef.current !== opId) {
            resolve();
            return;
          }

          const blob = new Blob(recordedChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });

          // Stop all microphone tracks to release hardware
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }

          const arrayBuffer = await blob.arrayBuffer();
          if (recordingOpIdRef.current !== opId) {
            resolve();
            return;
          }

          const engine = await getOrCreateEngine();
          if (recordingOpIdRef.current !== opId) {
            resolve();
            return;
          }

          const decoded = await engine.getContext().decodeAudioData(arrayBuffer);
          if (recordingOpIdRef.current !== opId) {
            resolve();
            return;
          }

          audioBufferRef.current = decoded;
          setAudioBufferState(decoded);
          setDuration(decoded.duration);
          setCurrentTime(0);
          setSourceType('MIC');
          setIsRecording(false);
          setIsProcessing(false);
          resolve();
        } catch (err: any) {
          if (recordingOpIdRef.current !== opId) {
            resolve();
            return;
          }
          console.error('Decoding recorded audio failed');
          setError('Failed to decode recorded audio. Try loading demo audio instead.');
          setIsRecording(false);
          setIsProcessing(false);
          resolve();
        }
      };

      recorder.stop();
    });
  }, [getOrCreateEngine]);

  // ---------------------------------------------------------------------------
  // 6. Synthetic Demo Audio Fallback
  // ---------------------------------------------------------------------------
  const loadDemoAudio = useCallback(
    async (presetKey: DemoVoicePresetKey | string = 'male_baritone') => {
      const opId = ++recordingOpIdRef.current;
      playbackOpIdRef.current++;
      try {
        stop();
        setIsProcessing(true);
        setError(null);

        const engine = await getOrCreateEngine();
        if (recordingOpIdRef.current !== opId) return;

        const preset =
          SAMPLE_AUDIO_PRESETS[presetKey as DemoVoicePresetKey] || SAMPLE_AUDIO_PRESETS.male_baritone;
        const buffer = createSyntheticVocalBuffer(engine.getContext(), preset.options);
        if (recordingOpIdRef.current !== opId) return;

        audioBufferRef.current = buffer;
        setAudioBufferState(buffer);
        setDuration(buffer.duration);
        setCurrentTime(0);
        setSourceType('SAMPLE');
        setIsProcessing(false);
      } catch (err: any) {
        if (recordingOpIdRef.current !== opId) return;
        console.error('Failed to generate synthetic demo buffer');
        setError(err?.message || 'Failed to load demo voice');
        setIsProcessing(false);
      }
    },
    [stop, getOrCreateEngine]
  );

  // ---------------------------------------------------------------------------
  // 7. Listening Mode & DSP Parameter Controls (Zero-Pop & Anti-Zipper)
  // ---------------------------------------------------------------------------
  const setMode = useCallback((newMode: ListeningMode) => {
    setModeState(newMode);
    if (engineRef.current) {
      engineRef.current.setMode(newMode, false); // 25ms equal-power linear crossfade
    }
  }, []);

  const updateParameter = useCallback(<K extends keyof DSPParameters>(key: K, value: number) => {
    if (
      (key as any) === '__proto__' ||
      (key as any) === 'constructor' ||
      (key as any) === 'prototype' ||
      !Object.prototype.hasOwnProperty.call(PARAMETER_LIMITS, key)
    ) {
      return;
    }

    const limit = PARAMETER_LIMITS[key];
    if (!limit) return;

    const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : limit.default;
    const clampedVal = Math.max(limit.min, Math.min(limit.max, safeValue));

    setParamsState((prev) => {
      const updated = { ...prev, [key]: clampedVal };
      if (engineRef.current) {
        engineRef.current.applyParameters(updated, false); // 15ms exponential smoothing
      }
      return updated;
    });
    setCurrentPreset('custom');
  }, []);

  const updateParam = updateParameter;

  const updateParameters = useCallback((newParams: Partial<DSPParameters>) => {
    if (!newParams || typeof newParams !== 'object') return;

    setParamsState((prev) => {
      const updated = { ...prev };
      for (const [k, v] of Object.entries(newParams)) {
        if (
          k === '__proto__' ||
          k === 'constructor' ||
          k === 'prototype' ||
          !Object.prototype.hasOwnProperty.call(PARAMETER_LIMITS, k)
        ) {
          continue;
        }

        const key = k as keyof DSPParameters;
        const limit = PARAMETER_LIMITS[key];
        if (limit && v !== undefined) {
          const safeVal = typeof v === 'number' && Number.isFinite(v) ? v : limit.default;
          updated[key] = Math.max(limit.min, Math.min(limit.max, safeVal));
        }
      }
      if (engineRef.current) {
        engineRef.current.applyParameters(updated, false);
      }
      return updated;
    });
    setCurrentPreset('custom');
  }, []);

  const applyPreset = useCallback((presetKey: PhysiologicalPresetKey) => {
    const preset = ACOUSTIC_PRESETS[presetKey];
    if (!preset || typeof preset !== 'object' || !preset.params) return;

    setParamsState(preset.params);
    setCurrentPreset(presetKey);
    if (engineRef.current) {
      engineRef.current.applyParameters(preset.params, false);
    }
  }, []);

  const loadPreset = applyPreset;
  const setPreset = applyPreset;

  const resetToDefault = useCallback(() => {
    setParamsState(DEFAULT_DSP_PARAMS);
    setCurrentPreset('natural_standard');
    if (engineRef.current) {
      engineRef.current.applyParameters(DEFAULT_DSP_PARAMS, false);
    }
  }, []);

  const resetParameters = resetToDefault;
  const resetAllParams = resetToDefault;

  const resetParam = useCallback((key: keyof DSPParameters) => {
    updateParameter(key, DEFAULT_DSP_PARAMS[key]);
  }, [updateParameter]);

  const setVolume = useCallback(
    (dB: number) => {
      setVolumeState(dB);
      updateParameter('masterGain', dB);
    },
    [updateParameter]
  );

  const setAudioBuffer = useCallback(
    (buffer: AudioBuffer | null, type: AudioSourceType = 'BUFFER') => {
      playbackOpIdRef.current++;
      recordingOpIdRef.current++;
      stop();
      audioBufferRef.current = buffer;
      setAudioBufferState(buffer);
      setDuration(buffer?.duration || 0);
      setCurrentTime(0);
      setSourceType(buffer ? type : 'NONE');
    },
    [stop]
  );

  const clearAudio = useCallback(() => {
    playbackOpIdRef.current++;
    recordingOpIdRef.current++;
    stop();
    audioBufferRef.current = null;
    setAudioBufferState(null);
    setDuration(0);
    setCurrentTime(0);
    setSourceType('NONE');
  }, [stop]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // 8. Lifecycle, Tab Visibility & Teardown
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;

      if (document.visibilityState === 'hidden') {
        // Unconditionally cancel recording to prevent stuck mic hardware and invalidate pending operations
        cancelRecording();
      } else if (document.visibilityState === 'visible') {
        // Sync AudioContext state on resume
        if (engineRef.current && isMountedRef.current) {
          const ctx = engineRef.current.getContext();
          setAudioContextState(ctx.state);
        }
      }
    };

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [cancelRecording]);

  useEffect(() => {
    if (autoLoadDemo) {
      loadDemoAudio('male_baritone');
    }

    return () => {
      isMountedRef.current = false;
      playbackOpIdRef.current++;
      recordingOpIdRef.current++;
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.onended = null;
          sourceNodeRef.current.stop();
          sourceNodeRef.current.disconnect();
        } catch {}
        sourceNodeRef.current = null;
      }
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          mediaRecorderRef.current.ondataavailable = null;
          mediaRecorderRef.current.onstop = null;
          mediaRecorderRef.current.onerror = null;
        } catch {}
        mediaRecorderRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (engineRef.current) {
        try {
          const ctx = engineRef.current.getContext();
          if ('onstatechange' in ctx) {
            ctx.onstatechange = null;
          }
        } catch {}
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  return {
    // State
    mode,
    params,
    parameters: params,
    currentPreset,
    activePreset: currentPreset,
    isPlaying,
    isPaused,
    isLooping,
    currentTime,
    duration,
    audioBuffer,
    hasAudio: audioBuffer !== null,
    hasAudioBuffer: audioBuffer !== null,
    sourceType,
    audioSource: sourceType,
    audioSourceType: sourceType,
    isRecording,
    recordingDuration,
    audioContextState,
    contextState: audioContextState,
    engine: engineRef.current,
    rawAnalyser,
    processedAnalyser,
    isProcessing,
    error,
    volume,
    latencyMs: 12,
    sampleRate: 48000,

    // Actions
    ensureAudioContext,
    unlockAudio,
    resumeContext,
    play,
    pause,
    stop,
    togglePlay,
    seek,
    setLoop,
    toggleLoop,
    startRecording,
    stopRecording,
    cancelRecording,
    loadDemoAudio,
    setMode,
    updateParameter,
    updateParam,
    updateParameters,
    loadPreset,
    applyPreset,
    setPreset,
    resetToDefault,
    resetParameters,
    resetAllParams,
    resetParam,
    setVolume,
    setAudioBuffer,
    clearAudio,
    clearError,
  };
}
