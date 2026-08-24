/**
 * VocalMirror — Audio Export Modal Component (Client-Side RIFF WAVE)
 * 
 * Provides offline batch DSP rendering, multi-mode WAV export (Mode A / B / C / All),
 * 16-bit PCM and 32-bit Float precision selection, and instant browser download.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  X,
  FileAudio,
  Check,
  AlertTriangle,
  Loader2,
  Layers,
} from 'lucide-react';
import { ListeningMode, DSPParameters } from '../types/audio';
import { AcousticEngine } from '../audio/AcousticEngine';
import { DEFAULT_DSP_PARAMS } from '../audio/constants';
import {
  exportAudioBufferAsWavBlob,
  downloadWavBlob,
} from '../utils/audioBufferToWav';
import { useTranslation } from '../i18n';

export type ExportModeSelection = 'RAW' | 'INTERNAL_SIM' | 'COMPENSATED' | 'ALL_MODES';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioBuffer: AudioBuffer | null;
  currentMode?: ListeningMode;
  params?: DSPParameters;
  currentParams?: DSPParameters;
  sampleRate?: number;
  onExportSuccess?: (filename: string, blob: Blob) => void;
  onExportError?: (error: Error) => void;
  className?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  audioBuffer,
  currentMode = 'INTERNAL_SIM',
  params,
  currentParams,
  sampleRate: propSampleRate,
  onExportSuccess,
  onExportError,
  className = '',
}) => {
  const { t } = useTranslation();
  const activeDSPParams = params || currentParams || DEFAULT_DSP_PARAMS;
  const initialMode: ExportModeSelection = currentMode || 'INTERNAL_SIM';

  const [selectedExportMode, setSelectedExportMode] = useState<ExportModeSelection>(initialMode);
  const [bitDepth, setBitDepth] = useState<16 | 32>(16);
  const [customFilename, setCustomFilename] = useState<string>('');
  const [exportState, setExportState] = useState<'idle' | 'rendering' | 'completed' | 'error'>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync mode and default filename when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedExportMode(currentMode || 'INTERNAL_SIM');
      setExportState('idle');
      setProgressPercent(0);
      setErrorMessage(null);

      const modeSlug =
        currentMode === 'RAW'
          ? 'air_raw'
          : currentMode === 'INTERNAL_SIM'
          ? 'bone_internal_sim'
          : 'compensated_tone';
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      setCustomFilename(`vocal_mirror_${modeSlug}_${timestamp}.wav`);
    }
  }, [isOpen, currentMode]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.code === 'Escape') && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const durationSec = audioBuffer ? audioBuffer.duration : 0;
  const numChannels = audioBuffer ? audioBuffer.numberOfChannels : 1;
  const resolvedSampleRate =
    audioBuffer?.sampleRate || propSampleRate || 48000;

  // Estimated file size calculation (in KB / MB)
  const bytesPerSample = (bitDepth / 8) * numChannels;
  const totalRawBytes = audioBuffer ? 44 + audioBuffer.length * bytesPerSample : 0;
  const formattedFileSize =
    totalRawBytes > 1024 * 1024
      ? `${(totalRawBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalRawBytes / 1024).toFixed(1)} KB`;

  const handleStartExport = async () => {
    if (!audioBuffer) {
      setErrorMessage(t('export.errors.noBuffer'));
      return;
    }

    try {
      setExportState('rendering');
      setProgressPercent(20);
      setErrorMessage(null);

      const modesToRender: ListeningMode[] =
        selectedExportMode === 'ALL_MODES'
          ? ['RAW', 'INTERNAL_SIM', 'COMPENSATED']
          : [selectedExportMode];

      const total = modesToRender.length;
      let lastBlob: Blob | null = null;
      let lastFilename = '';

      for (let i = 0; i < total; i++) {
        const mode = modesToRender[i];
        setProgressPercent(Math.round(((i + 0.3) / total) * 100));

        let renderedBuffer: AudioBuffer;
        if (mode === 'RAW') {
          renderedBuffer = audioBuffer;
        } else {
          renderedBuffer = await AcousticEngine.processBuffer(
            audioBuffer,
            mode,
            activeDSPParams
          );
        }

        setProgressPercent(Math.round(((i + 0.8) / total) * 100));

        let outName = customFilename.trim();
        if (!outName) {
          outName = `vocal_mirror_${mode.toLowerCase()}.wav`;
        }
        if (!outName.toLowerCase().endsWith('.wav')) {
          outName = `${outName}.wav`;
        }
        if (selectedExportMode === 'ALL_MODES') {
          const suffix =
            mode === 'RAW'
              ? '_raw'
              : mode === 'INTERNAL_SIM'
              ? '_internal'
              : '_compensated';
          outName = outName.replace(/\.wav$/i, '') + `${suffix}.wav`;
        }

        const blob = exportAudioBufferAsWavBlob(renderedBuffer, {
          float32: bitDepth === 32,
        });

        downloadWavBlob(blob, outName);

        lastBlob = blob;
        lastFilename = outName;
      }

      setProgressPercent(100);
      setExportState('completed');

      if (onExportSuccess && lastBlob) {
        onExportSuccess(lastFilename, lastBlob);
      }

      // Auto close after 1.8 seconds on success
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setExportState('error');
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setErrorMessage(errorObj.message || t('export.errors.failed'));
      if (onExportError) {
        onExportError(errorObj);
      }
    }
  };

  return (
    <div
      data-testid="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && exportState !== 'rendering') {
          onClose();
        }
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-fade-in ${className}`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 id="export-dialog-title" className="text-base font-bold text-white">
                {t('export.title')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('export.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('export.closeAria')}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Audio Buffer Overview Pill */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-300">
            <FileAudio className="h-4 w-4 text-cyan-400" />
            <span>
              {audioBuffer
                ? t('export.audioLoaded', { duration: durationSec.toFixed(2) })
                : t('export.noAudio')}
            </span>
            {audioBuffer && (
              <span className="text-slate-500 font-sans">({formattedFileSize})</span>
            )}
          </div>
          <div className="text-slate-400">
            <span>
              {t(numChannels === 1 ? 'export.channelMono' : 'export.channelStereo')}
            </span>
            <span className="mx-1.5 text-slate-600">|</span>
            <span>{resolvedSampleRate.toLocaleString()} Hz</span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('export.profileSelect')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              data-mode="INTERNAL_SIM"
              onClick={() => setSelectedExportMode('INTERNAL_SIM')}
              className={`rounded-xl border p-3 text-left transition-all ${
                selectedExportMode === 'INTERNAL_SIM'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/50'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-white flex items-center space-x-1.5">
                <span>{t('export.modes.internal.title')}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('export.modes.internal.desc')}
              </p>
            </button>

            <button
              type="button"
              data-mode="RAW"
              onClick={() => setSelectedExportMode('RAW')}
              className={`rounded-xl border p-3 text-left transition-all ${
                selectedExportMode === 'RAW'
                  ? 'border-sky-500 bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/50'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-white flex items-center space-x-1.5">
                <span>{t('export.modes.raw.title')}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('export.modes.raw.desc')}
              </p>
            </button>

            <button
              type="button"
              data-mode="COMPENSATED"
              onClick={() => setSelectedExportMode('COMPENSATED')}
              className={`rounded-xl border p-3 text-left transition-all ${
                selectedExportMode === 'COMPENSATED'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/50'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-white flex items-center space-x-1.5">
                <span>{t('export.modes.compensated.title')}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('export.modes.compensated.desc')}
              </p>
            </button>

            <button
              type="button"
              data-mode="ALL_MODES"
              onClick={() => setSelectedExportMode('ALL_MODES')}
              className={`rounded-xl border p-3 text-left transition-all ${
                selectedExportMode === 'ALL_MODES'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-200 ring-1 ring-indigo-500/50'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-white flex items-center space-x-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                <span>{t('export.modes.all.title')}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('export.modes.all.desc')}
              </p>
            </button>
          </div>
        </div>

        {/* Format & Bit Depth Option */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('export.bitDepth.label')}
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              data-format="pcm16"
              onClick={() => setBitDepth(16)}
              className={`rounded-xl border p-2.5 text-center font-medium transition-all ${
                bitDepth === 16
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200 font-bold'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              {t('export.bitDepth.pcm16')}
            </button>
            <button
              type="button"
              data-format="float32"
              onClick={() => setBitDepth(32)}
              className={`rounded-xl border p-2.5 text-center font-medium transition-all ${
                bitDepth === 32
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200 font-bold'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              {t('export.bitDepth.float32')}
            </button>
          </div>
        </div>

        {/* Filename Input */}
        <div className="space-y-1">
          <label
            htmlFor="export-filename"
            className="block text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            {t('export.filename.label')}
          </label>
          <input
            id="export-filename"
            data-testid="export-filename-input"
            type="text"
            value={customFilename}
            onChange={(e) => setCustomFilename(e.target.value)}
            placeholder={t('export.filename.placeholder')}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Null Audio Warning */}
        {!audioBuffer && (
          <div className="flex items-center space-x-2 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{t('export.warnings.noAudioBuffer')}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center space-x-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Progress Bar during Rendering */}
        {exportState === 'rendering' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-cyan-300">
              <span className="flex items-center space-x-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{t('export.status.rendering', { progress: progressPercent })}</span>
              </span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Completed State Notice */}
        {exportState === 'completed' && (
          <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{t('export.status.completed')}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={exportState === 'rendering'}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40"
          >
            {t('export.buttons.cancel')}
          </button>
          <button
            type="button"
            data-testid="export-submit-button"
            onClick={handleStartExport}
            disabled={exportState === 'rendering' || !audioBuffer}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-cyan-950/50 hover:from-cyan-400 hover:to-teal-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exportState === 'rendering' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                <span>{t('export.buttons.rendering')}</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 stroke-[2.5]" />
                <span>{t('export.buttons.download')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
