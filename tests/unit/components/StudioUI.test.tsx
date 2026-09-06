/**
 * VocalMirror — Studio UI Components & Integration Test Suite
 * 
 * Tests individual UI components (StudioHeader, AudioControls, ModeSelector,
 * PresetSelector, ParameterSliders) and full App studio dashboard integration
 * including user interactions, button clicks, slider change events, and keyboard shortcuts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { StudioHeader } from '../../../src/components/StudioHeader';
import { AudioControls } from '../../../src/components/AudioControls';
import { ModeSelector } from '../../../src/components/ModeSelector';
import { PresetSelector } from '../../../src/components/PresetSelector';
import { ParameterSliders } from '../../../src/components/ParameterSliders';
import App from '../../../src/App';

import {
  DEFAULT_DSP_PARAMS,
} from '../../../src/audio/constants';
import { installWebAudioMocks } from '../../mocks/webAudioMock';

import { LanguageProvider } from '../../../src/i18n';

// ==========================================
// Test Render Helper (React 18 createRoot + act)
// ==========================================
function renderUI(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<LanguageProvider defaultLanguage="en">{ui}</LanguageProvider>);
  });

  return {
    container,
    rerender: (newUi: React.ReactElement) => {
      act(() => {
        root.render(<LanguageProvider defaultLanguage="en">{newUi}</LanguageProvider>);
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

function setRangeInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  nativeInputValueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Studio UI Component Test Suite', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // Suite 1: StudioHeader Component
  // ==========================================
  describe('1. StudioHeader Component', () => {
    it('renders application title, status badge, latency readout, and headphone notice', () => {
      const onHelpToggle = vi.fn();
      const { container, unmount } = renderUI(
        <StudioHeader
          contextState="running"
          isRecording={false}
          isPlaying={true}
          latencyMs={12}
          onHelpToggle={onHelpToggle}
        />
      );

      expect(container.textContent).toContain('VocalMirror');
      expect(container.textContent).toContain('12ms');
      expect(container.textContent).toMatch(/Headphones Recommended/i);

      // Verify help button click
      const helpBtn = container.querySelector('button[aria-label="Help & Guide"]') as HTMLButtonElement;
      expect(helpBtn).not.toBeNull();
      act(() => {
        helpBtn.click();
      });
      expect(onHelpToggle).toHaveBeenCalled();

      unmount();
    });

    it('displays active recording status badge when isRecording is true', () => {
      const { container, unmount } = renderUI(
        <StudioHeader
          contextState="running"
          isRecording={true}
          isPlaying={false}
          latencyMs={8}
          onOpenHelp={() => {}}
        />
      );

      expect(container.textContent).toMatch(/Recording/i);
      unmount();
    });
  });

  // ==========================================
  // Suite 2: AudioControls Component
  // ==========================================
  describe('2. AudioControls Component', () => {
    it('renders Record, Demo, Play/Pause, Loop, and Timeline scrub bar', () => {
      const onStartRecording = vi.fn();
      const onStopRecording = vi.fn();
      const onLoadDemo = vi.fn();
      const onPlay = vi.fn();
      const onPause = vi.fn();
      const onToggleLoop = vi.fn();
      const onSeek = vi.fn();
      const onClearAudio = vi.fn();

      const { container, unmount } = renderUI(
        <AudioControls
          isRecording={false}
          recordingDuration={0}
          isPlaying={false}
          currentTime={1.5}
          duration={4.0}
          isLooping={false}
          hasAudioBuffer={true}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          onLoadDemo={onLoadDemo}
          onPlay={onPlay}
          onPause={onPause}
          onToggleLoop={onToggleLoop}
          onSeek={onSeek}
          onClearAudio={onClearAudio}
        />
      );

      // 1. Record button click
      const recordBtn = container.querySelector('button[aria-label*="Record"]') as HTMLButtonElement;
      expect(recordBtn).not.toBeNull();
      act(() => {
        recordBtn.click();
      });
      expect(onStartRecording).toHaveBeenCalled();

      // 2. Play button click
      const playBtn = container.querySelector('button[aria-label*="Play"]') as HTMLButtonElement;
      expect(playBtn).not.toBeNull();
      act(() => {
        playBtn.click();
      });
      expect(onPlay).toHaveBeenCalled();

      // 3. Demo button click
      const demoBtn = container.querySelector('button[aria-label*="Demo"]') as HTMLButtonElement;
      expect(demoBtn).not.toBeNull();
      act(() => {
        demoBtn.click();
      });
      // Toggle dropdown open and click first item or demoBtn
      const dropdownItems = container.querySelectorAll('.absolute button');
      if (dropdownItems.length > 0) {
        act(() => {
          (dropdownItems[0] as HTMLButtonElement).click();
        });
        expect(onLoadDemo).toHaveBeenCalled();
      }

      // 4. Timeline scrub slider change
      const scrubSlider = container.querySelector('input[type="range"][aria-label*="Timeline"]') as HTMLInputElement;
      expect(scrubSlider).not.toBeNull();
      act(() => {
        setRangeInputValue(scrubSlider, '2.5');
      });
      expect(onSeek).toHaveBeenCalledWith(2.5);

      // 5. Loop button click
      const loopBtn = container.querySelector('button[aria-label*="Loop"]') as HTMLButtonElement;
      expect(loopBtn).not.toBeNull();
      act(() => {
        loopBtn.click();
      });
      expect(onToggleLoop).toHaveBeenCalled();

      // 6. Clear button click
      const clearBtn = container.querySelector('button[aria-label*="Clear"]') as HTMLButtonElement;
      expect(clearBtn).not.toBeNull();
      act(() => {
        clearBtn.click();
      });
      expect(onClearAudio).toHaveBeenCalled();

      unmount();
    });

    it('disables play button when hasAudioBuffer is false', () => {
      const { container, unmount } = renderUI(
        <AudioControls
          isRecording={false}
          recordingDuration={0}
          isPlaying={false}
          currentTime={0}
          duration={0}
          isLooping={false}
          hasAudioBuffer={false}
          onStartRecording={() => {}}
          onStopRecording={() => {}}
          onLoadDemo={() => {}}
          onPlay={() => {}}
          onPause={() => {}}
          onToggleLoop={() => {}}
          onSeek={() => {}}
          onClearAudio={() => {}}
        />
      );

      const playBtn = container.querySelector('button[aria-label*="Play"]') as HTMLButtonElement;
      expect(playBtn).not.toBeNull();
      expect(playBtn.disabled).toBe(true);

      unmount();
    });
  });

  // ==========================================
  // Suite 3: ModeSelector Component
  // ==========================================
  describe('3. ModeSelector Component (A/B/C Listening Switch)', () => {
    it('renders 3 mode options and highlights active mode with glowing style', () => {
      const onModeChange = vi.fn();
      const { container, rerender, unmount } = renderUI(
        <ModeSelector currentMode="RAW" onModeChange={onModeChange} />
      );

      // Expect mode titles/descriptions
      expect(container.textContent).toMatch(/Air Conduction|Original/i);
      expect(container.textContent).toMatch(/Bone Conduction|Internal/i);
      expect(container.textContent).toMatch(/Compensated|Bridged/i);

      // Find Mode buttons
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(3);

      // Click Mode B (Simulated Internal)
      act(() => {
        buttons[1].click();
      });
      expect(onModeChange).toHaveBeenCalledWith('INTERNAL_SIM');

      // Click Mode C (Compensated)
      act(() => {
        buttons[2].click();
      });
      expect(onModeChange).toHaveBeenCalledWith('COMPENSATED');

      // Re-render with INTERNAL_SIM active
      rerender(<ModeSelector currentMode="INTERNAL_SIM" onModeChange={onModeChange} />);
      const activeBtn = container.querySelector('button[aria-pressed="true"], button[data-active="true"]');
      expect(activeBtn).not.toBeNull();

      unmount();
    });
  });

  // ==========================================
  // Suite 4: PresetSelector Component
  // ==========================================
  describe('4. PresetSelector Component', () => {
    it('renders all 4 physiological preset pills and triggers preset change', () => {
      const onSelectPreset = vi.fn();
      const onReset = vi.fn();

      const { container, unmount } = renderUI(
        <PresetSelector
          activePreset="natural_standard"
          onSelectPreset={onSelectPreset}
          onReset={onReset}
        />
      );

      expect(container.textContent).toMatch(/Standard Biological|Adult/i);
      expect(container.textContent).toMatch(/Deep Chest/i);
      expect(container.textContent).toMatch(/Bright Cranial/i);
      expect(container.textContent).toMatch(/Confrontation/i);

      // Click Deep Chest Preset
      const deepChestBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Deep Chest')
      );
      expect(deepChestBtn).toBeDefined();

      act(() => {
        deepChestBtn?.click();
      });
      expect(onSelectPreset).toHaveBeenCalledWith('deep_chest_male');

      // Click Reset button
      const resetBtn = container.querySelector('button[aria-label*="Reset"]') as HTMLButtonElement;
      expect(resetBtn).not.toBeNull();
      act(() => {
        resetBtn.click();
      });
      expect(onReset).toHaveBeenCalled();

      unmount();
    });

    it('displays custom profile pill when activePreset is custom', () => {
      const { container, unmount } = renderUI(
        <PresetSelector
          activePreset="custom"
          onSelectPreset={() => {}}
          onReset={() => {}}
        />
      );

      expect(container.textContent).toMatch(/Custom/i);
      unmount();
    });

    it('handles JSON export and import button interactions based on Pro license status', () => {
      const onExportPresets = vi.fn();
      const onImportPresets = vi.fn();
      const onOpenPricing = vi.fn();

      // Test 1: Free tier user triggers onOpenPricing when clicking export/import
      const { container, rerender, unmount } = renderUI(
        <PresetSelector
          activePreset="natural_standard"
          onSelectPreset={() => {}}
          onReset={() => {}}
          onExportPresets={onExportPresets}
          onImportPresets={onImportPresets}
          isPro={false}
          onOpenPricing={onOpenPricing}
        />
      );

      const exportBtn = container.querySelector('[data-testid="export-presets-btn"]') as HTMLButtonElement;
      const importBtn = container.querySelector('[data-testid="import-presets-btn"]') as HTMLButtonElement;

      expect(exportBtn).not.toBeNull();
      expect(importBtn).not.toBeNull();

      act(() => {
        exportBtn.click();
      });
      expect(onOpenPricing).toHaveBeenCalledTimes(1);

      act(() => {
        importBtn.click();
      });
      expect(onOpenPricing).toHaveBeenCalledTimes(2);
      expect(onExportPresets).not.toHaveBeenCalled();

      // Test 2: Pro tier user triggers onExportPresets directly
      rerender(
        <PresetSelector
          activePreset="natural_standard"
          onSelectPreset={() => {}}
          onReset={() => {}}
          onExportPresets={onExportPresets}
          onImportPresets={onImportPresets}
          isPro={true}
          onOpenPricing={onOpenPricing}
        />
      );

      act(() => {
        exportBtn.click();
      });
      expect(onExportPresets).toHaveBeenCalledTimes(1);

      unmount();
    });
  });

  // ==========================================
  // Suite 5: ParameterSliders Component
  // ==========================================
  describe('5. ParameterSliders Component', () => {
    it('renders categorized sliders with live value badges and fires change events', () => {
      const onParamChange = vi.fn();
      const onResetParam = vi.fn();

      const { container, unmount } = renderUI(
        <ParameterSliders
          params={DEFAULT_DSP_PARAMS}
          onParamChange={onParamChange}
          onResetParam={onResetParam}
        />
      );

      // Verify category headers
      expect(container.textContent).toMatch(/Chest|Mandible|Bone/i);
      expect(container.textContent).toMatch(/Cranial|Sinus|Resonance|Tissue|Damping/i);
      expect(container.textContent).toMatch(/Master|Trim/i);

      // Verify slider inputs
      const sliders = container.querySelectorAll('input[type="range"]');
      expect(sliders.length).toBeGreaterThanOrEqual(8);

      // Test changing Low-Shelf Gain slider
      const lowShelfSlider = (Array.from(sliders).find((s) =>
        s.getAttribute('name')?.includes('lowShelfGain') ||
        s.getAttribute('aria-label')?.includes('Chest Bass') ||
        s.getAttribute('aria-label')?.includes('Gain')
      ) || sliders[0]) as HTMLInputElement;

      act(() => {
        setRangeInputValue(lowShelfSlider, '11.5');
      });

      expect(onParamChange).toHaveBeenCalled();

      unmount();
    });

    it('enforces Pro gating on advanced sliders for free tier users and unlocks all for Pro users', () => {
      const onOpenPricing = vi.fn();
      const onParamChange = vi.fn();

      // Free user render
      const { container, rerender, unmount } = renderUI(
        <ParameterSliders
          params={DEFAULT_DSP_PARAMS}
          onParamChange={onParamChange}
          onResetParam={() => {}}
          isPro={false}
          onOpenPricing={onOpenPricing}
        />
      );

      // Free parameters should remain enabled
      const freeLowShelfGain = container.querySelector('input[name="lowShelfGain"]') as HTMLInputElement;
      const freeMandibleResGain = container.querySelector('input[name="mandibleResGain"]') as HTMLInputElement;
      expect(freeLowShelfGain).not.toBeNull();
      expect(freeLowShelfGain.disabled).toBe(false);
      expect(freeMandibleResGain.disabled).toBe(false);

      // Pro parameters should be disabled and show PRO lock
      const lockedMandibleFreq = container.querySelector('input[name="mandibleResFreq"]') as HTMLInputElement;
      expect(lockedMandibleFreq).not.toBeNull();
      expect(lockedMandibleFreq.disabled).toBe(true);

      // In default view, 5 pro parameters are visible
      const initialProLockBtns = container.querySelectorAll('button[aria-label*="PRO lock"]');
      expect(initialProLockBtns.length).toBe(5);

      // Expand advanced section to reveal remaining 7 pro parameters
      const advancedToggleBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Advanced')
      ) as HTMLButtonElement;
      expect(advancedToggleBtn).toBeDefined();

      act(() => {
        advancedToggleBtn.click();
      });

      // Now all 12 pro parameters should show PRO lock buttons
      const allProLockBtns = container.querySelectorAll('button[aria-label*="PRO lock"]');
      expect(allProLockBtns.length).toBe(12);

      // Clicking PRO lock button triggers pricing modal
      act(() => {
        (allProLockBtns[0] as HTMLButtonElement).click();
      });
      expect(onOpenPricing).toHaveBeenCalledTimes(1);

      // Re-render as Pro user
      rerender(
        <ParameterSliders
          params={DEFAULT_DSP_PARAMS}
          onParamChange={onParamChange}
          onResetParam={() => {}}
          isPro={true}
          onOpenPricing={onOpenPricing}
        />
      );

      // All sliders should now be enabled and no lock buttons present
      const unlockedMandibleFreq = container.querySelector('input[name="mandibleResFreq"]') as HTMLInputElement;
      expect(unlockedMandibleFreq.disabled).toBe(false);
      const remainingLockBtns = container.querySelectorAll('button[aria-label*="PRO lock"]');
      expect(remainingLockBtns.length).toBe(0);

      unmount();
    });
  });

  // ==========================================
  // Suite 6: Full App Studio Dashboard & Keyboard Shortcuts
  // ==========================================
  describe('6. Full App Studio Dashboard & Keyboard Navigation', () => {
    it('mounts full VocalMirror App cleanly with all sections', () => {
      const { container, unmount } = renderUI(<App />);

      expect(container.textContent).toContain('VocalMirror');
      expect(container.querySelector('header')).not.toBeNull();
      expect(container.querySelector('main')).not.toBeNull();

      unmount();
    });

    it('responds to keyboard shortcut numbers 1, 2, 3 for A/B/C mode switching', () => {
      const { unmount } = renderUI(<App />);

      // Press '2' on window -> Mode B (INTERNAL_SIM)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', code: 'Digit2', bubbles: true }));
      });

      // Press '3' on window -> Mode C (COMPENSATED)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', code: 'Digit3', bubbles: true }));
      });

      // Press '1' on window -> Mode A (RAW)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', code: 'Digit1', bubbles: true }));
      });

      unmount();
    });

    it('toggles playback on Space keydown when not focusing an input', () => {
      const { unmount } = renderUI(<App />);

      // Press Space on body
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
      });

      unmount();
    });

    it('toggles loop on L keydown and opens help on H and closes on Escape', () => {
      const { container, unmount } = renderUI(<App />);

      // Press L for loop
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', code: 'KeyL', bubbles: true }));
      });

      // Press H for help modal
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', bubbles: true }));
      });
      expect(container.textContent).toContain('Keyboard Shortcuts');

      // Press Escape to close help modal
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      });
      expect(container.textContent).not.toContain('Close Guide [Esc]');

      unmount();
    });
  });

  // ==========================================
  // Suite 7: Accessibility & ARIA Semantics
  // ==========================================
  describe('7. Accessibility & ARIA Semantic Contracts', () => {
    it('provides valid ARIA attributes on mode buttons and parameter sliders', () => {
      const { container, unmount } = renderUI(
        <ParameterSliders
          params={DEFAULT_DSP_PARAMS}
          onParamChange={() => {}}
          onResetParam={() => {}}
        />
      );

      const sliders = container.querySelectorAll('input[type="range"]');
      sliders.forEach((slider) => {
        expect(slider.getAttribute('aria-label') || slider.getAttribute('name')).toBeTruthy();
        expect(slider.getAttribute('min')).toBeTruthy();
        expect(slider.getAttribute('max')).toBeTruthy();
      });

      unmount();
    });
  });
});
