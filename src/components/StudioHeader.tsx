import React from 'react';
import {
  AudioLines,
  Headphones,
  Zap,
  HelpCircle,
  Globe,
} from 'lucide-react';
import { ListeningMode } from '../types/audio';
import { useTranslation } from '../i18n';

export interface StudioHeaderProps {
  /** Current state of the Web Audio AudioContext ('suspended' | 'running' | 'closed') */
  contextState?: AudioContextState;
  /** Whether microphone is actively recording */
  isRecording?: boolean;
  /** Whether playback source is active */
  isPlaying?: boolean;
  /** Active listening mode ('RAW' | 'INTERNAL_SIM' | 'COMPENSATED') */
  activeMode?: ListeningMode;
  /** Measured or estimated end-to-end DSP latency in milliseconds */
  latencyMs?: number;
  /** Hardware audio sample rate in Hz (e.g. 48000) */
  sampleRate?: number;
  /** Callback triggered when user clicks the Help & Shortcuts toggle button */
  onOpenHelp?: () => void;
  /** Callback alias for help toggle */
  onHelpToggle?: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  contextState = 'suspended',
  isRecording = false,
  isPlaying = false,
  activeMode = 'RAW',
  latencyMs = 12,
  sampleRate = 48000,
  onOpenHelp,
  onHelpToggle,
}) => {
  const { language, toggleLanguage, t } = useTranslation();

  const handleHelp = () => {
    if (onOpenHelp) onOpenHelp();
    else if (onHelpToggle) onHelpToggle();
  };

  // Compute engine status badge presentation
  const getStatusBadge = () => {
    if (isRecording) {
      return {
        label: t('header.status.recording'),
        dotClass: 'bg-rose-500 animate-ping',
        bgClass: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      };
    }
    if (isPlaying) {
      return {
        label: t('header.status.playback'),
        dotClass: 'bg-emerald-400 animate-pulse',
        bgClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      };
    }
    if (contextState === 'running') {
      return {
        label: t('header.status.dspReady'),
        dotClass: 'bg-cyan-400',
        bgClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
      };
    }
    return {
      label: t('header.status.standby'),
      dotClass: 'bg-amber-400',
      bgClass: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    };
  };

  const status = getStatusBadge();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Branding & App Title */}
        <div className="flex items-center space-x-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-indigo-600 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/30">
            <AudioLines className="h-5 w-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                Vocal<span className="bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">Mirror</span>
              </h1>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {t('app.versionBadge')}
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              {t('app.subtitle')}
            </p>
          </div>
        </div>

        {/* Center: Real-Time Engine Telemetry & Badges */}
        <div className="hidden items-center space-x-3 md:flex">
          {/* Active Engine State Pill */}
          <div
            className={`flex items-center space-x-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${status.bgClass}`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${status.dotClass}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${status.dotClass}`} />
            </span>
            <span>{status.label}</span>
          </div>

          {/* Latency & Sample Rate Pill */}
          <div className="flex items-center space-x-2 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs text-slate-400">
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-mono text-slate-300">
              {t('header.latency', { latency: latencyMs })}
            </span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-slate-400">
              {t('header.sampleRate', { rate: (sampleRate / 1000).toFixed(1) })}
            </span>
          </div>

          {/* Headphone Advisory Recommendation */}
          <div className="flex items-center space-x-1.5 rounded-full border border-indigo-900/40 bg-indigo-950/30 px-3 py-1 text-xs text-indigo-300">
            <Headphones className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-medium">{t('header.headphonesRecommended')}</span>
          </div>
        </div>

        {/* Right: Quick Action Controls & Language Toggle */}
        <div className="flex items-center space-x-2.5">
          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            data-testid="language-toggle-btn"
            aria-label={t('header.languageToggle', { lang: language === 'ja' ? 'English' : '日本語' })}
            title={t('header.languageToggle', { lang: language === 'ja' ? 'English' : '日本語' })}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-200 shadow-sm transition-all hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 active:scale-95"
          >
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <span className={language === 'ja' ? 'font-bold text-cyan-400' : 'text-slate-400'}>JP</span>
            <span className="text-slate-600">/</span>
            <span className={language === 'en' ? 'font-bold text-cyan-400' : 'text-slate-400'}>EN</span>
          </button>

          {/* Guide & Shortcuts Button */}
          <button
            type="button"
            onClick={handleHelp}
            aria-label={t('header.helpAria')}
            title={t('header.helpTitle')}
            className="group flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-300 shadow-sm transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 active:scale-95"
          >
            <HelpCircle className="h-4 w-4 text-cyan-400 transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">{t('header.guideButton')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
