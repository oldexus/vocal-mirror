/**
 * VocalMirror — Psychoacoustic Guidance & Vocal Training Cards Component
 * 
 * Interactive educational module explaining Voice Confrontation physics,
 * acoustic filter pathways, and actionable vocal training exercises with
 * one-click studio preset integration.
 */

import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Play,
  CheckCircle2,
  HelpCircle,
  Activity,
  Volume2,
  Mic,
  Zap,
} from 'lucide-react';
import {
  PSYCHOACOUSTIC_OVERVIEW,
  VOCAL_TRAINING_CARDS,
  VocalTrainingCard,
  GuidanceItem,
} from '../constants/guidanceContent';
import { ListeningMode, PhysiologicalPresetKey } from '../types/audio';
import { useTranslation } from '../i18n';

export interface GuidanceCardsProps {
  items?: (VocalTrainingCard | GuidanceItem)[];
  activeMode?: ListeningMode;
  currentMode?: ListeningMode;
  activePreset?: PhysiologicalPresetKey | 'custom';
  onSelectMode?: (mode: ListeningMode) => void;
  onSelectPreset?: (preset: PhysiologicalPresetKey) => void;
  onApplyPreset?: (preset: PhysiologicalPresetKey) => void;
  className?: string;
}

const BAND_KEY_MAP: Record<number, string> = {
  0: 'subBass',
  1: 'mandible',
  2: 'formants',
  3: 'singers',
  4: 'sibilance',
};

export const GuidanceCards: React.FC<GuidanceCardsProps> = ({
  items,
  activeMode,
  currentMode,
  activePreset,
  onSelectMode,
  onSelectPreset,
  onApplyPreset,
  className = '',
}) => {
  const { t, isJapanese } = useTranslation();
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const resolvedMode = activeMode || currentMode || 'RAW';
  const displayItems = items !== undefined ? items : VOCAL_TRAINING_CARDS;

  const handleToggleCard = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ' || e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      handleToggleCard(id);
    }
  };

  const handleApplyPreset = (presetKey: PhysiologicalPresetKey) => {
    if (onApplyPreset) {
      onApplyPreset(presetKey);
    }
    if (onSelectPreset) {
      onSelectPreset(presetKey);
    }
  };

  const handleApplyMode = (mode: ListeningMode) => {
    if (onSelectMode) {
      onSelectMode(mode);
    }
  };

  // Helper to normalize card data whether passed as VocalTrainingCard or GuidanceItem
  const normalizeCard = (item: VocalTrainingCard | GuidanceItem, index: number) => {
    const isVocalCard = 'scientificExplanation' in item;
    const vocalItem = isVocalCard ? (item as VocalTrainingCard) : null;
    const guidanceItem = !isVocalCard ? (item as GuidanceItem) : null;

    const id = item.id;
    const indexNumber = vocalItem?.indexNumber || String(index + 1).padStart(2, '0');
    const isCustomPropItem = items !== undefined;
    
    // Resolve localized fields with fallback
    const title = isCustomPropItem ? item.title : (t(`guidance.cards.${id}.title`) || item.title);
    const japaneseTitle = isCustomPropItem
      ? (vocalItem?.japaneseTitle || '')
      : (isJapanese
          ? (t(`guidance.cards.${id}.japaneseTitle`) || vocalItem?.japaneseTitle || '')
          : (vocalItem?.japaneseTitle || ''));
    const category = isCustomPropItem
      ? (vocalItem?.category || guidanceItem?.category || guidanceItem?.categoryLabel || 'Acoustics')
      : (t(`guidance.cards.${id}.category`) || vocalItem?.category || guidanceItem?.category || 'Acoustics');
    const badgeColor =
      vocalItem?.badgeColor ||
      'border-indigo-500/40 bg-indigo-500/10 text-indigo-300';
    const targetFrequency = isCustomPropItem
      ? (vocalItem?.targetFrequency || '100 - 300 Hz')
      : (t(`guidance.cards.${id}.targetFrequency`) || vocalItem?.targetFrequency || '100 - 300 Hz');
    const tagline = isCustomPropItem
      ? (vocalItem?.tagline || guidanceItem?.shortSummary || '')
      : (t(`guidance.cards.${id}.tagline`) || vocalItem?.tagline || guidanceItem?.shortSummary || '');
    const description = isCustomPropItem
      ? (vocalItem?.scientificExplanation || guidanceItem?.expandedContent?.description || '')
      : (t(`guidance.cards.${id}.scientificExplanation`) ||
         vocalItem?.scientificExplanation ||
         guidanceItem?.expandedContent?.description ||
         '');

    const rawSteps = !isCustomPropItem
      ? [
          t(`guidance.cards.${id}.exercise.step1`),
          t(`guidance.cards.${id}.exercise.step2`),
          t(`guidance.cards.${id}.exercise.step3`),
          t(`guidance.cards.${id}.exercise.step4`),
        ].filter((s) => s && !s.startsWith('guidance.cards.'))
      : [];

    const keyPoints = isCustomPropItem
      ? (guidanceItem?.expandedContent?.keyPoints || vocalItem?.practicalExercise?.steps || [])
      : (rawSteps.length > 0
          ? rawSteps
          : guidanceItem?.expandedContent?.keyPoints ||
            vocalItem?.practicalExercise?.steps ||
            []);

    const acousticTip = isCustomPropItem
      ? (guidanceItem?.expandedContent?.acousticTip || vocalItem?.practicalExercise?.proTip || '')
      : (t(`guidance.cards.${id}.exercise.proTip`) ||
         guidanceItem?.expandedContent?.acousticTip ||
         vocalItem?.practicalExercise?.proTip ||
         '');

    const actionPreset =
      guidanceItem?.expandedContent?.actionPreset ||
      vocalItem?.studioIntegration?.recommendedPreset;

    const actionLabel = isCustomPropItem
      ? (guidanceItem?.expandedContent?.actionLabel || vocalItem?.studioIntegration?.actionLabel || 'Apply Preset')
      : (t(`guidance.cards.${id}.studio.actionLabel`) ||
         guidanceItem?.expandedContent?.actionLabel ||
         vocalItem?.studioIntegration?.actionLabel ||
         'Apply Preset');

    const recommendedMode = vocalItem?.studioIntegration?.recommendedMode;
    const keyTakeaway = isCustomPropItem
      ? (vocalItem?.keyTakeaway || '')
      : (t(`guidance.cards.${id}.keyTakeaway`) || vocalItem?.keyTakeaway || '');

    const practicalExercise = vocalItem?.practicalExercise
      ? {
          name: isCustomPropItem
            ? vocalItem.practicalExercise.name
            : (t(`guidance.cards.${id}.exercise.name`) || vocalItem.practicalExercise.name),
          objective: isCustomPropItem
            ? vocalItem.practicalExercise.objective
            : (t(`guidance.cards.${id}.exercise.objective`) || vocalItem.practicalExercise.objective),
          steps: keyPoints,
          proTip: acousticTip,
        }
      : null;

    return {
      id,
      indexNumber,
      title,
      japaneseTitle,
      category,
      badgeColor,
      targetFrequency,
      tagline,
      description,
      keyPoints,
      acousticTip,
      actionPreset,
      actionLabel,
      recommendedMode,
      keyTakeaway,
      practicalExercise,
    };
  };

  return (
    <section
      aria-label="Psychoacoustic Guidance & Vocal Training"
      className={`w-full space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* 1. Header & Overview Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 shadow-md shadow-indigo-950/40">
            <BookOpen className="h-4 w-4 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white sm:text-base flex items-center space-x-2">
              <span>{t('guidance.header.title')}</span>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                {t('guidance.header.badge')}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {t('guidance.header.subtitle')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOverviewOpen(!isOverviewOpen)}
          aria-expanded={isOverviewOpen}
          aria-label={t('guidance.header.toggleAria')}
          className="flex items-center space-x-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:bg-slate-700/80 transition-all"
        >
          <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
          <span>{isOverviewOpen ? t('guidance.header.toggleOpen') : t('guidance.header.toggleClose')}</span>
          {isOverviewOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* 2. Collapsible Deep-Dive Psychoacoustic Overview */}
      {isOverviewOpen && (
        <div
          data-testid="psychoacoustic-overview-drawer"
          className="rounded-xl border border-indigo-900/50 bg-indigo-950/30 p-4 text-xs text-slate-300 space-y-4 animate-fade-in"
        >
          <div className="space-y-1">
            <h3 className="font-bold text-sm flex items-center space-x-2 text-indigo-300">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>{t('guidance.overview.title') || PSYCHOACOUSTIC_OVERVIEW.title}</span>
            </h3>
            <p className="text-slate-300 leading-relaxed">
              {t('guidance.overview.summary') || PSYCHOACOUSTIC_OVERVIEW.summary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {/* Bone Path */}
            <div className="rounded-lg bg-slate-900/80 p-3 border border-cyan-900/40 space-y-1.5">
              <div className="font-bold text-cyan-300 flex items-center space-x-1.5">
                <Volume2 className="h-3.5 w-3.5" />
                <span>{t('guidance.overview.bonePath.title') || PSYCHOACOUSTIC_OVERVIEW.boneConductionPath.title}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {t('guidance.overview.bonePath.anatomy') || PSYCHOACOUSTIC_OVERVIEW.boneConductionPath.anatomy}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {t('guidance.overview.bonePath.physics') || PSYCHOACOUSTIC_OVERVIEW.boneConductionPath.physics}
              </p>
            </div>

            {/* Air Path */}
            <div className="rounded-lg bg-slate-900/80 p-3 border border-amber-900/40 space-y-1.5">
              <div className="font-bold text-amber-300 flex items-center space-x-1.5">
                <Mic className="h-3.5 w-3.5" />
                <span>{t('guidance.overview.airPath.title') || PSYCHOACOUSTIC_OVERVIEW.airConductionPath.title}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {t('guidance.overview.airPath.anatomy') || PSYCHOACOUSTIC_OVERVIEW.airConductionPath.anatomy}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {t('guidance.overview.airPath.physics') || PSYCHOACOUSTIC_OVERVIEW.airConductionPath.physics}
              </p>
            </div>
          </div>

          {/* Frequency Table */}
          <div className="space-y-2 pt-2">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              {t('guidance.overview.table.title')}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1 px-2">{t('guidance.overview.table.colBand')}</th>
                    <th className="py-1 px-2">{t('guidance.overview.table.colRange')}</th>
                    <th className="py-1 px-2">{t('guidance.overview.table.colSource')}</th>
                    <th className="py-1 px-2">{t('guidance.overview.table.colShift')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {PSYCHOACOUSTIC_OVERVIEW.frequencyBands.map((f, i) => {
                    const bKey = BAND_KEY_MAP[i];
                    const bandName = bKey ? t(`guidance.overview.table.bands.${bKey}.name`) || f.band : f.band;
                    const bandRange = bKey ? t(`guidance.overview.table.bands.${bKey}.range`) || f.rangeHz : f.rangeHz;
                    const bandSource = bKey ? t(`guidance.overview.table.bands.${bKey}.source`) || f.anatomicalSource : f.anatomicalSource;
                    const bandDelta = bKey ? t(`guidance.overview.table.bands.${bKey}.delta`) || f.boneVsAirDelta : f.boneVsAirDelta;

                    return (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="py-1.5 px-2 font-medium text-slate-200">{bandName}</td>
                        <td className="py-1.5 px-2 font-mono text-cyan-300">{bandRange}</td>
                        <td className="py-1.5 px-2 text-slate-400">{bandSource}</td>
                        <td className="py-1.5 px-2 text-amber-200/90">{bandDelta}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Interactive Training Cards Grid */}
      {displayItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayItems.map((rawItem, idx) => {
            const card = normalizeCard(rawItem, idx);
            const isExpanded = expandedCardId === card.id;
            const isCurrentActive =
              (card.recommendedMode && resolvedMode === card.recommendedMode) ||
              (card.actionPreset && activePreset === card.actionPreset);

            return (
              <div
                key={card.id}
                data-testid={`guidance-card-${card.id}`}
                className={`rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isExpanded
                    ? 'border-slate-700 bg-slate-900/95 shadow-xl shadow-slate-950/50'
                    : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700/80 hover:bg-slate-900/80'
                }`}
              >
                {/* Card Header (Clickable & Accessible Accordion Header) */}
                <button
                  type="button"
                  onClick={() => handleToggleCard(card.id)}
                  onKeyDown={(e) => handleHeaderKeyDown(e, card.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`content-${card.id}`}
                  className="w-full text-left p-4 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded-t-xl"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-black text-slate-500">
                        {card.indexNumber}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${card.badgeColor}`}
                      >
                        {card.category}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                        {card.targetFrequency}
                      </span>
                      <span className="text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-2.5 text-sm font-bold text-white tracking-tight">
                    {card.title}
                  </h3>
                  {card.japaneseTitle && (
                    <div className="text-[11px] font-medium text-slate-400">
                      {card.japaneseTitle}
                    </div>
                  )}
                  {card.tagline && (
                    <p className="mt-1 text-xs text-slate-300 font-medium leading-snug">
                      {card.tagline}
                    </p>
                  )}
                </button>

                {/* Card Collapsible Body */}
                {isExpanded && (
                  <div
                    id={`content-${card.id}`}
                    data-testid="expanded-content"
                    className="px-4 pb-4 space-y-3.5 border-t border-slate-800/70 pt-3 text-xs animate-fade-in"
                  >
                    {/* Scientific Breakdown */}
                    {card.description && (
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                          <Activity className="h-3 w-3 text-cyan-400" />
                          <span>{t('guidance.ui.mechanismTitle')}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          {card.description}
                        </p>
                      </div>
                    )}

                    {/* Practical Exercise Box or Key Points List */}
                    {card.practicalExercise ? (
                      <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-emerald-400">
                          <span className="font-bold text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{t('guidance.ui.exerciseTitle', { name: card.practicalExercise.name })}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic">
                          {card.practicalExercise.objective}
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                          {card.practicalExercise.steps.map((step, sIdx) => (
                            <li key={sIdx} className="leading-snug">
                              {step}
                            </li>
                          ))}
                        </ol>
                        {card.practicalExercise.proTip && (
                          <div
                            data-testid="acoustic-tip-box"
                            className="rounded bg-emerald-950/30 border border-emerald-900/30 p-2 text-[10px] text-emerald-200"
                          >
                            <strong>{t('guidance.ui.proTipLabel')}</strong> {card.practicalExercise.proTip}
                          </div>
                        )}
                      </div>
                    ) : card.keyPoints.length > 0 ? (
                      <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800 space-y-2">
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                          {card.keyPoints.map((point, pIdx) => (
                            <li key={pIdx} className="leading-snug">
                              {point}
                            </li>
                          ))}
                        </ul>
                        {card.acousticTip && (
                          <div
                            data-testid="acoustic-tip-box"
                            className="rounded bg-emerald-950/30 border border-emerald-900/30 p-2 text-[10px] text-emerald-200"
                          >
                            <strong>{t('guidance.ui.acousticTipLabel')}</strong> {card.acousticTip}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Key Takeaway */}
                    {card.keyTakeaway && (
                      <div className="rounded-lg bg-indigo-950/20 border border-indigo-900/30 p-2.5 text-[11px] text-indigo-200 flex items-start space-x-2">
                        <Zap className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>{t('guidance.ui.keyInsightLabel')}</strong> {card.keyTakeaway}
                        </span>
                      </div>
                    )}

                    {/* Studio Integration Action Triggers */}
                    <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                        {card.recommendedMode && (
                          <span>
                            {t('guidance.ui.targetModeLabel')}{' '}
                            <span className="text-cyan-300 font-bold">
                              {card.recommendedMode}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {card.recommendedMode && (
                          <button
                            type="button"
                            data-testid={`action-mode-${card.id}`}
                            onClick={() => handleApplyMode(card.recommendedMode!)}
                            className="flex items-center space-x-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-300 hover:bg-sky-500/20 active:scale-95 transition-all"
                          >
                            <span>{t('guidance.ui.switchToMode', { mode: card.recommendedMode })}</span>
                          </button>
                        )}

                        {card.actionPreset && (
                          <button
                            type="button"
                            data-testid={`action-preset-${card.id}`}
                            onClick={() => {
                              handleApplyPreset(card.actionPreset!);
                              if (card.recommendedMode) {
                                handleApplyMode(card.recommendedMode);
                              }
                            }}
                            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                              isCurrentActive
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                                : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 hover:text-white'
                            }`}
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>
                              {isCurrentActive ? t('guidance.ui.activeInStudio') : card.actionLabel}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
