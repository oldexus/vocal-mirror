/**
 * VocalMirror — Audio Export Modal Component Unit Test Suite
 * File: tests/unit/components/ExportModal.test.tsx
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ExportModal } from '../../../src/components/ExportModal';
import { AcousticEngine } from '../../../src/audio/AcousticEngine';
import { DEFAULT_DSP_PARAMS } from '../../../src/audio/constants';
import {
  AudioBufferMock,
  installWebAudioMocks,
} from '../../mocks/webAudioMock';

import { LanguageProvider } from '../../../src/i18n';

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

describe('ExportModal Component Test Suite', () => {
  let mockBuffer: AudioBuffer;

  beforeEach(() => {
    installWebAudioMocks(globalThis);
    document.body.innerHTML = '';
    vi.useFakeTimers();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    mockBuffer = new AudioBufferMock({
      numberOfChannels: 1,
      length: 48000 * 2, // 2 seconds
      sampleRate: 48000,
    }) as unknown as AudioBuffer;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------
  // 1. Modal Lifecycle & Visibility
  // -------------------------------------------------------------
  describe('1. Modal Lifecycle & Visibility', () => {
    it('returns null and does not render when isOpen is false', () => {
      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={false}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="INTERNAL_SIM"
          params={DEFAULT_DSP_PARAMS}
        />
      );
      expect(container.innerHTML).toBe('');
      unmount();
    });

    it('renders modal dialog, title, backdrop, and close button when isOpen is true', () => {
      const onClose = vi.fn();
      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={onClose}
          audioBuffer={mockBuffer}
          currentMode="INTERNAL_SIM"
          params={DEFAULT_DSP_PARAMS}
        />
      );

      expect(container.textContent).toMatch(/Export Audio Track \(WAV\)/i);
      expect(container.textContent).toMatch(/100% Zero-Server/i);

      // Close button click
      const closeBtn = container.querySelector('button[aria-label="Close export dialog"]') as HTMLButtonElement;
      expect(closeBtn).not.toBeNull();
      act(() => {
        closeBtn.click();
      });
      expect(onClose).toHaveBeenCalled();

      unmount();
    });

    it('closes modal on Escape keydown event', () => {
      const onClose = vi.fn();
      const { unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={onClose}
          audioBuffer={mockBuffer}
          currentMode="INTERNAL_SIM"
          params={DEFAULT_DSP_PARAMS}
        />
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      });
      expect(onClose).toHaveBeenCalled();
      unmount();
    });

    it('closes modal when clicking backdrop outside dialog content', () => {
      const onClose = vi.fn();
      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={onClose}
          audioBuffer={mockBuffer}
          currentMode="INTERNAL_SIM"
          params={DEFAULT_DSP_PARAMS}
        />
      );

      const backdrop = container.querySelector('[data-testid="modal-backdrop"]') as HTMLElement;
      expect(backdrop).not.toBeNull();

      act(() => {
        backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onClose).toHaveBeenCalled();
      unmount();
    });
  });

  // -------------------------------------------------------------
  // 2. Audio Metadata & Buffer Readiness
  // -------------------------------------------------------------
  describe('2. Audio Metadata & Buffer Readiness', () => {
    it('displays duration, sample rate, channel count, and estimated file size when audioBuffer is present', () => {
      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="INTERNAL_SIM"
          params={DEFAULT_DSP_PARAMS}
        />
      );

      expect(container.textContent).toContain('2.00s Audio');
      expect(container.textContent).toContain('48,000 Hz');
      expect(container.textContent).toMatch(/Mono \(1 Channel\)/i);
      expect(container.textContent).toMatch(/KB|MB/i);
      unmount();
    });

    it('displays warning and disables Export button when audioBuffer is null', () => {
      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={null}
          currentMode="INTERNAL_SIM"
          params={DEFAULT_DSP_PARAMS}
        />
      );

      expect(container.textContent).toMatch(/No audio buffer loaded/i);
      const exportBtn = container.querySelector('button[data-testid="export-submit-button"]') as HTMLButtonElement;
      expect(exportBtn.disabled).toBe(true);
      unmount();
    });
  });

  // -------------------------------------------------------------
  // 3. Export Mode Selection (Mode A, B, C, All)
  // -------------------------------------------------------------
  describe('3. Export Listening Mode Configuration', () => {
    it('initializes with currentMode prop and allows selecting Mode A, Mode B, Mode C, and ALL_MODES', () => {
      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="RAW"
          params={DEFAULT_DSP_PARAMS}
        />
      );

      const modeBtnB = container.querySelector('button[data-mode="INTERNAL_SIM"]') as HTMLButtonElement;
      expect(modeBtnB).not.toBeNull();
      act(() => {
        modeBtnB.click();
      });

      const modeBtnC = container.querySelector('button[data-mode="COMPENSATED"]') as HTMLButtonElement;
      expect(modeBtnC).not.toBeNull();
      act(() => {
        modeBtnC.click();
      });

      const modeBtnAll = container.querySelector('button[data-mode="ALL_MODES"]') as HTMLButtonElement;
      expect(modeBtnAll).not.toBeNull();
      act(() => {
        modeBtnAll.click();
      });

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 4. Bit Depth & Encoding Format Options
  // -------------------------------------------------------------
  describe('4. Format & Bit Depth Selection', () => {
    it('defaults to 16-bit PCM and allows switching to 32-bit Float format', () => {
      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="INTERNAL_SIM"
          params={DEFAULT_DSP_PARAMS}
        />
      );

      const float32Btn = container.querySelector('button[data-format="float32"]') as HTMLButtonElement;
      expect(float32Btn).not.toBeNull();
      act(() => {
        float32Btn.click();
      });

      const pcm16Btn = container.querySelector('button[data-format="pcm16"]') as HTMLButtonElement;
      expect(pcm16Btn).not.toBeNull();
      act(() => {
        pcm16Btn.click();
      });

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 5. Custom Filename Input & Extension Sanitization
  // -------------------------------------------------------------
  describe('5. Filename Input & Auto-Sanitization', () => {
    it('provides default filename and allows user modification', () => {
      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="INTERNAL_SIM"
          params={DEFAULT_DSP_PARAMS}
        />
      );

      const filenameInput = container.querySelector('input[data-testid="export-filename-input"]') as HTMLInputElement;
      expect(filenameInput).not.toBeNull();
      expect(filenameInput.value).toMatch(/vocal_mirror/i);

      act(() => {
        filenameInput.value = 'my_custom_vocal_export.wav';
        filenameInput.dispatchEvent(new Event('input', { bubbles: true }));
        filenameInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(filenameInput.value).toBe('my_custom_vocal_export.wav');
      unmount();
    });
  });

  // -------------------------------------------------------------
  // 6. Export Execution & Download Workflow
  // -------------------------------------------------------------
  describe('6. Export Execution & Download Workflow', () => {
    it('processes buffer through AcousticEngine.processBuffer, encodes to WAV, triggers download, and calls onExportSuccess', async () => {
      const onExportSuccess = vi.fn();
      const processBufferSpy = vi.spyOn(AcousticEngine, 'processBuffer').mockResolvedValue(mockBuffer);
      const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:http://localhost:5173/mock-audio-uuid');

      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="INTERNAL_SIM"
          params={DEFAULT_DSP_PARAMS}
          onExportSuccess={onExportSuccess}
        />
      );

      const exportBtn = container.querySelector('button[data-testid="export-submit-button"]') as HTMLButtonElement;
      expect(exportBtn).not.toBeNull();

      await act(async () => {
        exportBtn.click();
      });

      expect(processBufferSpy).toHaveBeenCalledWith(mockBuffer, 'INTERNAL_SIM', DEFAULT_DSP_PARAMS);
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(onExportSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/\.wav$/i),
        expect.any(Blob)
      );

      unmount();
    });

    it('exports RAW mode directly without calling AcousticEngine.processBuffer', async () => {
      const processBufferSpy = vi.spyOn(AcousticEngine, 'processBuffer');
      const onExportSuccess = vi.fn();

      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="RAW"
          params={DEFAULT_DSP_PARAMS}
          onExportSuccess={onExportSuccess}
        />
      );

      const exportBtn = container.querySelector('button[data-testid="export-submit-button"]') as HTMLButtonElement;

      await act(async () => {
        exportBtn.click();
      });

      expect(processBufferSpy).not.toHaveBeenCalled();
      expect(onExportSuccess).toHaveBeenCalled();

      unmount();
    });

    it('renders and exports all 3 modes in ALL_MODES batch selection', async () => {
      const processBufferSpy = vi.spyOn(AcousticEngine, 'processBuffer').mockResolvedValue(mockBuffer);
      const onExportSuccess = vi.fn();

      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="RAW"
          params={DEFAULT_DSP_PARAMS}
          onExportSuccess={onExportSuccess}
        />
      );

      const allModesBtn = container.querySelector('button[data-mode="ALL_MODES"]') as HTMLButtonElement;
      act(() => {
        allModesBtn.click();
      });

      const exportBtn = container.querySelector('button[data-testid="export-submit-button"]') as HTMLButtonElement;

      await act(async () => {
        exportBtn.click();
      });

      // Called for INTERNAL_SIM and COMPENSATED
      expect(processBufferSpy).toHaveBeenCalledWith(mockBuffer, 'INTERNAL_SIM', DEFAULT_DSP_PARAMS);
      expect(processBufferSpy).toHaveBeenCalledWith(mockBuffer, 'COMPENSATED', DEFAULT_DSP_PARAMS);
      expect(onExportSuccess).toHaveBeenCalled();

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 7. Error Handling & Failure Resilience
  // -------------------------------------------------------------
  describe('7. Export Failure & Error Handling', () => {
    it('catches processing failure, displays error banner in modal, and calls onExportError', async () => {
      const onExportError = vi.fn();
      vi.spyOn(AcousticEngine, 'processBuffer').mockRejectedValueOnce(
        new Error('Offline rendering failed: AudioContext detached')
      );

      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="INTERNAL_SIM"
          params={DEFAULT_DSP_PARAMS}
          onExportError={onExportError}
        />
      );

      const exportBtn = container.querySelector('button[data-testid="export-submit-button"]') as HTMLButtonElement;

      await act(async () => {
        exportBtn.click();
      });

      expect(container.textContent).toContain('Offline rendering failed');
      expect(onExportError).toHaveBeenCalledWith(expect.any(Error));
      expect(exportBtn.disabled).toBe(false); // Re-enabled for retry

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 8. Pro Gating & Monetization Lock Tests
  // -------------------------------------------------------------
  describe('8. Pro Gating & Monetization Lock Tests', () => {
    it('triggers onOpenPricing when free tier user clicks ALL_MODES button', () => {
      const onOpenPricing = vi.fn();

      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="RAW"
          params={DEFAULT_DSP_PARAMS}
          isPro={false}
          onOpenPricing={onOpenPricing}
        />
      );

      const allModesBtn = container.querySelector('button[data-mode="ALL_MODES"]') as HTMLButtonElement;
      expect(allModesBtn).not.toBeNull();
      expect(allModesBtn.textContent).toContain('PRO');

      act(() => {
        allModesBtn.click();
      });

      expect(onOpenPricing).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('triggers onOpenPricing when free tier user clicks 32-bit Float button', () => {
      const onOpenPricing = vi.fn();

      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="RAW"
          params={DEFAULT_DSP_PARAMS}
          isPro={false}
          onOpenPricing={onOpenPricing}
        />
      );

      const float32Btn = container.querySelector('button[data-format="float32"]') as HTMLButtonElement;
      expect(float32Btn).not.toBeNull();
      expect(float32Btn.textContent).toContain('PRO');

      act(() => {
        float32Btn.click();
      });

      expect(onOpenPricing).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('allows Pro tier user to select ALL_MODES and 32-bit Float without opening pricing', () => {
      const onOpenPricing = vi.fn();

      const { container, unmount } = renderUI(
        <ExportModal
          isOpen={true}
          onClose={() => {}}
          audioBuffer={mockBuffer}
          currentMode="RAW"
          params={DEFAULT_DSP_PARAMS}
          isPro={true}
          onOpenPricing={onOpenPricing}
        />
      );

      const allModesBtn = container.querySelector('button[data-mode="ALL_MODES"]') as HTMLButtonElement;
      const float32Btn = container.querySelector('button[data-format="float32"]') as HTMLButtonElement;

      act(() => {
        allModesBtn.click();
        float32Btn.click();
      });

      expect(onOpenPricing).not.toHaveBeenCalled();
      expect(allModesBtn.className).toContain('border-indigo-500');
      expect(float32Btn.className).toContain('border-cyan-500');

      unmount();
    });
  });
});

