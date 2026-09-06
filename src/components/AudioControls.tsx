import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Repeat,
  RotateCcw,
  Music,
  ChevronDown,
  AlertCircle,
  FileAudio,
  Download,
} from 'lucide-react';
import { AudioSourceType } from '../types/audio';
import { SAMPLE_AUDIO_PRESETS } from '../audio/sampleAudio';
import { useTranslation } from '../i18n';

export interface AudioControlsProps {
  /** Whether microphone is actively recording */
  isRecording?: boolean;
  /** Whether audio buffer playback is currently active */
  isPlaying?: boolean;
  /** Whether audio playback is set to repeat continuously */
  isLooping?: boolean;
  /** Whether an audio buffer is loaded and ready for playback */
  hasAudio?: boolean;
  /** Alias for hasAudio */
  hasAudioBuffer?: boolean;
  /** Current playback position in seconds */
  currentTime?: number;
  /** Total audio buffer duration in seconds */
  duration?: number;
  /** Active audio input source ('MIC' | 'SAMPLE' | 'BUFFER' | 'NONE') */
  audioSourceType?: AudioSourceType;
  /** Alias for audioSourceType */
  audioSource?: AudioSourceType;
  /** Current duration of the in-progress mic recording in seconds */
  recordingDuration?: number;
  /** Triggers microphone recording initiation */
  onStartRecording?: () => void | Promise<void>;
  /** Stops microphone recording and decodes buffer */
  onStopRecording?: () => void | Promise<void>;
  /** Toggles play/pause state */
  onTogglePlay?: () => void | Promise<void>;
  /** Play callback */
  onPlay?: () => void | Promise<void>;
  /** Pause callback */
  onPause?: () => void | Promise<void>;
  /** Toggles loop repetition */
  onToggleLoop?: () => void;
  /** Seeks to a specific timestamp in seconds */
  onSeek?: (timeInSeconds: number) => void;
  /** Loads synthesized or bundled demo voice sample */
  onLoadDemo?: (presetKey?: string) => void | Promise<void>;
  /** Unloads current audio buffer */
  onClearAudio?: () => void;
  /** Opens the Export Audio modal dialog */
  onOpenExport?: () => void;
  /** Disables controls */
  disabled?: boolean;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  isRecording = false,
  isPlaying = false,
  isLooping = false,
  hasAudio,
  hasAudioBuffer,
  currentTime = 0,
  duration = 0,
  audioSourceType,
  audioSource,
  recordingDuration = 0,
  onStartRecording,
  onStopRecording,
  onTogglePlay,
  onPlay,
  onPause,
  onToggleLoop,
  onSeek,
  onLoadDemo,
  onClearAudio,
  onOpenExport,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [isDemoDropdownOpen, setIsDemoDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const audioReady = hasAudio !== undefined ? hasAudio : (hasAudioBuffer !== undefined ? hasAudioBuffer : false);
  const resolvedSourceType = audioSourceType || audioSource || 'NONE';

  // Close demo dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDemoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format seconds into MM:SS.s
  const formatTime = (sec: number): string => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '00:00.0';
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handlePlayClick = () => {
    if (isPlaying) {
      if (onPause) onPause();
      else if (onTogglePlay) onTogglePlay();
    } else {
      if (onPlay) onPlay();
      else if (onTogglePlay) onTogglePlay();
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
    const newTime = parseFloat((e.target as HTMLInputElement).value);
    if (onSeek) onSeek(newTime);
  };

  return (
    <section className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-slate-950/60 backdrop-blur-xl">
      {/* Top Row: Primary Transport Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Group: Recording & Playback Triggers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 1. Microphone Record Button */}
          {isRecording ? (
            <button
              type="button"
              onClick={onStopRecording}
              disabled={disabled}
              aria-label={t('controls.recordStopAria')}
              className="flex items-center space-x-2.5 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/60 ring-2 ring-rose-400/60 transition-all hover:bg-rose-500 active:scale-95 animate-pulse"
            >
              <Square className="h-4 w-4 fill-white" />
              <span>{t('controls.recordStop')}</span>
              <span className="rounded bg-rose-900/80 px-2 py-0.5 font-mono text-xs text-rose-200">
                {formatTime(recordingDuration)}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartRecording}
              disabled={disabled}
              aria-label={t('controls.recordStartAria')}
              className="group flex items-center space-x-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-300 shadow-md shadow-rose-950/20 transition-all hover:border-rose-500/80 hover:bg-rose-500/20 hover:text-white active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <Mic className="h-4 w-4 text-rose-400 transition-transform group-hover:scale-110" />
              <span>{t('controls.recordStart')}</span>
            </button>
          )}

          {/* 2. Play / Pause Button */}
          <button
            type="button"
            onClick={handlePlayClick}
            disabled={disabled || (!audioReady && !isRecording)}
            aria-label={isPlaying ? t('controls.pauseAria') : t('controls.playAria')}
            className="flex items-center space-x-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-950/50 transition-all hover:from-cyan-400 hover:to-teal-300 hover:shadow-cyan-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 fill-slate-950 stroke-[2.5]" />
                <span>{t('controls.pause')}</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-slate-950 stroke-[2.5]" />
                <span>{t('controls.play')}</span>
              </>
            )}
          </button>

          {/* 3. Loop Repetition Toggle */}
          <button
            type="button"
            onClick={onToggleLoop}
            disabled={disabled || !audioReady}
            aria-pressed={isLooping}
            aria-label={t('controls.loopAria')}
            className={`flex items-center space-x-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 ${
              isLooping
                ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-300 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/40'
                : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Repeat className={`h-4 w-4 ${isLooping ? 'text-cyan-300 stroke-[2.5]' : 'text-slate-400'}`} />
            <span>{t('controls.loop')}</span>
          </button>
        </div>

        {/* Right Group: Demo Voice Loader, Export & Buffer Management */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Export WAV Button */}
          {onOpenExport && (
            <button
              type="button"
              onClick={onOpenExport}
              disabled={disabled || !audioReady || isRecording}
              aria-label={t('controls.exportAria')}
              title={t('controls.exportTitle')}
              className="flex items-center space-x-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 shadow-sm transition-all hover:border-cyan-500/80 hover:bg-cyan-500/20 hover:text-white active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Download className="h-4 w-4 text-cyan-400" />
              <span>{t('controls.export')}</span>
            </button>
          )}

          {/* Demo Voice Dropdown Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (onLoadDemo && isDemoDropdownOpen) {
                  onLoadDemo('male_baritone');
                }
                setIsDemoDropdownOpen(!isDemoDropdownOpen);
              }}
              disabled={disabled || isRecording}
              aria-label={t('controls.loadDemoAria')}
              className="flex items-center space-x-2 rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-sm font-semibold text-slate-200 shadow-sm transition-all hover:border-slate-600 hover:bg-slate-700/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-40"
            >
              <Music className="h-4 w-4 text-cyan-400" />
              <span>{t('controls.loadDemo')}</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDemoDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDemoDropdownOpen && (
              <div className="absolute right-0 mt-2 z-50 w-72 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl ring-1 ring-black/40">
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  {t('controls.demoDropdownHeader')}
                </div>
                <div className="mt-1 space-y-1">
                  {Object.entries(SAMPLE_AUDIO_PRESETS).map(([key, preset]) => {
                    const sampleName = t(`samples.${key}.name`) || preset.name;
                    const sampleDesc = t(`samples.${key}.description`) || preset.description;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (onLoadDemo) onLoadDemo(key);
                          setIsDemoDropdownOpen(false);
                        }}
                        className="w-full text-left rounded-lg px-3 py-2.5 text-xs text-slate-300 transition-colors hover:bg-cyan-950/50 hover:text-cyan-200 focus:bg-cyan-950/60 focus:text-white"
                      >
                        <div className="font-bold text-slate-200">{sampleName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{sampleDesc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Clear Audio Button */}
          {audioReady && onClearAudio && (
            <button
              type="button"
              onClick={onClearAudio}
              disabled={disabled || isRecording}
              aria-label={t('controls.resetAria')}
              title={t('controls.resetTitle')}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-3 text-xs font-medium text-slate-400 hover:border-rose-900/50 hover:bg-rose-950/20 hover:text-rose-300 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('controls.reset')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Timeline Scrubber & Time Status Bar */}
      <div className="mt-5 space-y-2 border-t border-slate-800/80 pt-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-base font-bold text-cyan-400 tracking-tight">
              {formatTime(currentTime)}
            </span>
            <span className="text-slate-600 font-mono">/</span>
            <span className="font-mono text-sm text-slate-400 font-medium">
              {formatTime(duration)}
            </span>
          </div>

          {/* Audio Source Status Readout */}
          <div className="flex items-center space-x-2">
            <FileAudio className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs text-slate-400 font-medium">
              {resolvedSourceType === 'MIC' && t('controls.sources.mic')}
              {resolvedSourceType === 'SAMPLE' && t('controls.sources.sample')}
              {resolvedSourceType === 'BUFFER' && t('controls.sources.buffer')}
              {resolvedSourceType === 'NONE' && (
                <span className="text-amber-400/80 flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{t('controls.sources.none')}</span>
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Custom Range Timeline Scrubber */}
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTime}
            onChange={handleSliderChange}
            onInput={handleSliderChange}
            disabled={disabled || !audioReady}
            aria-label={t('controls.timelineAria')}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${progressPercent}%, #1e293b ${progressPercent}%, #1e293b 100%)`,
            }}
          />
        </div>
      </div>
    </section>
  );
};
