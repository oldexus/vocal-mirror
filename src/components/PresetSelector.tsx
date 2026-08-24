import React from 'react';
import {
  Sparkles,
  RotateCcw,
  Check,
  Layers,
} from 'lucide-react';
import {
  PhysiologicalPresetKey,
  PhysiologicalPreset,
} from '../types/audio';
import { ACOUSTIC_PRESETS } from '../audio/constants';
import { useTranslation } from '../i18n';

export interface PresetSelectorProps {
  /** Active preset key ('natural_standard' | 'deep_chest_male' | 'bright_cranial_female' | 'intense_confrontation' | 'custom') */
  currentPreset?: PhysiologicalPresetKey | 'custom';
  /** Alias for currentPreset */
  activePreset?: PhysiologicalPresetKey | 'custom';
  /** Triggered when user selects a preset */
  onSelectPreset?: (key: PhysiologicalPresetKey) => void;
  /** Resets parameters to default standard preset */
  onResetToDefault?: () => void;
  /** Alias for onResetToDefault */
  onReset?: () => void;
  /** Disables interaction */
  disabled?: boolean;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  currentPreset,
  activePreset,
  onSelectPreset,
  onResetToDefault,
  onReset,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const selectedPreset = currentPreset || activePreset || 'natural_standard';
  const isCustom = selectedPreset === 'custom';

  const handleReset = () => {
    if (onResetToDefault) onResetToDefault();
    else if (onReset) onReset();
  };

  return (
    <div className="w-full space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {t('presets.header.title')}
          </h3>
          {isCustom && (
            <span className="flex items-center space-x-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              <Sparkles className="h-2.5 w-2.5" />
              <span>{t('presets.header.customBadge')}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          aria-label={t('presets.header.resetAria')}
          className="flex items-center space-x-1 text-xs font-medium text-slate-400 transition-colors hover:text-cyan-300 focus:outline-none"
        >
          <RotateCcw className="h-3 w-3" />
          <span>{t('presets.header.resetButton')}</span>
        </button>
      </div>

      {/* Preset Pills Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.entries(ACOUSTIC_PRESETS) as [PhysiologicalPresetKey, PhysiologicalPreset][]).map(
          ([key, preset]) => {
            const isSelected = selectedPreset === key;
            const presetName = t(`presets.items.${key}.name`) || preset.name;
            const presetTag = t(`presets.items.${key}.tag`) || preset.tag;
            const presetDesc = t(`presets.items.${key}.description`) || preset.description;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectPreset && onSelectPreset(key)}
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={t('presets.header.selectAria', { name: presetName })}
                className={`group flex flex-col justify-between rounded-xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                  isSelected
                    ? 'border-cyan-500/80 bg-cyan-950/40 text-cyan-100 ring-1 ring-cyan-400/40 shadow-md shadow-cyan-950/50'
                    : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-cyan-200">
                      {presetName}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                  </div>
                  <span className="mt-0.5 inline-block rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    {presetTag}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-snug text-slate-400 line-clamp-2">
                  {presetDesc}
                </p>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
};
