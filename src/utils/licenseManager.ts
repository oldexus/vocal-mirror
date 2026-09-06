/**
 * VocalMirror — Licensing & Custom Preset Persistence Manager
 * 
 * Provides offline license verification, Stripe checkout session parsing,
 * and localStorage-backed custom anatomical DSP preset management.
 */

import { LicenseRecord, CustomAcousticPreset } from '../types/licensing';
import { DSPParameters } from '../types/audio';
import { DEFAULT_DSP_PARAMS, PARAMETER_LIMITS } from '../audio/constants';

export const VOCALMIRROR_LICENSE_STORAGE_KEY = 'vocalmirror_pro_license';
export const VOCALMIRROR_CUSTOM_PRESETS_STORAGE_KEY = 'vocalmirror_custom_presets';

const DEFAULT_LICENSE_RECORD: LicenseRecord = {
  isPro: false,
  tier: 'free',
  licenseKey: null,
  activatedAt: null,
  source: 'demo',
};

// Safe wrapper for localStorage access
function safeGetStorage(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    // QuotaExceeded or security restriction
  }
}

function safeRemoveStorage(key: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {
    // Security restriction
  }
}

/**
 * Validates a license key against supported algorithmic patterns and passkeys.
 */
export function validateLicenseKey(rawKey: string): boolean {
  if (!rawKey || typeof rawKey !== 'string') return false;
  const key = rawKey.trim().toUpperCase();

  // 1. Built-in instant passkeys for reviewers, testers, and promotions
  if (
    key === 'VOCALMIRROR-PRO-2026' ||
    key === 'VMIRROR-PRO-PASS' ||
    key === 'TEST-PRO-KEY' ||
    key === 'AUDIT-PRO-VERIFIED'
  ) {
    return true;
  }

  // 2. Structured pattern format: VMIRROR-PRO-XXXX-XXXX
  if (/^VMIRROR-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
    return true;
  }

  // 3. Compact license key: VMIRROR-XXXX-XXXX
  if (/^VMIRROR-[A-Z0-9]{4,16}$/.test(key)) {
    return true;
  }

  // 4. Flexible Pro key with PRO tag and minimum length of 10
  if (key.includes('PRO') && key.replace(/[^A-Z0-9]/g, '').length >= 10) {
    return true;
  }

  return false;
}

/**
 * Retrieves the active stored license record from localStorage.
 */
export function getStoredLicense(): LicenseRecord {
  const json = safeGetStorage(VOCALMIRROR_LICENSE_STORAGE_KEY);
  if (!json) return DEFAULT_LICENSE_RECORD;

  try {
    const parsed = JSON.parse(json) as Partial<LicenseRecord>;
    if (parsed && typeof parsed.isPro === 'boolean') {
      return {
        isPro: parsed.isPro,
        tier: parsed.isPro ? 'pro' : 'free',
        licenseKey: parsed.licenseKey || null,
        activatedAt: parsed.activatedAt || null,
        source: parsed.source || 'key',
      };
    }
  } catch {
    // Invalid JSON, fallback
  }

  return DEFAULT_LICENSE_RECORD;
}

/**
 * Activates Pro tier using a license key.
 */
export function activateWithKey(rawKey: string): { success: boolean; record?: LicenseRecord; message?: string } {
  if (!validateLicenseKey(rawKey)) {
    return {
      success: false,
      message: 'Invalid license key format or signature.',
    };
  }

  const record: LicenseRecord = {
    isPro: true,
    tier: 'pro',
    licenseKey: rawKey.trim().toUpperCase(),
    activatedAt: new Date().toISOString(),
    source: 'key',
  };

  safeSetStorage(VOCALMIRROR_LICENSE_STORAGE_KEY, JSON.stringify(record));
  return { success: true, record };
}

/**
 * Activates Pro tier for demo / testing.
 */
export function activateDemoPro(): LicenseRecord {
  const record: LicenseRecord = {
    isPro: true,
    tier: 'pro',
    licenseKey: 'VOCALMIRROR-PRO-DEMO',
    activatedAt: new Date().toISOString(),
    source: 'demo',
  };
  safeSetStorage(VOCALMIRROR_LICENSE_STORAGE_KEY, JSON.stringify(record));
  return record;
}

/**
 * Deactivates Pro status and reverts to Free tier.
 */
export function deactivatePro(): void {
  safeRemoveStorage(VOCALMIRROR_LICENSE_STORAGE_KEY);
}

/**
 * Inspects URL parameters for checkout returns (?session_id=..., ?activated=pro, ?pro=true)
 * and automatically grants Pro status if present.
 */
export function checkUrlForActivation(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;

  try {
    const params = new URLSearchParams(window.location.search);
    const hasSession = params.has('session_id') || params.get('activated') === 'pro' || params.get('pro') === 'true';

    if (hasSession) {
      const sessionId = params.get('session_id') || 'stripe_checkout_success';
      const record: LicenseRecord = {
        isPro: true,
        tier: 'pro',
        licenseKey: `STRIPE-${sessionId.slice(0, 16).toUpperCase()}`,
        activatedAt: new Date().toISOString(),
        source: 'stripe',
      };
      safeSetStorage(VOCALMIRROR_LICENSE_STORAGE_KEY, JSON.stringify(record));

      // Clean query parameter from URL without reloading while preserving other params
      params.delete('session_id');
      params.delete('activated');
      params.delete('pro');
      const queryStr = params.toString();
      const cleanUrl = window.location.pathname + (queryStr ? `?${queryStr}` : '') + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
      return true;
    }
  } catch {
    // Ignore URL parsing errors
  }

  return false;
}

// =========================================================================
// Custom Presets Management (Pro Feature)
// =========================================================================

/**
 * Retrieves all saved custom presets from localStorage.
 */
export function getCustomPresets(): CustomAcousticPreset[] {
  const json = safeGetStorage(VOCALMIRROR_CUSTOM_PRESETS_STORAGE_KEY);
  if (!json) return [];

  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (p) => p && typeof p.id === 'string' && typeof p.name === 'string' && p.params
      );
    }
  } catch {
    // Malformed JSON
  }

  return [];
}

/**
 * Saves a new custom preset into localStorage.
 */
export function saveCustomPreset(data: {
  name: string;
  tag?: string;
  description?: string;
  params: DSPParameters;
}): CustomAcousticPreset {
  const presets = getCustomPresets();
  const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newPreset: CustomAcousticPreset = {
    id,
    name: data.name.trim() || 'Custom Acoustic Calibration',
    tag: (data.tag || 'CUSTOM').trim().toUpperCase(),
    description: data.description?.trim() || 'User calibrated physiological DSP profile.',
    createdAt: new Date().toISOString(),
    params: { ...data.params },
  };

  const updated = [newPreset, ...presets];
  safeSetStorage(VOCALMIRROR_CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated));
  return newPreset;
}

/**
 * Deletes a custom preset by ID.
 */
export function deleteCustomPreset(id: string): void {
  const presets = getCustomPresets();
  const filtered = presets.filter((p) => p.id !== id);
  safeSetStorage(VOCALMIRROR_CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Exports all custom presets as a formatted JSON string.
 */
export function exportCustomPresetsJson(): string {
  const presets = getCustomPresets();
  return JSON.stringify(
    {
      app: 'VocalMirror',
      version: '0.2.0',
      exportedAt: new Date().toISOString(),
      presets,
    },
    null,
    2
  );
}

/**
 * Strictly sanitizes imported preset parameters, enforcing numerical limits and blocking prototype pollution.
 */
function sanitizePresetParams(rawParams: any): DSPParameters {
  const sanitized: DSPParameters = { ...DEFAULT_DSP_PARAMS };
  if (!rawParams || typeof rawParams !== 'object') return sanitized;

  const validKeys = Object.keys(DEFAULT_DSP_PARAMS) as (keyof DSPParameters)[];
  for (const key of validKeys) {
    if (Object.prototype.hasOwnProperty.call(rawParams, key)) {
      const val = rawParams[key];
      if (typeof val === 'number' && Number.isFinite(val)) {
        const limits = PARAMETER_LIMITS[key];
        sanitized[key] = Math.max(limits.min, Math.min(limits.max, val));
      }
    }
  }

  return sanitized;
}

/**
 * Imports custom presets from a JSON string.
 */
export function importCustomPresetsJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    const incomingPresets = Array.isArray(data) ? data : data.presets;

    if (!Array.isArray(incomingPresets)) {
      return { success: false, count: 0, error: 'JSON does not contain a presets array.' };
    }

    const currentPresets = getCustomPresets();
    const existingIds = new Set(currentPresets.map((p) => p.id));
    let addedCount = 0;

    const sanitized: CustomAcousticPreset[] = [];
    for (const item of incomingPresets) {
      if (item && typeof item.name === 'string' && item.params && typeof item.params === 'object') {
        const id = item.id && !existingIds.has(item.id)
          ? String(item.id).slice(0, 50)
          : `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        existingIds.add(id);

        sanitized.push({
          id,
          name: String(item.name).slice(0, 60),
          tag: String(item.tag || 'CUSTOM').slice(0, 16).toUpperCase(),
          description: String(item.description || '').slice(0, 200),
          createdAt: item.createdAt || new Date().toISOString(),
          params: sanitizePresetParams(item.params),
        });
        addedCount++;
      }
    }

    if (addedCount === 0) {
      return { success: false, count: 0, error: 'No valid preset profiles found in file.' };
    }

    safeSetStorage(
      VOCALMIRROR_CUSTOM_PRESETS_STORAGE_KEY,
      JSON.stringify([...sanitized, ...currentPresets])
    );

    return { success: true, count: addedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Invalid JSON syntax.' };
  }
}
