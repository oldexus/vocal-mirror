/**
 * VocalMirror — Studio Multilingual Localization Unit Test Suite
 * File: tests/unit/components/StudioLocalization.test.tsx
 * 
 * Verifies dynamic language switching between English (EN) and Japanese (JA)
 * across all studio dashboard components:
 * - StudioHeader & prominent JP/EN language toggle button
 * - ModeSelector A/B/C perceptual listening switcher
 * - PresetSelector cranial physiological presets
 * - ParameterSliders 16-parameter sliders and anatomical descriptions
 * - GuidanceCards psychoacoustic training and anatomical drawer
 * - ExportModal zero-server client-side WAV exporter
 * - SpectralGapAnalyzer labelFormatter integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { LanguageProvider } from '../../../src/i18n';
import { StudioHeader } from '../../../src/components/StudioHeader';
import { ModeSelector } from '../../../src/components/ModeSelector';
import { PresetSelector } from '../../../src/components/PresetSelector';
import { ParameterSliders } from '../../../src/components/ParameterSliders';
import { GuidanceCards } from '../../../src/components/GuidanceCards';
import { ExportModal } from '../../../src/components/ExportModal';
import App from '../../../src/App';
import { DEFAULT_DSP_PARAMS } from '../../../src/audio/constants';
import { installWebAudioMocks, AudioBufferMock } from '../../mocks/webAudioMock';

function renderWithLang(ui: React.ReactElement, lang: 'en' | 'ja' = 'en') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<LanguageProvider defaultLanguage={lang}>{ui}</LanguageProvider>);
  });

  return {
    container,
    rerender: (newUi: React.ReactElement, newLang?: 'en' | 'ja') => {
      act(() => {
        root.render(
          <LanguageProvider defaultLanguage={newLang || lang}>
            {newUi}
          </LanguageProvider>
        );
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

describe('Studio Multilingual Localization (EN & JA)', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
    document.body.innerHTML = '';
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------
  // 1. StudioHeader Language Toggle
  // -------------------------------------------------------------
  describe('1. StudioHeader Localization & Language Switcher', () => {
    it('renders English telemetry, badges, and guide button in EN mode', () => {
      const { container, unmount } = renderWithLang(
        <StudioHeader
          contextState="running"
          isRecording={false}
          isPlaying={false}
          activeMode="RAW"
          latencyMs={12.4}
          sampleRate={48000}
        />,
        'en'
      );

      expect(container.textContent).toContain('Acoustic Perception Calibrator');
      expect(container.textContent).toContain('Headphones Recommended');
      expect(container.textContent).toContain('DSP ENGINE READY');
      expect(container.textContent).toContain('Guide & Shortcuts');

      const toggleBtn = container.querySelector('[data-testid="language-toggle-btn"]');
      expect(toggleBtn).not.toBeNull();
      expect(toggleBtn?.getAttribute('aria-label')).toContain('JP / EN');

      unmount();
    });

    it('renders Japanese telemetry, badges, and guide button in JA mode', () => {
      const { container, unmount } = renderWithLang(
        <StudioHeader
          contextState="running"
          isRecording={false}
          isPlaying={false}
          activeMode="RAW"
          latencyMs={12.4}
          sampleRate={48000}
        />,
        'ja'
      );

      expect(container.textContent).toContain('頭蓋骨伝導音響シミュレータ＆音声対峙スタジオ');
      expect(container.textContent).toContain('ヘッドホン推奨');
      expect(container.textContent).toContain('DSPエンジン待機中');
      expect(container.textContent).toContain('ガイド＆操作方法');

      const toggleBtn = container.querySelector('[data-testid="language-toggle-btn"]');
      expect(toggleBtn?.getAttribute('aria-label')).toContain('JP / EN');

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 2. ModeSelector Localization
  // -------------------------------------------------------------
  describe('2. ModeSelector Localization (A/B/C Listening Modes)', () => {
    it('renders localized Japanese descriptions and mode titles', () => {
      const { container, unmount } = renderWithLang(
        <ModeSelector activeMode="INTERNAL_SIM" onModeChange={() => {}} />,
        'ja'
      );

      expect(container.textContent).toContain('A/B/C 知覚リスニング切替');
      expect(container.textContent).toContain('モードA: 気導音（他者が聴く声）');
      expect(container.textContent).toContain('他者が聴く声 (原音)');
      expect(container.textContent).toContain('モードB: 骨伝導（自分が聴く声）');
      expect(container.textContent).toContain('自分が聴く声 (骨伝導シミュレーション)');
      expect(container.textContent).toContain('モードC: 補正気導音（架け橋の声）');

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 3. PresetSelector Localization
  // -------------------------------------------------------------
  describe('3. PresetSelector Localization', () => {
    it('renders localized preset names, badges, and tooltips in Japanese', () => {
      const { container, unmount } = renderWithLang(
        <PresetSelector activePreset="natural_standard" onSelectPreset={() => {}} />,
        'ja'
      );

      expect(container.textContent).toContain('生体頭蓋音響プリセット');
      expect(container.textContent).toContain('標準成人モデル');
      expect(container.textContent).toContain('深層胸声・下顎骨共鳴');
      expect(container.textContent).toContain('頭蓋高域フォルマント');
      expect(container.textContent).toContain('標準プリセットに戻す');

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 4. ParameterSliders Localization
  // -------------------------------------------------------------
  describe('4. ParameterSliders Localization', () => {
    it('renders localized parameter titles and anatomical section headings in Japanese', () => {
      const { container, unmount } = renderWithLang(
        <ParameterSliders
          params={DEFAULT_DSP_PARAMS}
          onChangeParam={() => {}}
          onResetParam={() => {}}
          onResetAll={() => {}}
        />,
        'ja'
      );

      expect(container.textContent).toContain('知覚キャリブレーション・パラメータ');
      expect(container.textContent).toContain('胸部・下顎骨伝導');
      expect(container.textContent).toContain('頭蓋腔共鳴＆組織減衰');
      expect(container.textContent).toContain('詳細フィルターを表示');
      expect(container.textContent).toContain('胸部低域ブースト');
      expect(container.textContent).toContain('下顎骨共鳴ゲイン');

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 5. GuidanceCards Localization
  // -------------------------------------------------------------
  describe('5. GuidanceCards Localization', () => {
    it('renders localized Japanese guidance titles, subheadings, and mechanisms', () => {
      const { container, unmount } = renderWithLang(<GuidanceCards />, 'ja');

      expect(container.textContent).toContain('心理音響ガイド＆ボイストレーニング');
      expect(container.textContent).toContain('骨伝導の錯覚');
      expect(container.textContent).toContain('胸声とマスク共鳴');
      expect(container.textContent).toContain('シンガーズ・フォルマント');
      expect(container.textContent).toContain('マイク近接効果と音響ブリッジング');

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 6. ExportModal Localization
  // -------------------------------------------------------------
  describe('6. ExportModal Localization', () => {
    it('renders localized Japanese labels, export options, and buttons', () => {
      const mockBuffer = new AudioBufferMock({
        numberOfChannels: 1,
        length: 48000 * 2,
        sampleRate: 48000,
      }) as unknown as AudioBuffer;

      const { container, unmount } = renderWithLang(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="INTERNAL_SIM"
        />,
        'ja'
      );

      expect(container.textContent).toContain('音声トラック書き出し (WAV)');
      expect(container.textContent).toContain('書き出す音響プロファイルを選択');
      expect(container.textContent).toContain('モードB: 骨伝導シミュレーション');
      expect(container.textContent).toContain('全3モードを一括書き出し');
      expect(container.textContent).toContain('16-bit PCM (標準・高互換性)');
      expect(container.textContent).toContain('32-bit Float (マスタリング精度)');
      expect(container.textContent).toContain('WAVをダウンロード');
      expect(container.textContent).toContain('キャンセル');

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 7. Full App Interactive Language Switching
  // -------------------------------------------------------------
  describe('7. Full App Interactive Language Switching via Header Toggle', () => {
    it('switches the entire application UI language dynamically when clicking the JP/EN toggle button', () => {
      const { container, unmount } = renderWithLang(<App />, 'en');

      // 1. Verify initially English
      expect(container.textContent).toContain('Acoustic Perception Calibrator');
      expect(container.textContent).toContain('Perception Calibrator Controls');

      // 2. Click Language Toggle Button
      const toggleBtn = container.querySelector('[data-testid="language-toggle-btn"]') as HTMLButtonElement;
      expect(toggleBtn).not.toBeNull();

      act(() => {
        toggleBtn.click();
      });

      // 3. Verify seamlessly changed to Japanese
      expect(container.textContent).toContain('頭蓋骨伝導音響シミュレータ＆音声対峙スタジオ');
      expect(container.textContent).toContain('知覚キャリブレーション・パラメータ');
      expect(container.textContent).toContain('A/B/C 知覚リスニング切替');

      // 4. Click again -> back to English
      act(() => {
        toggleBtn.click();
      });

      expect(container.textContent).toContain('Acoustic Perception Calibrator');
      expect(container.textContent).toContain('Perception Calibrator Controls');

      unmount();
    });
  });
});
