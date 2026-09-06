/**
 * VocalMirror — VoiceConfrontationHero Component Unit Test Suite
 * File: tests/unit/components/VoiceConfrontationHero.test.tsx
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { VoiceConfrontationHero } from '../../../src/components/VoiceConfrontationHero';
import { LanguageProvider } from '../../../src/i18n';

interface RenderResult {
  container: HTMLDivElement;
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
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('VoiceConfrontationHero Component Test Suite', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders hero banner with educational pitch', () => {
    const { container, unmount } = renderUI(<VoiceConfrontationHero />);

    expect(container.textContent).toMatch(/Why Does Your Recorded Voice Sound Unfamiliar/i);
    expect(container.textContent).toMatch(/The Cranial Acoustic Gap Solved/i);
    unmount();
  });

  it('triggers onOpenPricing when PRO button is clicked', () => {
    const onOpenPricing = vi.fn();
    const { container, unmount } = renderUI(
      <VoiceConfrontationHero onOpenPricing={onOpenPricing} isPro={false} />
    );

    const proBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('PRO')
    );
    expect(proBtn).toBeDefined();

    act(() => {
      proBtn?.click();
    });

    expect(onOpenPricing).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('hides hero when dismiss button is clicked and stores in sessionStorage', () => {
    const { container, unmount } = renderUI(<VoiceConfrontationHero />);

    const dismissBtn = container.querySelector('button[aria-label="Dismiss voice confrontation banner"]') as HTMLButtonElement;
    expect(dismissBtn).toBeDefined();

    act(() => {
      dismissBtn.click();
    });

    expect(container.textContent).toBe('');
    expect(sessionStorage.getItem('vocalmirror_hero_dismissed')).toBe('true');
    unmount();
  });

  it('does not render if previously dismissed in sessionStorage', () => {
    sessionStorage.setItem('vocalmirror_hero_dismissed', 'true');
    const { container, unmount } = renderUI(<VoiceConfrontationHero />);

    expect(container.textContent).toBe('');
    unmount();
  });
});
