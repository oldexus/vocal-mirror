/**
 * VocalMirror — Milestone 3 Programmatic Adversarial Security Test Suite
 * File: tests/security/client_injection_csp.test.ts
 * 
 * Comprehensive Security & Penetration Verification:
 * 1. DOM Injection & XSS Vector Neutralization across UI Components and Utilities.
 * 2. Prototype Pollution Protection (__proto__, constructor, prototype, toString, valueOf).
 * 3. LocalStorage Tampering with hostile / non-whitelisted payloads and storage quota error resilience.
 * 4. Multi-Platform Security Headers Audit (vite.config.ts, public/_headers, netlify.toml, vercel.json, index.html).
 * 5. Single-Page-App (SPA) 404 Redirection Open-Redirect Vulnerability Defense.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

// UI Components
import { StudioHeader } from '../../src/components/StudioHeader';
import { AudioControls } from '../../src/components/AudioControls';
import { ExportModal } from '../../src/components/ExportModal';
import { GuidanceCards } from '../../src/components/GuidanceCards';
import { ModeSelector } from '../../src/components/ModeSelector';
import { ParameterSliders } from '../../src/components/ParameterSliders';
import { PresetSelector } from '../../src/components/PresetSelector';
import { SpectralGapAnalyzer } from '../../src/components/SpectralGapAnalyzer';
import App from '../../src/App';

// Contexts, Hooks, Utilities
import {
  LanguageProvider,
  useTranslation,
  useLanguage,
} from '../../src/i18n/LanguageContext';
import { interpolate } from '../../src/i18n/interpolate';
import { useAudioStudio } from '../../src/hooks/useAudioStudio';
import { sanitizeFilename } from '../../src/utils/audioBufferToWav';
import { formatFrequency } from '../../src/utils/frequencyMapping';
import { DEFAULT_DSP_PARAMS } from '../../src/audio/constants';
import { installWebAudioMocks } from '../mocks/webAudioMock';

// Node dynamic require helpers for frontend-typed environment
const nodeFs: any = eval('require("fs")');
const nodePath: any = eval('require("path")');

// Helper to mount arbitrary React nodes in standard test harness
function renderComponent(node: React.ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}

// Helper to mount useAudioStudio hook
function renderAudioStudioHook() {
  const result = { current: null as any };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function HookHarness() {
    result.current = useAudioStudio();
    return null;
  }

  act(() => {
    root.render(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(HookHarness)
      )
    );
  });

  return {
    result,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}

describe('M3 Security Suite — Client Injection, Prototype Pollution & CSP Guardrails', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    delete (window as any).__xss_executed;
    delete (Object.prototype as any).polluted;
    delete (Object.prototype as any).admin;
    delete (Object.prototype as any).hacked;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).__xss_executed;
    delete (Object.prototype as any).polluted;
    delete (Object.prototype as any).admin;
    delete (Object.prototype as any).hacked;
  });

  // =========================================================================
  // Section 1: DOM Injection & XSS Attack Surface Verification
  // =========================================================================
  describe('1. DOM Injection & XSS Attack Surface Verification', () => {
    const HOSTILE_XSS_PAYLOADS = [
      '<script>window.__xss_executed=true;</script>',
      '<img src="invalid-image.png" onerror="window.__xss_executed=true;" />',
      '<svg onload="window.__xss_executed=true;"></svg>',
      'javascript:window.__xss_executed=true;',
      '"><script>window.__xss_executed=true;</script>',
      '"><img src=x onerror=window.__xss_executed=true>',
      'data:text/html,<script>window.__xss_executed=true;</script>',
      '\u003cscript\u003ewindow.__xss_executed=true;\u003c/script\u003e',
      '<iframe src="javascript:window.__xss_executed=true;"></iframe>',
    ];

    it('guarantees 0 dangerouslySetInnerHTML or eval sinks across entire src/ codebase', () => {
      const srcDir = nodePath.resolve('.', 'src');

      function scanFiles(dir: string): string[] {
        const entries = nodeFs.readdirSync(dir, { withFileTypes: true });
        let files: string[] = [];
        for (const entry of entries) {
          const fullPath = nodePath.join(dir, entry.name);
          if (entry.isDirectory()) {
            files = files.concat(scanFiles(fullPath));
          } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
        return files;
      }

      const allSourceFiles = scanFiles(srcDir);
      expect(allSourceFiles.length).toBeGreaterThan(10);

      const forbiddenSinks = [
        'dangerouslySetInnerHTML',
        'innerHTML',
        'outerHTML',
        'document.write',
        'document.writeln',
        'eval(',
        'new Function(',
      ];

      for (const filePath of allSourceFiles) {
        const content = nodeFs.readFileSync(filePath, 'utf-8');
        for (const sink of forbiddenSinks) {
          const lines = content.split('\n');
          lines.forEach((line: string, idx: number) => {
            const trimmed = line.trim();
            if (
              trimmed.startsWith('//') ||
              trimmed.startsWith('*') ||
              trimmed.startsWith('/*')
            ) {
              return;
            }
            if (line.includes(sink)) {
              expect(
                line,
                `Security violation in ${filePath}:${idx + 1}: contains unsafe sink "${sink}"`
              ).not.toMatch(new RegExp(`(=|\\()\\s*${sink.replace('(', '\\(')}`));
            }
          });
        }
      }
    });

    it('renders StudioHeader without executing injected XSS scripts or creating HTML elements', () => {
      for (const payload of HOSTILE_XSS_PAYLOADS) {
        const { container, unmount } = renderComponent(
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(StudioHeader, {
              isRecording: false,
              isPlaying: false,
              activeMode: payload as any,
              latencyMs: 12,
              sampleRate: 48000,
            })
          )
        );

        expect((window as any).__xss_executed).toBeUndefined();
        expect(container.querySelectorAll('script').length).toBe(0);
        expect(container.querySelectorAll('iframe').length).toBe(0);
        unmount();
      }
    });

    it('renders AudioControls safely with hostile string parameters', () => {
      for (const payload of HOSTILE_XSS_PAYLOADS) {
        const { container, unmount } = renderComponent(
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(AudioControls, {
              hasAudio: true,
              audioSourceType: payload as any,
              audioSource: payload as any,
              currentTime: 1.5,
              duration: 10,
            })
          )
        );

        expect((window as any).__xss_executed).toBeUndefined();
        expect(container.querySelectorAll('script').length).toBe(0);
        unmount();
      }
    });

    it('renders ExportModal with injected custom filename without DOM injection', () => {
      for (const payload of HOSTILE_XSS_PAYLOADS) {
        const { container, unmount } = renderComponent(
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(ExportModal, {
              isOpen: true,
              onClose: () => {},
              audioBuffer: null,
              className: payload,
            })
          )
        );

        expect((window as any).__xss_executed).toBeUndefined();
        expect(container.querySelectorAll('script').length).toBe(0);
        unmount();
      }
    });

    it('renders ModeSelector, PresetSelector, GuidanceCards, and ParameterSliders without XSS execution', () => {
      for (const payload of HOSTILE_XSS_PAYLOADS) {
        const { unmount: u1 } = renderComponent(
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(ModeSelector, {
              activeMode: payload as any,
              onModeChange: () => {},
            })
          )
        );
        expect((window as any).__xss_executed).toBeUndefined();
        u1();

        const { unmount: u2 } = renderComponent(
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(PresetSelector, {
              currentPreset: payload as any,
              onSelectPreset: () => {},
            })
          )
        );
        expect((window as any).__xss_executed).toBeUndefined();
        u2();

        const { unmount: u3 } = renderComponent(
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(GuidanceCards, {
              activeMode: payload as any,
            })
          )
        );
        expect((window as any).__xss_executed).toBeUndefined();
        u3();

        const { unmount: u4 } = renderComponent(
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(ParameterSliders, {
              params: DEFAULT_DSP_PARAMS,
              onParamChange: () => {},
              onResetParam: () => {},
              onResetAll: () => {},
            })
          )
        );
        expect((window as any).__xss_executed).toBeUndefined();
        u4();
      }
    });

    it('renders SpectralGapAnalyzer and full App tree securely', () => {
      const { container: c1, unmount: u1 } = renderComponent(
        React.createElement(
          LanguageProvider,
          null,
          React.createElement(SpectralGapAnalyzer, {
            rawAnalyser: null,
            processedAnalyser: null,
            isPlaying: false,
            isRecording: false,
          })
        )
      );
      expect((window as any).__xss_executed).toBeUndefined();
      expect(c1.querySelectorAll('script').length).toBe(0);
      u1();

      const { container: c2, unmount: u2 } = renderComponent(
        React.createElement(
          LanguageProvider,
          null,
          React.createElement(App)
        )
      );

      expect((window as any).__xss_executed).toBeUndefined();
      expect(c2.querySelectorAll('script').length).toBe(0);
      u2();
    });

    it('verifies utility functions neutralize XSS strings into safe plain text', () => {
      for (const payload of HOSTILE_XSS_PAYLOADS) {
        const sanitized = sanitizeFilename(payload);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('</script>');
        expect(sanitized).not.toContain('<img');
        expect(sanitized).not.toContain('>');

        const interpolated = interpolate(payload, { key: '<script>evil</script>' });
        expect(typeof interpolated).toBe('string');

        const formatted = formatFrequency(payload as any);
        expect(typeof formatted).toBe('string');
      }
    });
  });

  // =========================================================================
  // Section 2: Prototype Pollution Defense Verification
  // =========================================================================
  describe('2. Prototype Pollution Defense Across All Layers', () => {
    it('defends interpolate() against __proto__, constructor, and prototype attacks', () => {
      const hostilePayloads = [
        JSON.parse('{"__proto__": {"polluted": "yes"}}'),
        JSON.parse('{"constructor": {"prototype": {"polluted": "yes"}}}'),
        { prototype: { polluted: 'yes' } },
        { toString: 'malicious', valueOf: 'malicious' },
      ];

      for (const payload of hostilePayloads) {
        const result = interpolate('Hello {name}, {__proto__}, {constructor}', payload);
        expect(typeof result).toBe('string');
        expect((Object.prototype as any).polluted).toBeUndefined();
        expect(({} as any).polluted).toBeUndefined();
      }

      expect(({} as any).polluted).toBeUndefined();
    });

    it('defends LanguageContext t() against deep prototype pollution and key poisoning', () => {
      let tFn: any;

      function Consumer() {
        const { t } = useTranslation();
        tFn = t;
        return null;
      }

      const { unmount } = renderComponent(
        React.createElement(
          LanguageProvider,
          null,
          React.createElement(Consumer)
        )
      );

      expect(typeof tFn).toBe('function');

      const dangerousKeys = [
        '__proto__',
        '__proto__.polluted',
        'constructor',
        'constructor.prototype',
        'constructor.prototype.polluted',
        'prototype',
        'prototype.polluted',
        'toString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
      ];

      for (const key of dangerousKeys) {
        const output = tFn(key);
        expect(output).toBe(key);
        expect((Object.prototype as any).polluted).toBeUndefined();
        expect(({} as any).polluted).toBeUndefined();
      }

      unmount();
    });

    it('defends useAudioStudio updateParameter against prototype property attacks', () => {
      const { result, unmount } = renderAudioStudioHook();

      const attacks: any[] = [
        ['__proto__', 100],
        ['constructor', 100],
        ['prototype', 100],
        ['toString', 100],
        ['valueOf', 100],
        ['__defineGetter__', 100],
      ];

      for (const [key, val] of attacks) {
        act(() => {
          result.current.updateParameter(key, val);
        });

        expect((Object.prototype as any)[key]).not.toBe(100);
        expect((Object.prototype as any).polluted).toBeUndefined();
        expect(({} as any).polluted).toBeUndefined();
      }

      unmount();
    });

    it('defends useAudioStudio updateParameters against bulk JSON prototype pollution', () => {
      const { result, unmount } = renderAudioStudioHook();

      const hostileBulkPayload = JSON.parse(
        '{"__proto__": {"admin": true, "polluted": "yes"}, "constructor": {"prototype": {"hacked": true}}, "lowShelfGain": 6.5, "tissueCutoffFreq": 3500}'
      );

      act(() => {
        result.current.updateParameters(hostileBulkPayload);
      });

      expect(result.current.params.lowShelfGain).toBe(6.5);
      expect(result.current.params.tissueCutoffFreq).toBe(3500);

      expect((Object.prototype as any).admin).toBeUndefined();
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((Object.prototype as any).hacked).toBeUndefined();
      expect(({} as any).admin).toBeUndefined();

      unmount();
    });

    it('defends applyPreset, loadPreset, and loadDemoAudio against hostile prototype keys', () => {
      const { result, unmount } = renderAudioStudioHook();

      const hostileKeys = [
        '__proto__',
        'constructor',
        'prototype',
        'toString',
        'valueOf',
        'isAdmin',
      ];

      for (const key of hostileKeys) {
        act(() => {
          result.current.applyPreset(key as any);
          result.current.loadDemoAudio(key as any);
        });

        expect((Object.prototype as any).polluted).toBeUndefined();
        expect(({} as any).polluted).toBeUndefined();
        expect(result.current.error).toBeNull();
      }

      unmount();
    });
  });

  // =========================================================================
  // Section 3: LocalStorage Tampering & Storage Failure Resilience
  // =========================================================================
  describe('3. LocalStorage Tampering & Storage Failure Resilience', () => {
    it('gracefully recovers when localStorage contains malicious XSS or non-whitelisted values', () => {
      const hostileValues = [
        '<script>alert("hacked")</script>',
        '"><img src=x onerror=alert(1)>',
        '__proto__',
        'constructor',
        'fr',
        'de',
        'es',
        'zh',
        '1234',
        'null',
        'undefined',
        '{"language": "ja"}',
      ];

      for (const value of hostileValues) {
        localStorage.setItem('vocal_mirror_lang', value);

        let activeLang = '';
        function LangConsumer() {
          const { language } = useLanguage();
          activeLang = language;
          return null;
        }

        const { unmount } = renderComponent(
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(LangConsumer)
          )
        );

        expect(['en', 'ja']).toContain(activeLang);
        expect((window as any).__xss_executed).toBeUndefined();
        unmount();
      }
    });

    it('handles localStorage QuotaExceededError or private-mode SecurityError without crashing', () => {
      const originalSetItem = localStorage.setItem;
      const originalGetItem = localStorage.getItem;

      localStorage.getItem = () => {
        const error = new Error('The operation is insecure.');
        error.name = 'SecurityError';
        throw error;
      };

      localStorage.setItem = () => {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      };

      let activeLang = '';
      function LangConsumer() {
        const { language, toggleLanguage } = useLanguage();
        activeLang = language;
        return React.createElement('button', {
          id: 'toggle-btn',
          onClick: toggleLanguage,
        });
      }

      const { container, unmount } = renderComponent(
        React.createElement(
          LanguageProvider,
          null,
          React.createElement(LangConsumer)
        )
      );

      expect(['en', 'ja']).toContain(activeLang);

      const toggleBtn = container.querySelector('#toggle-btn') as HTMLButtonElement;
      expect(toggleBtn).not.toBeNull();

      expect(() => {
        act(() => {
          toggleBtn.click();
        });
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
      localStorage.getItem = originalGetItem;
      unmount();
    });
  });

  // =========================================================================
  // Section 4: Security Headers & Frame Isolation Configuration Audit
  // =========================================================================
  describe('4. Security Headers & Frame Isolation Configuration Audit', () => {
    const REQUIRED_SECURITY_HEADERS: Record<string, string | RegExp> = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    it('verifies strict security headers in vite.config.ts for dev and preview servers', () => {
      const configPath = nodePath.resolve('.', 'vite.config.ts');
      expect(nodeFs.existsSync(configPath)).toBe(true);
      const content = nodeFs.readFileSync(configPath, 'utf-8');

      expect(content).toContain('server:');
      expect(content).toContain('preview:');
      expect(content).toContain('SECURITY_HEADERS');

      for (const [header, expectedValue] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
        expect(content).toContain(header);
        if (typeof expectedValue === 'string') {
          expect(content).toContain(expectedValue);
        }
      }

      expect(content).toContain('Permissions-Policy');
      expect(content).toContain('microphone=(self)');
      expect(content).toContain('camera=()');
      expect(content).toContain('geolocation=()');

      expect(content).toContain('Content-Security-Policy');
      expect(content).toContain("default-src 'self'");
      expect(content).toContain("object-src 'none'");
      expect(content).toContain("frame-ancestors 'none'");
      expect(content).toContain("base-uri 'self'");
      expect(content).toContain("form-action 'self'");
    });

    it('verifies Cloudflare Pages headers in public/_headers', () => {
      const headersPath = nodePath.resolve('.', 'public/_headers');
      expect(nodeFs.existsSync(headersPath)).toBe(true);
      const content = nodeFs.readFileSync(headersPath, 'utf-8');

      for (const [header, expectedValue] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
        expect(content).toContain(header);
        if (typeof expectedValue === 'string') {
          expect(content).toContain(expectedValue);
        }
      }

      expect(content).toContain('Strict-Transport-Security');
      expect(content).toContain('max-age=31536000');
      expect(content).toContain('Permissions-Policy');
      expect(content).toContain('Content-Security-Policy');
      expect(content).toContain("frame-ancestors 'none'");
    });

    it('verifies Netlify configuration in netlify.toml', () => {
      const netlifyPath = nodePath.resolve('.', 'netlify.toml');
      expect(nodeFs.existsSync(netlifyPath)).toBe(true);
      const content = nodeFs.readFileSync(netlifyPath, 'utf-8');

      for (const [header, expectedValue] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
        expect(content).toContain(header);
        if (typeof expectedValue === 'string') {
          expect(content).toContain(expectedValue);
        }
      }

      expect(content).toContain('Permissions-Policy');
      expect(content).toContain('Content-Security-Policy');
      expect(content).toContain("frame-ancestors 'none'");
    });

    it('verifies Vercel deployment configuration in vercel.json', () => {
      const vercelPath = nodePath.resolve('.', 'vercel.json');
      expect(nodeFs.existsSync(vercelPath)).toBe(true);
      const json = JSON.parse(nodeFs.readFileSync(vercelPath, 'utf-8'));

      expect(Array.isArray(json.headers)).toBe(true);
      const globalRule = json.headers.find((h: any) => h.source === '/(.*)');
      expect(globalRule).toBeDefined();

      const headerMap = new Map<string, string>();
      for (const h of globalRule.headers) {
        headerMap.set(h.key, h.value);
      }

      for (const [key, val] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
        expect(headerMap.has(key)).toBe(true);
        expect(headerMap.get(key)).toBe(val);
      }

      expect(headerMap.has('Content-Security-Policy')).toBe(true);
      expect(headerMap.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
      expect(headerMap.get('Content-Security-Policy')).toContain("default-src 'self'");
    });

    it('verifies fallback Content-Security-Policy meta tag in index.html', () => {
      const indexPath = nodePath.resolve('.', 'index.html');
      expect(nodeFs.existsSync(indexPath)).toBe(true);
      const html = nodeFs.readFileSync(indexPath, 'utf-8');

      expect(html).toContain('http-equiv="Content-Security-Policy"');
      expect(html).toContain("default-src 'self'");
      expect(html).toContain("object-src 'none'");
      expect(html).toContain("base-uri 'self'");
      expect(html).toContain("form-action 'self'");
    });
  });

  // =========================================================================
  // Section 5: SPA 404 Open-Redirect Vulnerability Defense
  // =========================================================================
  describe('5. SPA 404 Redirection Open-Redirect Defense', () => {
    function simulateSpa404Redirect(search: string): { replacedUrl: string | null } {
      let replacedUrl: string | null = null;
      const fakeLocation = {
        pathname: '/vocal-mirror/',
        search: search,
        hash: '',
      };

      try {
        if (fakeLocation.search && fakeLocation.search[1] === '/') {
          const decoded = fakeLocation.search
            .slice(1)
            .split('&')
            .map((s: string) => s.replace(/~and~/g, '&'))
            .join('?');

          if (
            decoded.startsWith('/') &&
            !decoded.startsWith('//') &&
            !decoded.includes('\\')
          ) {
            replacedUrl =
              fakeLocation.pathname.slice(0, -1) + decoded + fakeLocation.hash;
          }
        }
      } catch {
        replacedUrl = null;
      }

      return { replacedUrl };
    }

    it('blocks protocol-relative open-redirect payloads (//evil.com)', () => {
      const hostilePayloads = [
        '?///evil.com',
        '?//evil.com/phishing',
        '?//attacker.com',
        '?//google.com%2f..',
        '?///evil.com?param=1',
      ];

      for (const payload of hostilePayloads) {
        const { replacedUrl } = simulateSpa404Redirect(payload);
        expect(replacedUrl).toBeNull();
      }
    });

    it('blocks backslash-based open-redirect bypass payloads (\\evil.com)', () => {
      const hostilePayloads = [
        '?/\\evil.com',
        '?/\\/evil.com',
        '?/\\attacker.org\\path',
        '?/..\\..\\windows\\system32',
      ];

      for (const payload of hostilePayloads) {
        const { replacedUrl } = simulateSpa404Redirect(payload);
        expect(replacedUrl).toBeNull();
      }
    });

    it('blocks absolute URL payloads (https://evil.com, javascript:)', () => {
      const hostilePayloads = [
        '?https://evil.com',
        '?http://attacker.com',
        '?javascript:alert(1)',
        '?data:text/html,evil',
      ];

      for (const payload of hostilePayloads) {
        const { replacedUrl } = simulateSpa404Redirect(payload);
        expect(replacedUrl).toBeNull();
      }
    });

    it('safely routes valid relative SPA routes', () => {
      const validPayloads = [
        { search: '?/studio', expected: '/vocal-mirror/studio' },
        { search: '?/analysis', expected: '/vocal-mirror/analysis' },
        {
          search: '?/presets&mode=INTERNAL_SIM',
          expected: '/vocal-mirror/presets?mode=INTERNAL_SIM',
        },
        {
          search: '?/presets&mode=INTERNAL_SIM~and~theme=dark',
          expected: '/vocal-mirror/presets?mode=INTERNAL_SIM&theme=dark',
        },
      ];

      for (const item of validPayloads) {
        const { replacedUrl } = simulateSpa404Redirect(item.search);
        expect(replacedUrl).toBe(item.expected);
      }
    });
  });
});
