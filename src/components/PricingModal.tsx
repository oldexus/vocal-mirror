/**
 * VocalMirror — Pro Pricing & Licensing Modal Component
 * 
 * Provides Stripe checkout navigation, offline license key activation,
 * feature comparison, and instantaneous developer/reviewer demo access.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  Check,
  ShieldCheck,
  Zap,
  Key,
  ExternalLink,
  Award,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { UseProPlanReturn } from '../hooks/useProPlan';

export interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  proPlan: UseProPlanReturn;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  proPlan,
}) => {
  const { t, isJapanese } = useTranslation();
  const [licenseInput, setLicenseInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
  const [currency, setCurrency] = useState<'JPY' | 'USD'>(isJapanese ? 'JPY' : 'USD');

  useEffect(() => {
    setCurrency(isJapanese ? 'JPY' : 'USD');
  }, [isJapanese]);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setLicenseInput(proPlan.licenseRecord.licenseKey || '');
      setFeedback({ type: null, message: '' });
    }
  }, [isOpen, proPlan.licenseRecord.licenseKey]);

  // Escape key handler
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

  const stripeMonthlyUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_STRIPE_MONTHLY_URL) ||
    'https://buy.stripe.com/test_vocalmirror_monthly';
  const stripeLifetimeUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_STRIPE_LIFETIME_URL) ||
    'https://buy.stripe.com/test_vocalmirror_lifetime';

  const handleActivateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) return;

    const res = proPlan.activateKey(licenseInput);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: t('pricing.licenseInput.success'),
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.message || t('pricing.licenseInput.invalid'),
      });
    }
  };

  const handleInstantDemo = () => {
    proPlan.activateDemo();
    setLicenseInput('VOCALMIRROR-PRO-DEMO');
    setFeedback({
      type: 'success',
      message: t('pricing.licenseInput.success'),
    });
  };

  const handleDeactivate = () => {
    proPlan.deactivate();
    setLicenseInput('');
    setFeedback({
      type: null,
      message: '',
    });
  };

  const handleStripeCheckout = (url: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-fade-in overflow-y-auto"
      data-testid="pricing-modal-backdrop"
    >
      <div className="relative my-8 w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6">
        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('pricing.closeAria')}
          data-testid="pricing-close-btn"
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto pt-2">
          <div className="inline-flex items-center space-x-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>{t('pricing.badge')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t('pricing.title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {t('pricing.subtitle')}
          </p>

          {/* Currency Switcher */}
          <div className="pt-2 flex items-center justify-center space-x-3 text-xs">
            <span className="text-slate-400 font-medium">Currency:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setCurrency('JPY')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  currency === 'JPY' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                JPY (¥)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  currency === 'USD' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Plan 1: Pro Monthly */}
          <div className="relative rounded-2xl border border-slate-800 bg-slate-950/60 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  {t('pricing.monthlyPlan.name')}
                </h3>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-400">
                  Subscription
                </span>
              </div>
              <div className="mt-4 flex items-baseline space-x-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-white">
                  {currency === 'JPY' ? '¥980' : '$7.99'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {t('pricing.monthlyPlan.period')}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {t('pricing.monthlyPlan.desc')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleStripeCheckout(stripeMonthlyUrl)}
              className="w-full inline-flex items-center justify-center space-x-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-4 py-3 text-sm font-bold text-cyan-300 hover:bg-cyan-900/50 hover:text-white hover:border-cyan-400 transition-all shadow-lg active:scale-95"
            >
              <span>{t('pricing.monthlyPlan.cta')}</span>
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>

          {/* Plan 2: Pro Lifetime (Hero Card) */}
          <div className="relative rounded-2xl border-2 border-cyan-500/80 bg-gradient-to-b from-cyan-950/30 to-slate-950/80 p-6 flex flex-col justify-between space-y-4 shadow-xl shadow-cyan-950/50 ring-1 ring-cyan-400/40">
            <div className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-amber-400 to-cyan-400 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-md">
              {t('pricing.lifetimePlan.badge')}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>{t('pricing.lifetimePlan.name')}</span>
                  <Award className="h-4 w-4 text-amber-400" />
                </h3>
              </div>
              <div className="mt-4 flex items-baseline space-x-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-cyan-300">
                  {currency === 'JPY' ? '¥4,980' : '$39.00'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {t('pricing.lifetimePlan.period')}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                {t('pricing.lifetimePlan.desc')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleStripeCheckout(stripeLifetimeUrl)}
              className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-4 py-3 text-sm font-extrabold text-slate-950 hover:from-cyan-400 hover:to-teal-300 shadow-lg shadow-cyan-900/50 transition-all active:scale-95"
            >
              <Sparkles className="h-4 w-4 text-slate-950" />
              <span>{t('pricing.lifetimePlan.cta')}</span>
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Feature Comparison Highlights */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            {t('pricing.features.title')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
            <div className="flex items-start space-x-2">
              <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{t('pricing.features.item1')}</span>
            </div>
            <div className="flex items-start space-x-2">
              <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{t('pricing.features.item2')}</span>
            </div>
            <div className="flex items-start space-x-2">
              <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{t('pricing.features.item3')}</span>
            </div>
            <div className="flex items-start space-x-2">
              <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{t('pricing.features.item4')}</span>
            </div>
            <div className="sm:col-span-2 flex items-start space-x-2 text-cyan-200">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{t('pricing.features.item5')}</span>
            </div>
          </div>
        </div>

        {/* License Activation Form & Reviewer Demo Mode */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
              <Key className="h-4 w-4 text-amber-400" />
              <span>{t('pricing.licenseInput.title')}</span>
            </div>
            {proPlan.isPro && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                ACTIVE
              </span>
            )}
          </div>

          <form onSubmit={handleActivateKey} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={licenseInput}
              onChange={(e) => setLicenseInput(e.target.value)}
              placeholder={t('pricing.licenseInput.placeholder')}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition-colors"
            >
              {t('pricing.licenseInput.button')}
            </button>
          </form>

          {/* Feedback message */}
          {feedback.type && (
            <div
              className={`rounded-lg p-2.5 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                  : 'border border-rose-500/40 bg-rose-950/40 text-rose-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Testing / Demo Helper & Deactivate */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
            <button
              type="button"
              onClick={handleInstantDemo}
              className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-cyan-300 transition-colors text-[11px]"
            >
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span>{t('pricing.licenseInput.demoButton')}</span>
            </button>

            {proPlan.isPro && (
              <button
                type="button"
                onClick={handleDeactivate}
                className="text-[11px] text-rose-400 hover:text-rose-300 underline transition-colors"
              >
                {t('pricing.licenseInput.deactivateButton')}
              </button>
            )}
          </div>
        </div>

        {/* Guarantees and Privacy Footer */}
        <div className="text-center space-y-1 text-[11px] text-slate-500 pt-1">
          <p>{t('pricing.guarantee')}</p>
          <p className="text-[10px] text-slate-600">{t('pricing.clientPrivacy')}</p>
        </div>
      </div>
    </div>
  );
};
