/**
 * VocalMirror — Bilingual Localization Key Parity & Integrity Test Suite
 * File: tests/unit/i18n/i18nKeySync.test.ts
 * 
 * Enforces 100% bidirectional parity between the English master dictionary (en.ts)
 * and the Japanese localized dictionary (ja.ts):
 * 1. Recursive key traversal with zero missing and zero orphaned keys.
 * 2. Type and structural mirror parity across all nested branches.
 * 3. Dynamic template variable placeholder parity across languages.
 * 4. Content non-emptiness and absence of untranslated dummy stubs.
 */

import { describe, it, expect } from 'vitest';
import { en } from '../../../src/i18n/locales/en';
import { ja } from '../../../src/i18n/locales/ja';
import type { TranslationDictionary } from '../../../src/i18n/types';

// =========================================================================
// Helper Functions for Recursive Key Extraction and Value Inspection
// =========================================================================

/**
 * Recursively extracts all dot-notation paths to leaf nodes in an object.
 */
function getLeafPaths(obj: Record<string, any>, prefix = ''): Map<string, any> {
  const leafMap = new Map<string, any>();

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = getLeafPaths(value, currentPath);
      for (const [nestedKey, nestedValue] of nested.entries()) {
        leafMap.set(nestedKey, nestedValue);
      }
    } else {
      leafMap.set(currentPath, value);
    }
  }

  return leafMap;
}

/**
 * Extracts dynamic template variable names from a template string (e.g. "{value}" -> "value").
 */
function extractPlaceholderNames(text: string): string[] {
  if (typeof text !== 'string') return [];
  const matches = text.match(/\{\s*([a-zA-Z0-9_]+)\s*\}/g);
  if (!matches) return [];
  return matches.map((m) => m.replace(/[\{\}\s]/g, '')).sort();
}

/**
 * Recursively resolves a nested path from an object (e.g. "header.status.recording").
 */
function resolvePath(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

describe('Bilingual i18n Key Parity & Structure Verification', () => {
  const enLeafMap = getLeafPaths(en);
  const jaLeafMap = getLeafPaths(ja);

  const enKeyList = Array.from(enLeafMap.keys()).sort();
  const jaKeyList = Array.from(jaLeafMap.keys()).sort();

  // =========================================================================
  // Suite 1: Recursive Key Parity Verification (0 Missing, 0 Orphaned)
  // =========================================================================
  describe('1. Recursive Key Parity (100% Mirroring)', () => {
    it('verifies type compliance of en and ja with TranslationDictionary interface', () => {
      const enDict: TranslationDictionary = en;
      const jaDict: TranslationDictionary = ja;
      expect(enDict.app.title).toBeDefined();
      expect(jaDict.app.title).toBeDefined();
    });

    it('contains a non-trivial number of localized strings (>100 leaf keys)', () => {
      expect(enKeyList.length).toBeGreaterThan(100);
      expect(jaKeyList.length).toBeGreaterThan(100);
    });

    it('has exact identical total leaf key counts in English and Japanese dictionaries', () => {
      expect(jaKeyList.length).toBe(enKeyList.length);
    });

    it('ensures ZERO missing keys in the Japanese dictionary relative to English master', () => {
      const missingInJa = enKeyList.filter((key) => !jaLeafMap.has(key));

      const failureReport = missingInJa.length > 0
        ? [
            `Found ${missingInJa.length} missing translation key(s) in ja.ts:`,
            ...missingInJa.map((k) => `  - [MISSING IN JA] ${k} (EN: "${enLeafMap.get(k)}")`),
          ].join('\n')
        : '';

      expect(missingInJa, failureReport).toHaveLength(0);
    });

    it('ensures ZERO orphaned/extraneous keys in the Japanese dictionary relative to English master', () => {
      const orphanedInJa = jaKeyList.filter((key) => !enLeafMap.has(key));

      const failureReport = orphanedInJa.length > 0
        ? [
            `Found ${orphanedInJa.length} orphaned translation key(s) in ja.ts not present in en.ts:`,
            ...orphanedInJa.map((k) => `  - [ORPHAN IN JA] ${k} (JA: "${jaLeafMap.get(k)}")`),
          ].join('\n')
        : '';

      expect(orphanedInJa, failureReport).toHaveLength(0);
    });
  });

  // =========================================================================
  // Suite 2: Leaf Value Integrity & Type Safety
  // =========================================================================
  describe('2. Leaf Value Integrity & Type Safety', () => {
    it('ensures all English leaf nodes are non-empty strings without null/undefined values', () => {
      for (const [key, value] of enLeafMap.entries()) {
        expect(typeof value, `en.ts key "${key}" should be a string`).toBe('string');
        expect(
          (value as string).trim().length,
          `en.ts key "${key}" should not be empty`
        ).toBeGreaterThan(0);
      }
    });

    it('ensures all Japanese leaf nodes are non-empty strings without null/undefined values', () => {
      for (const [key, value] of jaLeafMap.entries()) {
        expect(typeof value, `ja.ts key "${key}" should be a string`).toBe('string');
        expect(
          (value as string).trim().length,
          `ja.ts key "${key}" should not be empty`
        ).toBeGreaterThan(0);
      }
    });

    it('ensures Japanese dictionary contains actual Japanese characters in high-level copy', () => {
      // Check top-level strings for Japanese kanji/kana to guarantee real translation
      const sampleJapaneseKeys = [
        'app.title',
        'header.status.recording',
        'controls.recordStart',
        'modes.raw.name',
        'presets.header.title',
        'parameters.header.title',
        'analyzer.title',
        'visualizer.cranialBoost',
        'export.title',
      ];

      for (const key of sampleJapaneseKeys) {
        const jaVal = jaLeafMap.get(key) as string;
        expect(jaVal, `Key "${key}" in ja.ts should exist`).toBeDefined();
        // Regex matching Hiragana, Katakana, or CJK Unified Ideographs
        const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(jaVal);
        expect(
          hasJapanese,
          `Expected Japanese characters in ja.ts for "${key}", found: "${jaVal}"`
        ).toBe(true);
      }
    });
  });

  // =========================================================================
  // Suite 3: Dynamic Template Parameter Parity
  // =========================================================================
  describe('3. Template Variable Placeholder Parity', () => {
    it('ensures identical template variables are used in corresponding EN and JA strings', () => {
      const mismatchedPlaceholders: Array<{
        key: string;
        enPlaceholders: string[];
        jaPlaceholders: string[];
      }> = [];

      for (const [key, enVal] of enLeafMap.entries()) {
        if (typeof enVal === 'string') {
          const enPlaceholders = extractPlaceholderNames(enVal);
          const jaVal = jaLeafMap.get(key);

          if (enPlaceholders.length > 0 && typeof jaVal === 'string') {
            const jaPlaceholders = extractPlaceholderNames(jaVal);
            if (JSON.stringify(enPlaceholders) !== JSON.stringify(jaPlaceholders)) {
              mismatchedPlaceholders.push({
                key,
                enPlaceholders,
                jaPlaceholders,
              });
            }
          }
        }
      }

      const failureReport = mismatchedPlaceholders.length > 0
        ? [
            `Found ${mismatchedPlaceholders.length} placeholder mismatches between en.ts and ja.ts:`,
            ...mismatchedPlaceholders.map(
              (m) => `  - Key "${m.key}": EN=[${m.enPlaceholders.join(', ')}] vs JA=[${m.jaPlaceholders.join(', ')}]`
            ),
          ].join('\n')
        : '';

      expect(mismatchedPlaceholders, failureReport).toHaveLength(0);
    });
  });

  // =========================================================================
  // Suite 4: Structural Section & Schema Conformance
  // =========================================================================
  describe('4. Section Schema & Specific Feature Parity', () => {
    it('verifies 100% parameter label coverage across all 16 DSP parameters', () => {
      const expectedParams = [
        'lowShelfFreq',
        'lowShelfGain',
        'mandibleResFreq',
        'mandibleResGain',
        'mandibleResQ',
        'sinusResFreq',
        'sinusResGain',
        'sinusResQ',
        'antiResFreq',
        'antiResGain',
        'antiResQ',
        'tissueCutoffFreq',
        'tissueCutoffQ',
        'highShelfFreq',
        'highShelfGain',
        'masterGain',
      ];

      for (const param of expectedParams) {
        const enLabel = resolvePath(en, `parameters.labels.${param}`);
        const jaLabel = resolvePath(ja, `parameters.labels.${param}`);
        const enDesc = resolvePath(en, `parameters.descriptions.${param}`);
        const jaDesc = resolvePath(ja, `parameters.descriptions.${param}`);

        expect(enLabel, `Missing EN label for ${param}`).toBeTruthy();
        expect(jaLabel, `Missing JA label for ${param}`).toBeTruthy();
        expect(enDesc, `Missing EN description for ${param}`).toBeTruthy();
        expect(jaDesc, `Missing JA description for ${param}`).toBeTruthy();
      }
    });

    it('verifies all 4 physiological presets exist in both dictionaries', () => {
      const expectedPresets = [
        'natural_standard',
        'deep_chest_male',
        'bright_cranial_female',
        'intense_confrontation',
      ];

      for (const preset of expectedPresets) {
        const enPreset = resolvePath(en, `presets.items.${preset}`);
        const jaPreset = resolvePath(ja, `presets.items.${preset}`);

        expect(enPreset, `Missing EN preset ${preset}`).toBeDefined();
        expect(jaPreset, `Missing JA preset ${preset}`).toBeDefined();
        expect(enPreset.name).toBeTruthy();
        expect(jaPreset.name).toBeTruthy();
        expect(enPreset.tag).toBeTruthy();
        expect(jaPreset.tag).toBeTruthy();
        expect(enPreset.description).toBeTruthy();
        expect(jaPreset.description).toBeTruthy();
      }
    });

    it('verifies all 3 listening modes (raw, internal_sim, compensated) have complete metadata', () => {
      const expectedModes = ['raw', 'internal_sim', 'compensated'];

      for (const mode of expectedModes) {
        const enMode = resolvePath(en, `modes.${mode}`);
        const jaMode = resolvePath(ja, `modes.${mode}`);

        expect(enMode, `Missing EN mode ${mode}`).toBeDefined();
        expect(jaMode, `Missing JA mode ${mode}`).toBeDefined();
        expect(enMode.name).toBeTruthy();
        expect(jaMode.name).toBeTruthy();
        expect(enMode.subtitle).toBeTruthy();
        expect(jaMode.subtitle).toBeTruthy();
        expect(enMode.acousticTag).toBeTruthy();
        expect(jaMode.acousticTag).toBeTruthy();
        expect(enMode.description).toBeTruthy();
        expect(jaMode.description).toBeTruthy();
      }
    });

    it('verifies visualizer dynamic badge labels are present in both dictionaries', () => {
      expect(en.visualizer.cranialBoost).toBeTruthy();
      expect(ja.visualizer.cranialBoost).toBeTruthy();
      expect(en.visualizer.tissueDamping).toBeTruthy();
      expect(ja.visualizer.tissueDamping).toBeTruthy();
    });
  });
});
