import React, { useRef, useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  Check,
  Layers,
  Plus,
  Trash2,
  Download,
  Upload,
} from 'lucide-react';
import {
  PhysiologicalPresetKey,
  PhysiologicalPreset,
} from '../types/audio';
import { CustomAcousticPreset } from '../types/licensing';
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
  /** Saved custom anatomical presets */
  customPresets?: CustomAcousticPreset[];
  /** Triggered when user selects a custom preset */
  onSelectCustomPreset?: (preset: CustomAcousticPreset) => void;
  /** Triggered when user clicks to save current params as custom preset */
  onOpenSaveCustomPreset?: () => void;
  /** Triggered when user deletes a custom preset */
  onDeleteCustomPreset?: (id: string) => void;
  /** Triggered to export all custom presets as JSON */
  onExportPresets?: () => void;
  /** Triggered to import custom presets from JSON */
  onImportPresets?: (jsonStr: string) => { success: boolean; count: number; error?: string };
  /** Whether user is in Pro tier */
  isPro?: boolean;
  /** Callback to open pricing modal */
  onOpenPricing?: () => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  currentPreset,
  activePreset,
  onSelectPreset,
  onResetToDefault,
  onReset,
  disabled = false,
  customPresets = [],
  onSelectCustomPreset,
  onOpenSaveCustomPreset,
  onDeleteCustomPreset,
  onExportPresets,
  onImportPresets,
  isPro = false,
  onOpenPricing,
}) => {
  const { t } = useTranslation();
  const selectedPreset = currentPreset || activePreset || 'natural_standard';
  const isCustom = selectedPreset === 'custom';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importNotification, setImportNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleReset = () => {
    if (onResetToDefault) onResetToDefault();
    else if (onReset) onReset();
  };

  const handleExportClick = () => {
    if (!isPro) {
      if (onOpenPricing) onOpenPricing();
      return;
    }
    if (onExportPresets) {
      onExportPresets();
    }
  };

  const handleImportClick = () => {
    if (!isPro) {
      if (onOpenPricing) onOpenPricing();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportPresets) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const res = onImportPresets(text);
      if (res.success) {
        setImportNotification({
          type: 'success',
          message: t('customPresets.importSuccess', { count: res.count }),
        });
      } else {
        setImportNotification({
          type: 'error',
          message: t('customPresets.importError', { error: res.error || 'Unknown' }),
        });
      }
      setTimeout(() => setImportNotification(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
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

      {/* Custom Anatomical Presets (Pro Feature) */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {t('customPresets.title')}
            </h4>
            <span className="rounded bg-gradient-to-r from-amber-400/20 to-cyan-400/20 border border-amber-400/40 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
              PRO
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {onExportPresets && (
              <button
                type="button"
                onClick={handleExportClick}
                data-testid="export-presets-btn"
                title={t('customPresets.exportButton')}
                aria-label={t('customPresets.exportButton')}
                className="inline-flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-all shadow-sm active:scale-95"
              >
                <Download className="h-3 w-3 text-cyan-400" />
                <span className="hidden sm:inline">{t('customPresets.exportButton')}</span>
              </button>
            )}

            {onImportPresets && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="import-presets-input"
                />
                <button
                  type="button"
                  onClick={handleImportClick}
                  data-testid="import-presets-btn"
                  title={t('customPresets.importButton')}
                  aria-label={t('customPresets.importButton')}
                  className="inline-flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-all shadow-sm active:scale-95"
                >
                  <Upload className="h-3 w-3 text-cyan-400" />
                  <span className="hidden sm:inline">{t('customPresets.importButton')}</span>
                </button>
              </>
            )}

            {isPro ? (
              onOpenSaveCustomPreset && (
                <button
                  type="button"
                  onClick={onOpenSaveCustomPreset}
                  aria-label={t('customPresets.saveAria')}
                  className="inline-flex items-center space-x-1 rounded-lg border border-cyan-500/50 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-900/50 hover:text-white transition-all shadow-sm active:scale-95"
                >
                  <Plus className="h-3 w-3" />
                  <span>{t('customPresets.saveButton')}</span>
                </button>
              )
            ) : (
              onOpenPricing && (
                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="text-[11px] font-semibold text-cyan-400 hover:underline"
                >
                  {t('pro.upgrade')}
                </button>
              )
            )}
          </div>
        </div>

        {importNotification && (
          <div
            data-testid="preset-import-notification"
            className={`rounded-lg p-2 text-xs font-medium ${
              importNotification.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
            }`}
          >
            {importNotification.message}
          </div>
        )}

        {customPresets.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {customPresets.map((preset) => (
              <div
                key={preset.id}
                className="group relative flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 hover:border-slate-700 transition-all"
              >
                <button
                  type="button"
                  onClick={() => onSelectCustomPreset && onSelectCustomPreset(preset)}
                  aria-label={t('customPresets.loadAria', { name: preset.name })}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                      {preset.name}
                    </span>
                    <span className="rounded bg-slate-800 px-1 py-0.2 font-mono text-[9px] text-cyan-400">
                      {preset.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[200px]">
                    {preset.description}
                  </p>
                </button>

                {onDeleteCustomPreset && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomPreset(preset.id)}
                    aria-label={t('customPresets.deleteAria', { name: preset.name })}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 italic">
            {t('customPresets.noPresets')}
          </p>
        )}
      </div>
    </div>
  );
};
