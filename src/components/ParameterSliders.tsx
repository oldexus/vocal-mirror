import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  Flame,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
} from 'lucide-react';
import { DSPParameters } from '../types/audio';
import {
  PARAMETER_LIMITS,
  DEFAULT_DSP_PARAMS,
} from '../audio/constants';
import { useTranslation } from '../i18n';

export const FREE_DSP_PARAMS: ReadonlySet<keyof DSPParameters> = new Set([
  'lowShelfGain',
  'mandibleResGain',
  'sinusResGain',
  'masterGain',
]);

export interface ParameterSlidersProps {
  /** Active 16-parameter DSP parameters */
  params?: DSPParameters;
  /** Callback fired whenever any slider value changes */
  onChangeParam?: <K extends keyof DSPParameters>(key: K, value: DSPParameters[K]) => void;
  /** Alias for onChangeParam */
  onParamChange?: <K extends keyof DSPParameters>(key: K, value: DSPParameters[K]) => void;
  /** Reset an individual parameter to default */
  onResetParam?: (key: keyof DSPParameters) => void;
  /** Reset all parameters across all sections to defaults */
  onResetAll?: () => void;
  /** Disables interactions */
  disabled?: boolean;
  /** Whether Pro tier is active */
  isPro?: boolean;
  /** Callback to open pricing modal */
  onOpenPricing?: () => void;
}

interface SliderRowProps {
  paramKey: keyof DSPParameters;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  label: string;
  description: string;
  defaultVal: number;
  onChange: (val: number) => void;
  onReset: () => void;
  disabled?: boolean;
  isProLocked?: boolean;
  onProLockClick?: () => void;
}

const SliderRow: React.FC<SliderRowProps> = ({
  paramKey,
  value,
  min,
  max,
  step,
  unit,
  label,
  description,
  defaultVal,
  onChange,
  onReset,
  disabled = false,
  isProLocked = false,
  onProLockClick,
}) => {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);
  const isModified = Math.abs(value - defaultVal) > 0.001;
  const progressPercent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const localizedLabel = t(`parameters.labels.${paramKey}`) || label;
  const localizedDesc = t(`parameters.descriptions.${paramKey}`) || description;

  const formatValueDisplay = (v: number, u: string): string => {
    if (u === 'dB') {
      return `${v >= 0 ? '+' : ''}${v.toFixed(1)} dB`;
    }
    if (u === 'Hz') {
      return `${Math.round(v)} Hz`;
    }
    if (u === 'Q') {
      return `Q: ${v.toFixed(2)}`;
    }
    return `${v} ${u}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
    if (isProLocked) {
      if (onProLockClick) onProLockClick();
      return;
    }
    const val = parseFloat((e.target as HTMLInputElement).value);
    onChange(val);
  };

  return (
    <div className="space-y-1.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 transition-colors hover:border-slate-700/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-semibold text-slate-200">{localizedLabel}</span>
          {isProLocked && (
            <button
              type="button"
              onClick={onProLockClick}
              title={t('pro.unlockPrompt') || 'PRO — Click to unlock'}
              aria-label={`${localizedLabel} PRO lock`}
              className="inline-flex items-center space-x-0.5 rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              <Lock className="h-2.5 w-2.5 text-amber-400" />
              <span>PRO</span>
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              aria-label={t('parameters.row.descAria', { label: localizedLabel })}
              className="text-slate-500 hover:text-slate-300 focus:outline-none"
            >
              <Info className="h-3 w-3" />
            </button>
            {showTooltip && (
              <div className="absolute left-0 top-5 z-50 w-60 rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-[11px] text-slate-300 shadow-2xl">
                {localizedDesc}
              </div>
            )}
          </div>
        </div>

        {/* Live Value Badge & Reset Icon */}
        <div className="flex items-center space-x-2">
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300">
            {formatValueDisplay(value, unit)}
          </span>
          {isModified && (
            <button
              type="button"
              onClick={onReset}
              disabled={disabled || isProLocked}
              aria-label={t('parameters.row.resetAria', { label: localizedLabel })}
              title={t('parameters.row.resetTitle', { label: localizedLabel, default: formatValueDisplay(defaultVal, unit) })}
              className="text-slate-500 hover:text-cyan-400 focus:outline-none transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Slider Track */}
      <div
        className="flex items-center space-x-2.5"
        onClick={isProLocked ? onProLockClick : undefined}
      >
        <span className="font-mono text-[10px] text-slate-500 w-10 text-right">
          {min}{unit === 'dB' ? '' : unit}
        </span>
        <input
          type="range"
          name={paramKey}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInputChange}
          onInput={handleInputChange}
          disabled={disabled || isProLocked}
          aria-label={localizedLabel}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-40"
          style={{
            background: isProLocked
              ? `linear-gradient(to right, #64748b 0%, #64748b ${progressPercent}%, #334155 ${progressPercent}%, #334155 100%)`
              : `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${progressPercent}%, #334155 ${progressPercent}%, #334155 100%)`,
          }}
        />
        <span className="font-mono text-[10px] text-slate-500 w-10">
          {max}{unit === 'dB' ? '' : unit}
        </span>
      </div>
    </div>
  );
};

export const ParameterSliders: React.FC<ParameterSlidersProps> = ({
  params = DEFAULT_DSP_PARAMS,
  onChangeParam,
  onParamChange,
  onResetParam,
  onResetAll,
  disabled = false,
  isPro = false,
  onOpenPricing,
}) => {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isParamLocked = (key: keyof DSPParameters) => !isPro && !FREE_DSP_PARAMS.has(key);

  const handleChange = <K extends keyof DSPParameters>(key: K, value: DSPParameters[K]) => {
    if (isParamLocked(key)) {
      if (onOpenPricing) onOpenPricing();
      return;
    }
    if (onChangeParam) {
      onChangeParam(key, value);
    }
    if (onParamChange) {
      onParamChange(key, value);
    }
  };

  const handleReset = (key: keyof DSPParameters) => {
    if (isParamLocked(key)) {
      if (onOpenPricing) onOpenPricing();
      return;
    }
    if (onResetParam) {
      onResetParam(key);
    } else {
      handleChange(key, DEFAULT_DSP_PARAMS[key]);
    }
  };

  return (
    <section className="w-full space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Sliders className="h-5 w-5 text-cyan-400" />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                {t('parameters.header.title')}
              </h2>
              {isPro ? (
                <span className="inline-flex items-center space-x-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>PRO</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="inline-flex items-center space-x-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>{t('pro.upgrade')}</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {t('parameters.header.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-white transition-all"
          >
            <span>{showAdvanced ? t('parameters.header.hideAdvanced') : t('parameters.header.showAdvanced')}</span>
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {onResetAll && (
            <button
              type="button"
              onClick={onResetAll}
              disabled={disabled}
              className="flex items-center space-x-1 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('parameters.header.resetAll')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Sliders Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Column 1: Low-Frequency Bone & Mandibular Conduction */}
        <div className="space-y-4">
          <div className="border-b border-slate-800/60 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
              <Flame className="h-3.5 w-3.5" />
              <span>{t('parameters.sections.chest.title')}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {t('parameters.sections.chest.subtitle')}
            </p>
          </div>

          <div className="space-y-3">
            {/* Low-Shelf Boost Gain */}
            <SliderRow
              paramKey="lowShelfGain"
              value={params.lowShelfGain}
              min={PARAMETER_LIMITS.lowShelfGain.min}
              max={PARAMETER_LIMITS.lowShelfGain.max}
              step={PARAMETER_LIMITS.lowShelfGain.step}
              unit={PARAMETER_LIMITS.lowShelfGain.unit}
              label={PARAMETER_LIMITS.lowShelfGain.label}
              description={PARAMETER_LIMITS.lowShelfGain.description}
              defaultVal={PARAMETER_LIMITS.lowShelfGain.default}
              onChange={(val) => handleChange('lowShelfGain', val)}
              onReset={() => handleReset('lowShelfGain')}
              disabled={disabled}
              isProLocked={isParamLocked('lowShelfGain')}
              onProLockClick={onOpenPricing}
            />

            {/* Low-Shelf Frequency */}
            <SliderRow
              paramKey="lowShelfFreq"
              value={params.lowShelfFreq}
              min={PARAMETER_LIMITS.lowShelfFreq.min}
              max={PARAMETER_LIMITS.lowShelfFreq.max}
              step={PARAMETER_LIMITS.lowShelfFreq.step}
              unit={PARAMETER_LIMITS.lowShelfFreq.unit}
              label={PARAMETER_LIMITS.lowShelfFreq.label}
              description={PARAMETER_LIMITS.lowShelfFreq.description}
              defaultVal={PARAMETER_LIMITS.lowShelfFreq.default}
              onChange={(val) => handleChange('lowShelfFreq', val)}
              onReset={() => handleReset('lowShelfFreq')}
              disabled={disabled}
              isProLocked={isParamLocked('lowShelfFreq')}
              onProLockClick={onOpenPricing}
            />

            {/* Mandible Jaw Gain */}
            <SliderRow
              paramKey="mandibleResGain"
              value={params.mandibleResGain}
              min={PARAMETER_LIMITS.mandibleResGain.min}
              max={PARAMETER_LIMITS.mandibleResGain.max}
              step={PARAMETER_LIMITS.mandibleResGain.step}
              unit={PARAMETER_LIMITS.mandibleResGain.unit}
              label={PARAMETER_LIMITS.mandibleResGain.label}
              description={PARAMETER_LIMITS.mandibleResGain.description}
              defaultVal={PARAMETER_LIMITS.mandibleResGain.default}
              onChange={(val) => handleChange('mandibleResGain', val)}
              onReset={() => handleReset('mandibleResGain')}
              disabled={disabled}
              isProLocked={isParamLocked('mandibleResGain')}
              onProLockClick={onOpenPricing}
            />

            {/* Mandible Jaw Frequency */}
            <SliderRow
              paramKey="mandibleResFreq"
              value={params.mandibleResFreq}
              min={PARAMETER_LIMITS.mandibleResFreq.min}
              max={PARAMETER_LIMITS.mandibleResFreq.max}
              step={PARAMETER_LIMITS.mandibleResFreq.step}
              unit={PARAMETER_LIMITS.mandibleResFreq.unit}
              label={PARAMETER_LIMITS.mandibleResFreq.label}
              description={PARAMETER_LIMITS.mandibleResFreq.description}
              defaultVal={PARAMETER_LIMITS.mandibleResFreq.default}
              onChange={(val) => handleChange('mandibleResFreq', val)}
              onReset={() => handleReset('mandibleResFreq')}
              disabled={disabled}
              isProLocked={isParamLocked('mandibleResFreq')}
              onProLockClick={onOpenPricing}
            />

            {/* Mandible Jaw Q */}
            <SliderRow
              paramKey="mandibleResQ"
              value={params.mandibleResQ}
              min={PARAMETER_LIMITS.mandibleResQ.min}
              max={PARAMETER_LIMITS.mandibleResQ.max}
              step={PARAMETER_LIMITS.mandibleResQ.step}
              unit={PARAMETER_LIMITS.mandibleResQ.unit}
              label={PARAMETER_LIMITS.mandibleResQ.label}
              description={PARAMETER_LIMITS.mandibleResQ.description}
              defaultVal={PARAMETER_LIMITS.mandibleResQ.default}
              onChange={(val) => handleChange('mandibleResQ', val)}
              onReset={() => handleReset('mandibleResQ')}
              disabled={disabled}
              isProLocked={isParamLocked('mandibleResQ')}
              onProLockClick={onOpenPricing}
            />
          </div>
        </div>

        {/* Column 2: Cavity Resonance, Tissue Damping & Master */}
        <div className="space-y-4">
          <div className="border-b border-slate-800/60 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center space-x-1.5">
              <Zap className="h-3.5 w-3.5" />
              <span>{t('parameters.sections.cavity.title')}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {t('parameters.sections.cavity.subtitle')}
            </p>
          </div>

          <div className="space-y-3">
            {/* Sinus Cavity Gain */}
            <SliderRow
              paramKey="sinusResGain"
              value={params.sinusResGain}
              min={PARAMETER_LIMITS.sinusResGain.min}
              max={PARAMETER_LIMITS.sinusResGain.max}
              step={PARAMETER_LIMITS.sinusResGain.step}
              unit={PARAMETER_LIMITS.sinusResGain.unit}
              label={PARAMETER_LIMITS.sinusResGain.label}
              description={PARAMETER_LIMITS.sinusResGain.description}
              defaultVal={PARAMETER_LIMITS.sinusResGain.default}
              onChange={(val) => handleChange('sinusResGain', val)}
              onReset={() => handleReset('sinusResGain')}
              disabled={disabled}
              isProLocked={isParamLocked('sinusResGain')}
              onProLockClick={onOpenPricing}
            />

            {/* Cranial Tissue Damping Cutoff */}
            <SliderRow
              paramKey="tissueCutoffFreq"
              value={params.tissueCutoffFreq}
              min={PARAMETER_LIMITS.tissueCutoffFreq.min}
              max={PARAMETER_LIMITS.tissueCutoffFreq.max}
              step={PARAMETER_LIMITS.tissueCutoffFreq.step}
              unit={PARAMETER_LIMITS.tissueCutoffFreq.unit}
              label={PARAMETER_LIMITS.tissueCutoffFreq.label}
              description={PARAMETER_LIMITS.tissueCutoffFreq.description}
              defaultVal={PARAMETER_LIMITS.tissueCutoffFreq.default}
              onChange={(val) => handleChange('tissueCutoffFreq', val)}
              onReset={() => handleReset('tissueCutoffFreq')}
              disabled={disabled}
              isProLocked={isParamLocked('tissueCutoffFreq')}
              onProLockClick={onOpenPricing}
            />

            {/* High-Shelf Air Sibilance Damping */}
            <SliderRow
              paramKey="highShelfGain"
              value={params.highShelfGain}
              min={PARAMETER_LIMITS.highShelfGain.min}
              max={PARAMETER_LIMITS.highShelfGain.max}
              step={PARAMETER_LIMITS.highShelfGain.step}
              unit={PARAMETER_LIMITS.highShelfGain.unit}
              label={PARAMETER_LIMITS.highShelfGain.label}
              description={PARAMETER_LIMITS.highShelfGain.description}
              defaultVal={PARAMETER_LIMITS.highShelfGain.default}
              onChange={(val) => handleChange('highShelfGain', val)}
              onReset={() => handleReset('highShelfGain')}
              disabled={disabled}
              isProLocked={isParamLocked('highShelfGain')}
              onProLockClick={onOpenPricing}
            />

            {/* Advanced Filters */}
            {showAdvanced && (
              <>
                <SliderRow
                  paramKey="sinusResFreq"
                  value={params.sinusResFreq}
                  min={PARAMETER_LIMITS.sinusResFreq.min}
                  max={PARAMETER_LIMITS.sinusResFreq.max}
                  step={PARAMETER_LIMITS.sinusResFreq.step}
                  unit={PARAMETER_LIMITS.sinusResFreq.unit}
                  label={PARAMETER_LIMITS.sinusResFreq.label}
                  description={PARAMETER_LIMITS.sinusResFreq.description}
                  defaultVal={PARAMETER_LIMITS.sinusResFreq.default}
                  onChange={(val) => handleChange('sinusResFreq', val)}
                  onReset={() => handleReset('sinusResFreq')}
                  disabled={disabled}
                  isProLocked={isParamLocked('sinusResFreq')}
                  onProLockClick={onOpenPricing}
                />
                <SliderRow
                  paramKey="sinusResQ"
                  value={params.sinusResQ}
                  min={PARAMETER_LIMITS.sinusResQ.min}
                  max={PARAMETER_LIMITS.sinusResQ.max}
                  step={PARAMETER_LIMITS.sinusResQ.step}
                  unit={PARAMETER_LIMITS.sinusResQ.unit}
                  label={PARAMETER_LIMITS.sinusResQ.label}
                  description={PARAMETER_LIMITS.sinusResQ.description}
                  defaultVal={PARAMETER_LIMITS.sinusResQ.default}
                  onChange={(val) => handleChange('sinusResQ', val)}
                  onReset={() => handleReset('sinusResQ')}
                  disabled={disabled}
                  isProLocked={isParamLocked('sinusResQ')}
                  onProLockClick={onOpenPricing}
                />
                <SliderRow
                  paramKey="antiResGain"
                  value={params.antiResGain}
                  min={PARAMETER_LIMITS.antiResGain.min}
                  max={PARAMETER_LIMITS.antiResGain.max}
                  step={PARAMETER_LIMITS.antiResGain.step}
                  unit={PARAMETER_LIMITS.antiResGain.unit}
                  label={PARAMETER_LIMITS.antiResGain.label}
                  description={PARAMETER_LIMITS.antiResGain.description}
                  defaultVal={PARAMETER_LIMITS.antiResGain.default}
                  onChange={(val) => handleChange('antiResGain', val)}
                  onReset={() => handleReset('antiResGain')}
                  disabled={disabled}
                  isProLocked={isParamLocked('antiResGain')}
                  onProLockClick={onOpenPricing}
                />
                <SliderRow
                  paramKey="antiResFreq"
                  value={params.antiResFreq}
                  min={PARAMETER_LIMITS.antiResFreq.min}
                  max={PARAMETER_LIMITS.antiResFreq.max}
                  step={PARAMETER_LIMITS.antiResFreq.step}
                  unit={PARAMETER_LIMITS.antiResFreq.unit}
                  label={PARAMETER_LIMITS.antiResFreq.label}
                  description={PARAMETER_LIMITS.antiResFreq.description}
                  defaultVal={PARAMETER_LIMITS.antiResFreq.default}
                  onChange={(val) => handleChange('antiResFreq', val)}
                  onReset={() => handleReset('antiResFreq')}
                  disabled={disabled}
                  isProLocked={isParamLocked('antiResFreq')}
                  onProLockClick={onOpenPricing}
                />
                <SliderRow
                  paramKey="antiResQ"
                  value={params.antiResQ}
                  min={PARAMETER_LIMITS.antiResQ.min}
                  max={PARAMETER_LIMITS.antiResQ.max}
                  step={PARAMETER_LIMITS.antiResQ.step}
                  unit={PARAMETER_LIMITS.antiResQ.unit}
                  label={PARAMETER_LIMITS.antiResQ.label}
                  description={PARAMETER_LIMITS.antiResQ.description}
                  defaultVal={PARAMETER_LIMITS.antiResQ.default}
                  onChange={(val) => handleChange('antiResQ', val)}
                  onReset={() => handleReset('antiResQ')}
                  disabled={disabled}
                  isProLocked={isParamLocked('antiResQ')}
                  onProLockClick={onOpenPricing}
                />
                <SliderRow
                  paramKey="tissueCutoffQ"
                  value={params.tissueCutoffQ}
                  min={PARAMETER_LIMITS.tissueCutoffQ.min}
                  max={PARAMETER_LIMITS.tissueCutoffQ.max}
                  step={PARAMETER_LIMITS.tissueCutoffQ.step}
                  unit={PARAMETER_LIMITS.tissueCutoffQ.unit}
                  label={PARAMETER_LIMITS.tissueCutoffQ.label}
                  description={PARAMETER_LIMITS.tissueCutoffQ.description}
                  defaultVal={PARAMETER_LIMITS.tissueCutoffQ.default}
                  onChange={(val) => handleChange('tissueCutoffQ', val)}
                  onReset={() => handleReset('tissueCutoffQ')}
                  disabled={disabled}
                  isProLocked={isParamLocked('tissueCutoffQ')}
                  onProLockClick={onOpenPricing}
                />
                <SliderRow
                  paramKey="highShelfFreq"
                  value={params.highShelfFreq}
                  min={PARAMETER_LIMITS.highShelfFreq.min}
                  max={PARAMETER_LIMITS.highShelfFreq.max}
                  step={PARAMETER_LIMITS.highShelfFreq.step}
                  unit={PARAMETER_LIMITS.highShelfFreq.unit}
                  label={PARAMETER_LIMITS.highShelfFreq.label}
                  description={PARAMETER_LIMITS.highShelfFreq.description}
                  defaultVal={PARAMETER_LIMITS.highShelfFreq.default}
                  onChange={(val) => handleChange('highShelfFreq', val)}
                  onReset={() => handleReset('highShelfFreq')}
                  disabled={disabled}
                  isProLocked={isParamLocked('highShelfFreq')}
                  onProLockClick={onOpenPricing}
                />
              </>
            )}

            {/* Master Trim */}
            <SliderRow
              paramKey="masterGain"
              value={params.masterGain}
              min={PARAMETER_LIMITS.masterGain.min}
              max={PARAMETER_LIMITS.masterGain.max}
              step={PARAMETER_LIMITS.masterGain.step}
              unit={PARAMETER_LIMITS.masterGain.unit}
              label={PARAMETER_LIMITS.masterGain.label}
              description={PARAMETER_LIMITS.masterGain.description}
              defaultVal={PARAMETER_LIMITS.masterGain.default}
              onChange={(val) => handleChange('masterGain', val)}
              onReset={() => handleReset('masterGain')}
              disabled={disabled}
              isProLocked={isParamLocked('masterGain')}
              onProLockClick={onOpenPricing}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
