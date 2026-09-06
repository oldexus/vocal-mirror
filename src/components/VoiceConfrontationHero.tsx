/**
 * VocalMirror — Voice Confrontation Hero & Educational Banner Component
 * 
 * Explains the cranial bone vs airborne conduction acoustic gap in 30 seconds
 * to convert visitors and orient new users.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  Activity,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from '../i18n';

export interface VoiceConfrontationHeroProps {
  onOpenGuidance?: () => void;
  onOpenPricing?: () => void;
  isPro?: boolean;
}

const HERO_DISMISS_KEY = 'vocalmirror_hero_dismissed';

export const VoiceConfrontationHero: React.FC<VoiceConfrontationHeroProps> = ({
  onOpenGuidance,
  onOpenPricing,
  isPro = false,
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(HERO_DISMISS_KEY);
      if (dismissed === 'true') {
        setIsVisible(false);
      }
    } catch {
      // Ignore sessionStorage restriction
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem(HERO_DISMISS_KEY, 'true');
    } catch {
      // Ignore
    }
  };

  if (!isVisible) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-4 sm:p-5 shadow-lg backdrop-blur-md">
      {/* Decorative background glow */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Explainer Pitch */}
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
              <Activity className="h-3 w-3 text-cyan-400" />
              <span>{t('hero.badge')}</span>
            </span>
            <span className="text-[11px] font-semibold text-teal-400">
              {t('hero.highlight')}
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
            {t('hero.title')}
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            {t('hero.subtitle')}
          </p>
        </div>

        {/* Right: Actions & Dismiss */}
        <div className="flex items-center space-x-2.5 shrink-0 self-start md:self-center">
          {onOpenGuidance && (
            <button
              type="button"
              onClick={onOpenGuidance}
              className="inline-flex items-center space-x-1.5 rounded-xl border border-cyan-500/50 bg-cyan-950/40 px-3.5 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-900/50 hover:text-white transition-all shadow-sm active:scale-95"
            >
              <span>{t('hero.exploreButton')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {!isPro && onOpenPricing && (
            <button
              type="button"
              onClick={onOpenPricing}
              className="inline-flex items-center space-x-1 rounded-xl bg-gradient-to-r from-amber-400 to-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:brightness-110 shadow-md transition-all active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5 text-slate-950" />
              <span>PRO</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t('hero.dismissAria')}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
