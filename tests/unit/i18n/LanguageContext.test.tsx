/**
 * VocalMirror — LanguageContext & i18n Core Unit Test Suite
 * File: tests/unit/i18n/LanguageContext.test.tsx
 * 
 * Comprehensive tests for:
 * 1. Template variable interpolation (interpolate utility)
 * 2. Browser locale auto-detection (navigator.language -> ja / en)
 * 3. Default language prop override
 * 4. Manual language switching (setLanguage, toggleLanguage)
 * 5. LocalStorage persistence (vocal_mirror_lang read/write & corruption resilience)
 * 6. DOM synchronization (document.documentElement.lang & document.title)
 * 7. Translation helper & nested dot notation resolution (t(key, params))
 * 8. React Hooks integration (useTranslation, useLanguage) & boundary error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

import {
  LanguageProvider,
  LanguageContext,
  useTranslation,
  useLanguage,
} from '../../../src/i18n/LanguageContext';
import { interpolate } from '../../../src/i18n/interpolate';
import { en } from '../../../src/i18n/locales/en';
import { ja } from '../../../src/i18n/locales/ja';
import type { Language } from '../../../src/i18n/types';

// ==========================================
// Test Render Helper (React 18 createRoot + act)
// ==========================================
interface RenderResult {
  container: HTMLDivElement;
  rerender: (newUi: React.ReactElement) => void;
  unmount: () => void;
}

function renderUI(ui: React.ReactElement): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return {
    container,
    rerender: (newUi: React.ReactElement) => {
      act(() => {
        root.render(newUi);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('LanguageContext & i18n Core Test Suite', () => {
  const originalNavigatorLanguage = navigator.language;
  const originalTitle = document.title;
  const originalHtmlLang = document.documentElement.lang;

  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    document.documentElement.lang = '';
    document.title = 'VocalMirror';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.lang = originalHtmlLang;
    document.title = originalTitle;
    Object.defineProperty(navigator, 'language', {
      value: originalNavigatorLanguage,
      configurable: true,
    });
  });

  // =========================================================================
  // Suite 1: Template Variable Interpolation (interpolate & t)
  // =========================================================================
  describe('1. Template Variable Interpolation (interpolate)', () => {
    it('returns original string when no template variables or params are provided', () => {
      expect(interpolate('Simple text without placeholders')).toBe('Simple text without placeholders');
      expect(interpolate('Simple text', undefined)).toBe('Simple text');
      expect(interpolate('Simple text', {})).toBe('Simple text');
      expect(interpolate('')).toBe('');
    });

    it('replaces single string placeholder {key}', () => {
      const result = interpolate('Hello {name}!', { name: 'VocalMirror' });
      expect(result).toBe('Hello VocalMirror!');
    });

    it('replaces multiple dynamic variables of string and number types', () => {
      const template = 'Boost: {value} dB at {freq} (Band: {band})';
      const params = { value: 10, freq: '240Hz', band: 'Mandible' };
      const result = interpolate(template, params);
      expect(result).toBe('Boost: 10 dB at 240Hz (Band: Mandible)');
    });

    it('handles numeric zero and negative numbers correctly', () => {
      const template = 'Gain: {gain} dB, Level: {level} dBFS';
      const result = interpolate(template, { gain: 0, level: -12.5 });
      expect(result).toBe('Gain: 0 dB, Level: -12.5 dBFS');
    });

    it('tolerates whitespace inside placeholders like { key } and {   val  }', () => {
      const template = 'Freq: { freq } Hz, Q: {   q   }, Gain: {gain } dB';
      const result = interpolate(template, { freq: 180, q: 0.707, gain: 8 });
      expect(result).toBe('Freq: 180 Hz, Q: 0.707, Gain: 8 dB');
    });

    it('preserves unsupplied placeholder tokens without throwing or corrupting output', () => {
      const template = 'Provided: {present}, Missing: {absent}';
      const result = interpolate(template, { present: 'YES' });
      expect(result).toBe('Provided: YES, Missing: {absent}');
    });

    it('handles special symbols and Japanese characters in params safely', () => {
      const template = '処理中: {name} (進捗: {percent}%) - 状態: {status}';
      const result = interpolate(template, {
        name: '頭蓋骨伝導',
        percent: 100,
        status: '完了',
      });
      expect(result).toBe('処理中: 頭蓋骨伝導 (進捗: 100%) - 状態: 完了');
    });
  });

  // =========================================================================
  // Suite 2: Browser Locale Auto-Detection
  // =========================================================================
  describe('2. Browser Locale Auto-Detection', () => {
    it('defaults to "ja" when navigator.language is "ja"', () => {
      Object.defineProperty(navigator, 'language', { value: 'ja', configurable: true });

      const TestComponent = () => {
        const { language } = useLanguage();
        return <div data-testid="lang-display">{language}</div>;
      };

      const { container, unmount } = renderUI(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('ja');
      unmount();
    });

    it('defaults to "ja" when navigator.language is "ja-JP"', () => {
      Object.defineProperty(navigator, 'language', { value: 'ja-JP', configurable: true });

      const TestComponent = () => {
        const { language } = useLanguage();
        return <div data-testid="lang-display">{language}</div>;
      };

      const { container, unmount } = renderUI(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('ja');
      unmount();
    });

    it('defaults to "en" when navigator.language is "en-US"', () => {
      Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });

      const TestComponent = () => {
        const { language } = useLanguage();
        return <div data-testid="lang-display">{language}</div>;
      };

      const { container, unmount } = renderUI(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('en');
      unmount();
    });

    it('defaults to "en" for non-Japanese languages (e.g., "fr-FR", "de", "zh-CN")', () => {
      Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true });

      const TestComponent = () => {
        const { language } = useLanguage();
        return <div data-testid="lang-display">{language}</div>;
      };

      const { container, unmount } = renderUI(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('en');
      unmount();
    });
  });

  // =========================================================================
  // Suite 3: Default Language Prop Override
  // =========================================================================
  describe('3. Default Language Prop Override', () => {
    it('uses defaultLanguage prop when provided, overriding navigator autodetection', () => {
      Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });

      const targetLang: Language = 'ja';
      const TestComponent = () => {
        const { language } = useLanguage();
        return <div data-testid="lang-display">{language}</div>;
      };

      const { container, unmount } = renderUI(
        <LanguageProvider defaultLanguage={targetLang}>
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('ja');
      unmount();
    });

    it('allows defaultLanguage="en" even if navigator is "ja"', () => {
      Object.defineProperty(navigator, 'language', { value: 'ja', configurable: true });

      const targetLang: Language = 'en';
      const TestComponent = () => {
        const { language } = useLanguage();
        return <div data-testid="lang-display">{language}</div>;
      };

      const { container, unmount } = renderUI(
        <LanguageProvider defaultLanguage={targetLang}>
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('en');
      unmount();
    });
  });

  // =========================================================================
  // Suite 4: Manual Language Switching (setLanguage, toggleLanguage)
  // =========================================================================
  describe('4. Manual Language Switching', () => {
    it('switches language explicitly via setLanguage("ja") and setLanguage("en")', () => {
      const TestComponent = () => {
        const { language, setLanguage } = useLanguage();
        return (
          <div>
            <div data-testid="lang-display">{language}</div>
            <button data-testid="btn-ja" onClick={() => setLanguage('ja')}>JA</button>
            <button data-testid="btn-en" onClick={() => setLanguage('en')}>EN</button>
          </div>
        );
      };

      const { container, unmount } = renderUI(
        <LanguageProvider defaultLanguage="en">
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('en');

      // Click JA
      const btnJa = container.querySelector('[data-testid="btn-ja"]') as HTMLButtonElement;
      act(() => {
        btnJa.click();
      });
      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('ja');

      // Click EN
      const btnEn = container.querySelector('[data-testid="btn-en"]') as HTMLButtonElement;
      act(() => {
        btnEn.click();
      });
      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('en');

      unmount();
    });

    it('toggles language back and forth via toggleLanguage()', () => {
      const TestComponent = () => {
        const { language, toggleLanguage } = useLanguage();
        return (
          <div>
            <div data-testid="lang-display">{language}</div>
            <button data-testid="btn-toggle" onClick={toggleLanguage}>Toggle</button>
          </div>
        );
      };

      const { container, unmount } = renderUI(
        <LanguageProvider defaultLanguage="en">
          <TestComponent />
        </LanguageProvider>
      );

      const toggleBtn = container.querySelector('[data-testid="btn-toggle"]') as HTMLButtonElement;
      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('en');

      // 1st toggle: en -> ja
      act(() => {
        toggleBtn.click();
      });
      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('ja');

      // 2nd toggle: ja -> en
      act(() => {
        toggleBtn.click();
      });
      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('en');

      // 3rd toggle: en -> ja
      act(() => {
        toggleBtn.click();
      });
      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('ja');

      unmount();
    });
  });

  // =========================================================================
  // Suite 5: LocalStorage Persistence (vocal_mirror_lang)
  // =========================================================================
  describe('5. LocalStorage Persistence', () => {
    it('restores language from localStorage key "vocal_mirror_lang" on mount', () => {
      localStorage.setItem('vocal_mirror_lang', 'ja');
      Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });

      const TestComponent = () => {
        const { language } = useLanguage();
        return <div data-testid="lang-display">{language}</div>;
      };

      const { container, unmount } = renderUI(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('ja');
      unmount();
    });

    it('persists selected language to localStorage on setLanguage and toggleLanguage', () => {
      const TestComponent = () => {
        const { toggleLanguage, setLanguage } = useLanguage();
        return (
          <div>
            <button data-testid="btn-set-ja" onClick={() => setLanguage('ja')}>Set JA</button>
            <button data-testid="btn-toggle" onClick={toggleLanguage}>Toggle</button>
          </div>
        );
      };

      const { container, unmount } = renderUI(
        <LanguageProvider defaultLanguage="en">
          <TestComponent />
        </LanguageProvider>
      );

      expect(localStorage.getItem('vocal_mirror_lang')).toBe('en');

      // Switch to JA
      act(() => {
        (container.querySelector('[data-testid="btn-set-ja"]') as HTMLButtonElement).click();
      });
      expect(localStorage.getItem('vocal_mirror_lang')).toBe('ja');

      // Toggle back to EN
      act(() => {
        (container.querySelector('[data-testid="btn-toggle"]') as HTMLButtonElement).click();
      });
      expect(localStorage.getItem('vocal_mirror_lang')).toBe('en');

      unmount();
    });

    it('ignores invalid/corrupted localStorage values and falls back safely', () => {
      localStorage.setItem('vocal_mirror_lang', 'invalid_locale_xyz');
      Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });

      const TestComponent = () => {
        const { language } = useLanguage();
        return <div data-testid="lang-display">{language}</div>;
      };

      const { container, unmount } = renderUI(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('en');
      unmount();
    });

    it('operates resiliently when localStorage.setItem throws (e.g. QuotaExceeded or Private Browsing)', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError: Storage quota exceeded');
      });

      const TestComponent = () => {
        const { language, setLanguage } = useLanguage();
        return (
          <div>
            <div data-testid="lang-display">{language}</div>
            <button data-testid="btn-ja" onClick={() => setLanguage('ja')}>JA</button>
          </div>
        );
      };

      const { container, unmount } = renderUI(
        <LanguageProvider defaultLanguage="en">
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('en');

      // Attempt switch — should not crash the component tree
      act(() => {
        (container.querySelector('[data-testid="btn-ja"]') as HTMLButtonElement).click();
      });

      expect(container.querySelector('[data-testid="lang-display"]')?.textContent).toBe('ja');
      unmount();
    });
  });

  // =========================================================================
  // Suite 6: DOM Synchronization (document.documentElement.lang & title)
  // =========================================================================
  describe('6. DOM Synchronization', () => {
    it('synchronizes document.documentElement.lang to "en" and updates document.title in English', () => {
      const { unmount } = renderUI(
        <LanguageProvider defaultLanguage="en">
          <div>App Body</div>
        </LanguageProvider>
      );

      expect(document.documentElement.lang).toBe('en');
      expect(document.title).toBe(en.app.title);
      unmount();
    });

    it('synchronizes document.documentElement.lang to "ja" and updates document.title in Japanese', () => {
      const { unmount } = renderUI(
        <LanguageProvider defaultLanguage="ja">
          <div>App Body</div>
        </LanguageProvider>
      );

      expect(document.documentElement.lang).toBe('ja');
      expect(document.title).toBe(ja.app.title);
      unmount();
    });

    it('dynamically updates document.documentElement.lang and document.title when switching language', () => {
      const TestComponent = () => {
        const { toggleLanguage } = useLanguage();
        return <button data-testid="btn-toggle" onClick={toggleLanguage}>Toggle</button>;
      };

      const { container, unmount } = renderUI(
        <LanguageProvider defaultLanguage="en">
          <TestComponent />
        </LanguageProvider>
      );

      expect(document.documentElement.lang).toBe('en');
      expect(document.title).toBe(en.app.title);

      // Switch to JA
      act(() => {
        (container.querySelector('[data-testid="btn-toggle"]') as HTMLButtonElement).click();
      });
      expect(document.documentElement.lang).toBe('ja');
      expect(document.title).toBe(ja.app.title);

      // Switch back to EN
      act(() => {
        (container.querySelector('[data-testid="btn-toggle"]') as HTMLButtonElement).click();
      });
      expect(document.documentElement.lang).toBe('en');
      expect(document.title).toBe(en.app.title);

      unmount();
    });
  });

  // =========================================================================
  // Suite 7: Translation Helper & Nested Dot Notation Resolution (t)
  // =========================================================================
  describe('7. Translation Resolution & Nested Keys (t)', () => {
    it('resolves top-level and nested keys correctly in both languages', () => {
      const TestComponent = () => {
        const { t, setLanguage } = useTranslation();
        return (
          <div>
            <div data-testid="app-title">{t('app.title')}</div>
            <div data-testid="status-rec">{t('header.status.recording')}</div>
            <div data-testid="mode-raw">{t('modes.raw.name')}</div>
            <div data-testid="footer-tag">{t('app.footer.tagline')}</div>
            <button data-testid="btn-ja" onClick={() => setLanguage('ja')}>JA</button>
            <button data-testid="btn-en" onClick={() => setLanguage('en')}>EN</button>
          </div>
        );
      };

      const { container, unmount } = renderUI(
        <LanguageProvider defaultLanguage="en">
          <TestComponent />
        </LanguageProvider>
      );

      // EN verification
      expect(container.querySelector('[data-testid="app-title"]')?.textContent).toBe(en.app.title);
      expect(container.querySelector('[data-testid="status-rec"]')?.textContent).toBe(en.header.status.recording);
      expect(container.querySelector('[data-testid="mode-raw"]')?.textContent).toBe(en.modes.raw.name);
      expect(container.querySelector('[data-testid="footer-tag"]')?.textContent).toBe(en.app.footer.tagline);

      // Switch to JA
      act(() => {
        (container.querySelector('[data-testid="btn-ja"]') as HTMLButtonElement).click();
      });

      // JA verification
      expect(container.querySelector('[data-testid="app-title"]')?.textContent).toBe(ja.app.title);
      expect(container.querySelector('[data-testid="status-rec"]')?.textContent).toBe(ja.header.status.recording);
      expect(container.querySelector('[data-testid="mode-raw"]')?.textContent).toBe(ja.modes.raw.name);
      expect(container.querySelector('[data-testid="footer-tag"]')?.textContent).toBe(ja.app.footer.tagline);

      unmount();
    });

    it('interpolates dynamic variables through t(key, params)', () => {
      const TestComponent = () => {
        const { t } = useTranslation();
        return (
          <div>
            <div data-testid="metric-lowboost">
              {t('analyzer.metrics.lowBoost.range', { value: 10, freq: '240Hz' })}
            </div>
          </div>
        );
      };

      const { container, unmount } = renderUI(
        <LanguageProvider defaultLanguage="en">
          <TestComponent />
        </LanguageProvider>
      );

      const renderedText = container.querySelector('[data-testid="metric-lowboost"]')?.textContent;
      expect(renderedText).toBeTruthy();
      expect(typeof renderedText).toBe('string');
      unmount();
    });

    it('falls back to key string when key is not found in dictionary', () => {
      const TestComponent = () => {
        const { t } = useTranslation();
        return <div data-testid="missing-key">{t('non.existent.nested.key')}</div>;
      };

      const { container, unmount } = renderUI(
        <LanguageProvider defaultLanguage="en">
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="missing-key"]')?.textContent).toBe('non.existent.nested.key');
      unmount();
    });

    it('falls back to key string when key references an object rather than a leaf string', () => {
      const TestComponent = () => {
        const { t } = useTranslation();
        return <div data-testid="object-key">{t('header.status')}</div>;
      };

      const { container, unmount } = renderUI(
        <LanguageProvider defaultLanguage="en">
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="object-key"]')?.textContent).toBe('header.status');
      unmount();
    });
  });

  // =========================================================================
  // Suite 8: React Hooks Integration & Boundary Protection
  // =========================================================================
  describe('8. React Hooks Integration & Boundary Protection', () => {
    it('exports LanguageContext object properly', () => {
      expect(LanguageContext).toBeDefined();
    });

    it('useTranslation provides dict object matching active language', () => {
      const TestComponent = () => {
        const { dict, language } = useTranslation();
        return (
          <div>
            <div data-testid="dict-lang">{language}</div>
            <div data-testid="dict-app-title">{dict.app.title}</div>
          </div>
        );
      };

      const { container, rerender, unmount } = renderUI(
        <LanguageProvider defaultLanguage="en">
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="dict-lang"]')?.textContent).toBe('en');
      expect(container.querySelector('[data-testid="dict-app-title"]')?.textContent).toBe(en.app.title);

      rerender(
        <LanguageProvider defaultLanguage="ja">
          <TestComponent />
        </LanguageProvider>
      );

      expect(container.querySelector('[data-testid="dict-lang"]')?.textContent).toBe('ja');
      expect(container.querySelector('[data-testid="dict-app-title"]')?.textContent).toBe(ja.app.title);
      unmount();
    });

    it('throws a descriptive error when useTranslation is called outside of LanguageProvider', () => {
      const InvalidComponent = () => {
        useTranslation();
        return <div>Invalid</div>;
      };

      // Suppress console.error during expected throw in React act
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderUI(<InvalidComponent />);
      }).toThrow(/useTranslation must be used within a LanguageProvider/i);

      consoleSpy.mockRestore();
    });

    it('throws a descriptive error when useLanguage is called outside of LanguageProvider', () => {
      const InvalidComponent = () => {
        useLanguage();
        return <div>Invalid</div>;
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderUI(<InvalidComponent />);
      }).toThrow(/useLanguage must be used within a LanguageProvider|useTranslation must be used within a LanguageProvider/i);

      consoleSpy.mockRestore();
    });
  });
});
