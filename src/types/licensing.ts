/**
 * VocalMirror — Licensing, Pricing & Custom Preset Interface Contracts
 */

import { DSPParameters } from './audio';

export type PlanTier = 'free' | 'pro';

export interface PricingPlanConfig {
  id: 'monthly' | 'lifetime';
  nameJa: string;
  nameEn: string;
  priceJpy: number;
  priceUsd: number;
  periodJa: string;
  periodEn: string;
  descriptionJa: string;
  descriptionEn: string;
  badgeJa?: string;
  badgeEn?: string;
  stripeUrl?: string;
}

export interface LicenseRecord {
  isPro: boolean;
  tier: PlanTier;
  licenseKey: string | null;
  activatedAt: string | null;
  source: 'key' | 'stripe' | 'demo';
}

export interface CustomAcousticPreset {
  id: string;
  name: string;
  tag: string;
  description: string;
  createdAt: string;
  params: DSPParameters;
}
