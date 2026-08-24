/**
 * VocalMirror — SpectralGapAnalyzer React Component Unit Tests
 * 
 * Validates component mounting, Canvas initialization, display mode toggles,
 * live gap metrics display, interactive cursor hovering, touch events, and clean teardown.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  SpectralGapAnalyzer,
} from '../../../src/components/SpectralGapAnalyzer';
import { installWebAudioMocks } from '../../mocks/webAudioMock';

import { LanguageProvider } from '../../../src/i18n';

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

describe('SpectralGapAnalyzer Component Test Suite', () => {
  let mockRawAnalyser: AnalyserNode;
  let mockBoneAnalyser: AnalyserNode;

  beforeEach(() => {
    installWebAudioMocks(globalThis);
    document.body.innerHTML = '';
    const ctx = new AudioContext();
    mockRawAnalyser = ctx.createAnalyser();
    mockBoneAnalyser = ctx.createAnalyser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mounts cleanly and renders canvas element and status badges', () => {
    const { container, unmount } = renderUI(
      <SpectralGapAnalyzer
        rawAnalyser={mockRawAnalyser}
        processedAnalyser={mockBoneAnalyser}
        isPlaying={false}
      />
    );

    expect(container.textContent).toContain('Spectral Gap Analyzer');
    expect(container.textContent).toContain('Dual 2048 FFT');

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toBe('Spectral Gap Visualizer');

    unmount();
  });

  it('renders all 3 display mode toggle buttons and switches active mode on click', () => {
    const { container, unmount } = renderUI(
      <SpectralGapAnalyzer
        rawAnalyser={mockRawAnalyser}
        processedAnalyser={mockBoneAnalyser}
      />
    );

    const buttons = container.querySelectorAll('button');
    const overlayBtn = Array.from(buttons).find((b) => b.textContent?.includes('Overlay'));
    const differentialBtn = Array.from(buttons).find((b) => b.textContent?.includes('Differential'));
    const gapOnlyBtn = Array.from(buttons).find((b) => b.textContent?.includes('Gap Only'));

    expect(overlayBtn).toBeDefined();
    expect(differentialBtn).toBeDefined();
    expect(gapOnlyBtn).toBeDefined();

    expect(overlayBtn?.getAttribute('aria-pressed')).toBe('true');

    // Click Differential
    act(() => {
      differentialBtn?.click();
    });
    expect(differentialBtn?.getAttribute('aria-pressed')).toBe('true');
    expect(overlayBtn?.getAttribute('aria-pressed')).toBe('false');

    // Click Gap Only
    act(() => {
      gapOnlyBtn?.click();
    });
    expect(gapOnlyBtn?.getAttribute('aria-pressed')).toBe('true');

    unmount();
  });

  it('renders live gap metrics cards for Low Resonance, HF Rolloff, and Confrontation Index', () => {
    const { container, unmount } = renderUI(
      <SpectralGapAnalyzer
        rawAnalyser={mockRawAnalyser}
        processedAnalyser={mockBoneAnalyser}
      />
    );

    expect(container.textContent).toMatch(/Low Resonance Boost/i);
    expect(container.textContent).toMatch(/HF Tissue Rolloff/i);
    expect(container.textContent).toMatch(/Confrontation Index/i);

    unmount();
  });

  it('handles mouse move and leave events over canvas without crashing', () => {
    const { container, unmount } = renderUI(
      <SpectralGapAnalyzer
        rawAnalyser={mockRawAnalyser}
        processedAnalyser={mockBoneAnalyser}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();

    // Trigger mousemove
    act(() => {
      canvas?.dispatchEvent(
        new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 80,
          bubbles: true,
        })
      );
    });

    // Trigger mouseleave
    act(() => {
      canvas?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    });

    unmount();
  });

  it('handles touch move and touch end events gracefully', () => {
    const { container, unmount } = renderUI(
      <SpectralGapAnalyzer
        rawAnalyser={mockRawAnalyser}
        processedAnalyser={mockBoneAnalyser}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();

    const touchObj = { clientX: 200, clientY: 100 } as Touch;

    act(() => {
      canvas?.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [touchObj],
          bubbles: true,
        })
      );
    });

    act(() => {
      canvas?.dispatchEvent(
        new TouchEvent('touchend', {
          touches: [],
          bubbles: true,
        })
      );
    });

    unmount();
  });

  it('unmounts cleanly and destroys canvas renderer and observer', () => {
    const { unmount } = renderUI(
      <SpectralGapAnalyzer
        rawAnalyser={mockRawAnalyser}
        processedAnalyser={mockBoneAnalyser}
      />
    );

    expect(() => unmount()).not.toThrow();
  });

  it('updates when analysers and audio active state change via props', () => {
    const { rerender, container, unmount } = renderUI(
      <SpectralGapAnalyzer
        rawAnalyser={null}
        processedAnalyser={null}
        isPlaying={false}
        isRecording={false}
        className="custom-analyzer-class"
      />
    );

    expect(container.querySelector('.custom-analyzer-class')).not.toBeNull();

    // Rerender with active analysers and isPlaying
    rerender(
      <SpectralGapAnalyzer
        rawAnalyser={mockRawAnalyser}
        processedAnalyser={mockBoneAnalyser}
        isPlaying={true}
        isRecording={false}
      />
    );

    expect(container.textContent).toContain('Spectral Gap Analyzer');
    unmount();
  });
});
