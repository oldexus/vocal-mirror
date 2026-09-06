/**
 * VocalMirror — Licensing & Custom Preset Manager Unit Test Suite
 * File: tests/unit/licensing/licenseManager.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateLicenseKey,
  getStoredLicense,
  activateWithKey,
  activateDemoPro,
  deactivatePro,
  checkUrlForActivation,
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  exportCustomPresetsJson,
  importCustomPresetsJson,
  VOCALMIRROR_LICENSE_STORAGE_KEY,
} from '../../../src/utils/licenseManager';
import { DEFAULT_DSP_PARAMS } from '../../../src/audio/constants';

describe('LicenseManager & Custom Preset Manager Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // =========================================================================
  // 1. License Key Algorithmic Validation
  // =========================================================================
  describe('1. License Key Algorithmic Validation', () => {
    it('approves built-in reviewer and promotion passkeys', () => {
      expect(validateLicenseKey('VOCALMIRROR-PRO-2026')).toBe(true);
      expect(validateLicenseKey('vocalmirror-pro-2026')).toBe(true);
      expect(validateLicenseKey('VMIRROR-PRO-PASS')).toBe(true);
      expect(validateLicenseKey('TEST-PRO-KEY')).toBe(true);
      expect(validateLicenseKey('AUDIT-PRO-VERIFIED')).toBe(true);
    });

    it('approves structured standard license keys (VMIRROR-PRO-XXXX-XXXX)', () => {
      expect(validateLicenseKey('VMIRROR-PRO-ABCD-1234')).toBe(true);
      expect(validateLicenseKey('vmirror-pro-9999-zzzz')).toBe(true);
      expect(validateLicenseKey('VMIRROR-PRO-K8X2-90LP')).toBe(true);
    });

    it('approves compact license keys (VMIRROR-XXXX-XXXX)', () => {
      expect(validateLicenseKey('VMIRROR-ABCD1234EFGH')).toBe(true);
      expect(validateLicenseKey('vmirror-8899aabb')).toBe(true);
    });

    it('rejects empty, malformed, or invalid license strings', () => {
      expect(validateLicenseKey('')).toBe(false);
      expect(validateLicenseKey('   ')).toBe(false);
      expect(validateLicenseKey('INVALID-KEY')).toBe(false);
      expect(validateLicenseKey('12345')).toBe(false);
      expect(validateLicenseKey('FREE-TIER')).toBe(false);
    });
  });

  // =========================================================================
  // 2. License Persistence & State Management
  // =========================================================================
  describe('2. License Persistence & State Management', () => {
    it('returns Free tier by default when no license is stored', () => {
      const license = getStoredLicense();
      expect(license.isPro).toBe(false);
      expect(license.tier).toBe('free');
      expect(license.licenseKey).toBeNull();
    });

    it('activates Pro tier with valid key and saves to localStorage', () => {
      const res = activateWithKey('VMIRROR-PRO-9876-5432');
      expect(res.success).toBe(true);
      expect(res.record?.isPro).toBe(true);
      expect(res.record?.tier).toBe('pro');
      expect(res.record?.licenseKey).toBe('VMIRROR-PRO-9876-5432');

      // Verify retrieval
      const stored = getStoredLicense();
      expect(stored.isPro).toBe(true);
      expect(stored.tier).toBe('pro');
      expect(stored.licenseKey).toBe('VMIRROR-PRO-9876-5432');
    });

    it('rejects activation with an invalid key', () => {
      const res = activateWithKey('BOGUS-KEY');
      expect(res.success).toBe(false);
      expect(res.record).toBeUndefined();

      const stored = getStoredLicense();
      expect(stored.isPro).toBe(false);
    });

    it('activates demo pro for reviewers and testers', () => {
      const demo = activateDemoPro();
      expect(demo.isPro).toBe(true);
      expect(demo.source).toBe('demo');

      const stored = getStoredLicense();
      expect(stored.isPro).toBe(true);
    });

    it('deactivates pro and cleans localStorage', () => {
      activateDemoPro();
      expect(getStoredLicense().isPro).toBe(true);

      deactivatePro();
      expect(getStoredLicense().isPro).toBe(false);
      expect(localStorage.getItem(VOCALMIRROR_LICENSE_STORAGE_KEY)).toBeNull();
    });
  });

  // =========================================================================
  // 3. URL Parameter Checkout Detection
  // =========================================================================
  describe('3. URL Parameter Checkout Return Detection', () => {
    it('detects session_id query param and activates Pro while preserving other query params', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = new URL('https://vocalmirror.app/?session_id=cs_test_abc123&lang=ja&ref=producthunt');

      const historySpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

      const activated = checkUrlForActivation();
      expect(activated).toBe(true);
      expect(historySpy).toHaveBeenCalledWith(
        {},
        '',
        '/?lang=ja&ref=producthunt'
      );

      const stored = getStoredLicense();
      expect(stored.isPro).toBe(true);
      expect(stored.source).toBe('stripe');

      (window as any).location = originalLocation;
    });

    it('returns false when no activation query param is present', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = new URL('https://vocalmirror.app/');

      const activated = checkUrlForActivation();
      expect(activated).toBe(false);

      (window as any).location = originalLocation;
    });
  });

  // =========================================================================
  // 4. Custom Anatomical Presets CRUD & JSON Export/Import
  // =========================================================================
  describe('4. Custom Anatomical Presets CRUD & JSON Import/Export', () => {
    it('returns empty array when no custom presets are saved', () => {
      expect(getCustomPresets()).toEqual([]);
    });

    it('saves custom preset and persists to localStorage', () => {
      const saved = saveCustomPreset({
        name: 'My Studio Setup',
        tag: 'VOCAL',
        description: 'Testing custom mandible resonance.',
        params: { ...DEFAULT_DSP_PARAMS, mandibleResGain: 4.5 },
      });

      expect(saved.id).toBeDefined();
      expect(saved.name).toBe('My Studio Setup');
      expect(saved.tag).toBe('VOCAL');
      expect(saved.params.mandibleResGain).toBe(4.5);

      const list = getCustomPresets();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(saved.id);
    });

    it('deletes a custom preset by ID', () => {
      const p1 = saveCustomPreset({
        name: 'Preset 1',
        params: DEFAULT_DSP_PARAMS,
      });
      const p2 = saveCustomPreset({
        name: 'Preset 2',
        params: DEFAULT_DSP_PARAMS,
      });

      expect(getCustomPresets().length).toBe(2);

      deleteCustomPreset(p1.id);
      const remaining = getCustomPresets();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(p2.id);
    });

    it('exports custom presets as formatted JSON', () => {
      saveCustomPreset({
        name: 'Export Test',
        params: DEFAULT_DSP_PARAMS,
      });

      const jsonStr = exportCustomPresetsJson();
      const parsed = JSON.parse(jsonStr);

      expect(parsed.app).toBe('VocalMirror');
      expect(parsed.presets.length).toBe(1);
      expect(parsed.presets[0].name).toBe('Export Test');
    });

    it('imports custom presets from valid JSON', () => {
      const importPayload = JSON.stringify({
        app: 'VocalMirror',
        presets: [
          {
            id: 'imported_01',
            name: 'Imported Voice Preset',
            tag: 'TEST',
            description: 'Imported from backup',
            params: DEFAULT_DSP_PARAMS,
          },
        ],
      });

      const res = importCustomPresetsJson(importPayload);
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);

      const presets = getCustomPresets();
      expect(presets.length).toBe(1);
      expect(presets[0].name).toBe('Imported Voice Preset');
    });

    it('rejects invalid JSON syntax or schema on import', () => {
      const invalidJsonRes = importCustomPresetsJson('{ bad json');
      expect(invalidJsonRes.success).toBe(false);

      const badSchemaRes = importCustomPresetsJson(JSON.stringify({ notPresets: [] }));
      expect(badSchemaRes.success).toBe(false);
    });

    it('clamps out-of-bound DSP parameter values and rejects prototype pollution attempts', () => {
      const maliciousPayload = JSON.stringify({
        app: 'VocalMirror',
        presets: [
          {
            id: 'preset_exploit',
            name: 'Security Test Preset',
            tag: 'TEST',
            description: 'Testing clamping and pollution',
            params: {
              ...DEFAULT_DSP_PARAMS,
              __proto__: { polluted: true },
              mandibleResGain: 99999, // Should be clamped to max 8
              lowShelfGain: -99999,   // Should be clamped to min 0
              antiResFreq: 'invalid_string' as any, // Non-numeric should fallback to default
            },
          },
        ],
      });

      const res = importCustomPresetsJson(maliciousPayload);
      expect(res.success).toBe(true);

      // Verify prototype pollution was blocked
      expect((Object.prototype as any).polluted).toBeUndefined();

      // Verify parameters were clamped
      const presets = getCustomPresets();
      expect(presets.length).toBe(1);
      const imported = presets[0];
      expect(imported.params.mandibleResGain).toBe(8); // Clamped to 8
      expect(imported.params.lowShelfGain).toBe(0);   // Clamped to 0
      expect(imported.params.antiResFreq).toBe(DEFAULT_DSP_PARAMS.antiResFreq); // Fallback
    });
  });
});
