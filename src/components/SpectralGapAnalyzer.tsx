/**
 * VocalMirror — Real-Time Spectral Gap Analyzer Component
 * 
 * Responsibilities:
 * 1. Responsive Canvas Wrapper with auto-resizing via ResizeObserver and High-DPI support.
 * 2. Interactive hover cursor displaying exact frequency in Hz, dB levels for both signals, and ΔdB.
 * 3. Live gap metrics display panel: Low Resonance Boost, HF Tissue Rolloff, Voice Confrontation Index.
 * 4. Display mode toggles: [ Overlay | Differential | Gap Only ].
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  AudioLines,
  Layers,
  Activity,
  Flame,
} from 'lucide-react';
import {
  SpectrumVisualizerRenderer,
  VisualizerDisplayMode,
} from '../audio/SpectrumVisualizerRenderer';
import {
  SpectralGapMetrics,
  CursorInspectionData,
} from '../utils/frequencyMapping';
import { useTranslation } from '../i18n';

export interface SpectralGapAnalyzerProps {
  rawAnalyser: AnalyserNode | null;
  processedAnalyser: AnalyserNode | null;
  isPlaying?: boolean;
  isRecording?: boolean;
  sampleRate?: number;
  className?: string;
}

export const SpectralGapAnalyzer: React.FC<SpectralGapAnalyzerProps> = ({
  rawAnalyser,
  processedAnalyser,
  isPlaying = false,
  isRecording = false,
  sampleRate = 48000,
  className = '',
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SpectrumVisualizerRenderer | null>(null);

  // Component UI State
  const [displayMode, setDisplayMode] = useState<VisualizerDisplayMode>('OVERLAY');
  const [metrics, setMetrics] = useState<SpectralGapMetrics>({
    lowResonanceBoostDb: 0,
    hfTissueRolloffDb: 0,
    voiceConfrontationIndex: 0,
    peakResonanceFreq: 180,
    rmsDifferential: 0,
  });
  const [cursorData, setCursorData] = useState<CursorInspectionData | null>(null);

  // 1. Initialize Renderer & ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser,
      processedAnalyser,
      sampleRate,
      displayMode,
      renderOptions: {
        labelFormatter: (key, defaultText, params) => t(key, params) || defaultText,
      },
      onMetricsUpdate: (newMetrics) => {
        setMetrics(newMetrics);
      },
      onCursorInspect: (data) => {
        setCursorData(data);
      },
    });

    rendererRef.current = renderer;

    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const rect = container.getBoundingClientRect();
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      const w = rect.width || container.clientWidth || 800;
      const h = rect.height || container.clientHeight || 280;
      rendererRef.current.resize(w, h, dpr);
    };

    // Initial size setup
    handleResize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
    }

    renderer.start();

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Sync labelFormatter when translation changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setOptions({
        labelFormatter: (key, defaultText, params) => t(key, params) || defaultText,
      });
    }
  }, [t]);

  // 2. Sync Analysers & SampleRate
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setAnalysers(rawAnalyser, processedAnalyser);
    }
  }, [rawAnalyser, processedAnalyser]);

  // 3. Sync Display Mode Changes
  const handleModeChange = useCallback((mode: VisualizerDisplayMode) => {
    setDisplayMode(mode);
    if (rendererRef.current) {
      rendererRef.current.setMode(mode);
    }
  }, []);

  // 4. Mouse & Touch Hover Handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    rendererRef.current.setHoverCursor(x, y);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.clearHoverCursor();
    }
    setCursorData(null);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    rendererRef.current.setHoverCursor(x, y);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.clearHoverCursor();
    }
    setCursorData(null);
  }, []);

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-md space-y-4 ${className}`}
      data-testid="spectral-gap-analyzer"
    >
      {/* 1. Header Navigation & Mode Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="rounded-lg bg-cyan-950/80 p-1.5 border border-cyan-800/50 text-cyan-400 shadow-sm">
            <AudioLines className={`h-5 w-5 ${isPlaying || isRecording ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white">
              {t('analyzer.title')}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t('analyzer.subtitle')}
            </p>
          </div>
        </div>

        {/* Display Mode Toggle Pills */}
        <div className="flex items-center space-x-1.5 rounded-xl bg-slate-950/80 p-1 border border-slate-800">
          <button
            type="button"
            aria-pressed={displayMode === 'OVERLAY'}
            onClick={() => handleModeChange('OVERLAY')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              displayMode === 'OVERLAY'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{t('analyzer.modes.overlay')}</span>
          </button>

          <button
            type="button"
            aria-pressed={displayMode === 'DIFFERENTIAL'}
            onClick={() => handleModeChange('DIFFERENTIAL')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              displayMode === 'DIFFERENTIAL'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>{t('analyzer.modes.differential')}</span>
          </button>

          <button
            type="button"
            aria-pressed={displayMode === 'GAP_ONLY'}
            onClick={() => handleModeChange('GAP_ONLY')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              displayMode === 'GAP_ONLY'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>{t('analyzer.modes.gapOnly')}</span>
          </button>
        </div>
      </div>

      {/* 2. Responsive Canvas Viewport & Floating Hover Cursor Tooltip */}
      <div
        ref={containerRef}
        className="relative h-64 sm:h-72 w-full rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner cursor-crosshair select-none"
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('analyzer.canvasAria')}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-0 block h-full w-full"
        />

        {/* Interactive Floating Hover Cursor Readout Badge */}
        {cursorData && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-slate-700/80 bg-slate-900/95 p-2.5 text-xs text-white shadow-xl backdrop-blur-md transition-transform"
            style={{
              left: `${Math.min(cursorData.x + 12, (containerRef.current?.clientWidth || 300) - 180)}px`,
              top: `${Math.max(8, Math.min(cursorData.yBone - 40, (containerRef.current?.clientHeight || 200) - 90))}px`,
            }}
          >
            <div className="font-mono font-bold text-cyan-300">
              {cursorData.freq.toFixed(0)} Hz
            </div>
            <div className="mt-1 space-y-0.5 font-mono text-[11px]">
              <div className="flex items-center justify-between space-x-3 text-sky-300">
                <span>{t('analyzer.cursor.air')}</span>
                <span>{cursorData.rawDb.toFixed(1)} dB</span>
              </div>
              <div className="flex items-center justify-between space-x-3 text-amber-300">
                <span>{t('analyzer.cursor.bone')}</span>
                <span>{cursorData.boneDb.toFixed(1)} dB</span>
              </div>
              <div
                className={`flex items-center justify-between space-x-3 font-bold ${
                  cursorData.deltaDb >= 0 ? 'text-cyan-400' : 'text-rose-400'
                }`}
              >
                <span>{t('analyzer.cursor.gap')}</span>
                <span>
                  {cursorData.deltaDb >= 0 ? '+' : ''}
                  {cursorData.deltaDb.toFixed(1)} dB
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Live Gap Metrics Display Panel */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Metric 1: Low Resonance Boost */}
        <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              {t('analyzer.metrics.lowBoost.title')}
            </span>
            <span className="font-mono text-[10px] text-cyan-400/80">
              {t('analyzer.metrics.lowBoost.range')}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="font-mono text-xl font-extrabold text-cyan-400">
              {metrics.lowResonanceBoostDb > 0 ? `+${metrics.lowResonanceBoostDb}` : metrics.lowResonanceBoostDb} dB
            </span>
            <span className="text-[11px] text-slate-400">
              {t('analyzer.metrics.lowBoost.atFreq', { freq: metrics.peakResonanceFreq })}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 leading-tight">
            {t('analyzer.metrics.lowBoost.desc')}
          </p>
        </div>

        {/* Metric 2: HF Tissue Rolloff */}
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              {t('analyzer.metrics.tissueRolloff.title')}
            </span>
            <span className="font-mono text-[10px] text-amber-400/80">
              {t('analyzer.metrics.tissueRolloff.range')}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="font-mono text-xl font-extrabold text-amber-400">
              {metrics.hfTissueRolloffDb} dB
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 leading-tight">
            {t('analyzer.metrics.tissueRolloff.desc')}
          </p>
        </div>

        {/* Metric 3: Voice Confrontation Index */}
        <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              {t('analyzer.metrics.vci.title')}
            </span>
            <span className="font-mono text-[10px] text-indigo-400/80">
              {t('analyzer.metrics.vci.unit')}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="font-mono text-xl font-extrabold text-indigo-300">
              {metrics.voiceConfrontationIndex}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('analyzer.metrics.vci.max')}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 leading-tight">
            {t('analyzer.metrics.vci.desc')}
          </p>
        </div>
      </div>

      {/* 4. Acoustic Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400 inline-block" />
            <span>{t('analyzer.legend.air')}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
            <span>{t('analyzer.legend.bone')}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-5 rounded bg-cyan-500/30 border border-cyan-500/50 inline-block" />
            <span>{t('analyzer.legend.gap')}</span>
          </div>
        </div>

        <div className="flex items-center space-x-1 font-mono text-[10px] text-slate-500">
          <span>{t('analyzer.legend.fft')}</span>
          <span>&bull;</span>
          <span>{t('analyzer.legend.fps')}</span>
        </div>
      </div>
    </div>
  );
};
