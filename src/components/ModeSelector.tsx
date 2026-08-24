import React from 'react';
import {
  Wind,
  Headphones,
  Sparkles,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { ListeningMode } from '../types/audio';
import { useTranslation } from '../i18n';

export interface ModeSelectorProps {
  /** Active listening mode ('RAW' | 'INTERNAL_SIM' | 'COMPENSATED') */
  activeMode?: ListeningMode;
  /** Alias for activeMode */
  currentMode?: ListeningMode;
  /** Mode change handler triggering 25ms equal-power crossfade */
  onModeChange?: (mode: ListeningMode) => void;
  /** Playback activity indicator */
  isPlaying?: boolean;
  /** Disables switching */
  disabled?: boolean;
}

interface ModeSpec {
  key: ListeningMode;
  shortcut: string;
  dictKey: 'raw' | 'internal_sim' | 'compensated';
  icon: React.ElementType;
  activeCardStyle: string;
  activeBadgeStyle: string;
  glowColor: string;
}

const MODES: ModeSpec[] = [
  {
    key: 'RAW',
    shortcut: '1',
    dictKey: 'raw',
    icon: Wind,
    activeCardStyle:
      'border-sky-500 bg-sky-950/40 text-sky-100 ring-2 ring-sky-400/50 shadow-xl shadow-sky-950/70',
    activeBadgeStyle: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    glowColor: 'from-sky-500/20 to-transparent',
  },
  {
    key: 'INTERNAL_SIM',
    shortcut: '2',
    dictKey: 'internal_sim',
    icon: Headphones,
    activeCardStyle:
      'border-amber-500 bg-amber-950/40 text-amber-100 ring-2 ring-amber-400/50 shadow-xl shadow-amber-950/70',
    activeBadgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    glowColor: 'from-amber-500/20 to-transparent',
  },
  {
    key: 'COMPENSATED',
    shortcut: '3',
    dictKey: 'compensated',
    icon: Sparkles,
    activeCardStyle:
      'border-emerald-500 bg-emerald-950/40 text-emerald-100 ring-2 ring-emerald-400/50 shadow-xl shadow-emerald-950/70',
    activeBadgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    glowColor: 'from-emerald-500/20 to-transparent',
  },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  activeMode,
  currentMode,
  onModeChange,
  isPlaying = false,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const selectedMode = activeMode || currentMode || 'RAW';

  return (
    <section className="w-full space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
            {t('modes.header.title')}
          </h2>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
            {t('modes.header.badge')}
          </span>
        </div>
        <span className="hidden text-xs text-slate-500 sm:inline">
          {t('modes.header.shortcutHint')}
        </span>
      </div>

      {/* Tri-Mode Selection Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {MODES.map((mode) => {
          const isActive = selectedMode === mode.key;
          const Icon = mode.icon;
          const name = t(`modes.${mode.dictKey}.name`);
          const subtitle = t(`modes.${mode.dictKey}.subtitle`);
          const acousticTag = t(`modes.${mode.dictKey}.acousticTag`);
          const description = t(`modes.${mode.dictKey}.description`);

          return (
            <button
              key={mode.key}
              type="button"
              onClick={() => onModeChange && onModeChange(mode.key)}
              disabled={disabled}
              aria-pressed={isActive}
              data-active={isActive ? 'true' : 'false'}
              className={`group relative flex flex-col justify-between rounded-2xl border p-5 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                isActive
                  ? mode.activeCardStyle
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              {/* Card Top: Icon, Mode Title & Shortcut Badge */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                      isActive ? 'bg-slate-950/80 text-white shadow-inner' : 'bg-slate-800/80 text-slate-400'
                    }`}
                  >
                    <Icon className="h-5 w-5 stroke-[2.2]" />
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-300">
                      [{mode.shortcut}]
                    </span>
                    {isActive && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{name}</h3>
                  <p className="text-xs font-semibold text-cyan-300/90 mt-0.5">{subtitle}</p>
                </div>

                {/* Acoustic Tag */}
                <div
                  className={`inline-block rounded-md border px-2.5 py-1 text-[11px] font-mono font-medium ${
                    isActive ? mode.activeBadgeStyle : 'border-slate-800 bg-slate-950/60 text-slate-500'
                  }`}
                >
                  {acousticTag}
                </div>

                {/* Physical Description */}
                <p className="text-xs leading-relaxed text-slate-400">{description}</p>
              </div>

              {/* Card Bottom: Active Indicator */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                {isActive ? (
                  <div className="flex items-center space-x-1.5 font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{t('modes.status.active')}</span>
                  </div>
                ) : (
                  <span className="text-slate-500 group-hover:text-slate-400">{t('modes.status.clickToAudition')}</span>
                )}
                {isActive && isPlaying && (
                  <span className="flex items-center space-x-1 font-mono text-[10px] text-cyan-300">
                    <Zap className="h-3 w-3" />
                    <span>{t('modes.status.crossfade')}</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
