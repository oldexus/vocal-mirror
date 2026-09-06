/**
 * VocalMirror — PricingModal Component Unit Test Suite
 * File: tests/unit/components/PricingModal.test.tsx
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { PricingModal } from '../../../src/components/PricingModal';
import { UseProPlanReturn } from '../../../src/hooks/useProPlan';
import { LanguageProvider } from '../../../src/i18n';
import { DEFAULT_DSP_PARAMS } from '../../../src/audio/constants';

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

function createMockProPlan(overrides: Partial<UseProPlanReturn> = {}): UseProPlanReturn {
  return {
    isPro: false,
    tier: 'free',
    licenseRecord: {
      isPro: false,
      tier: 'free',
      licenseKey: null,
      activatedAt: null,
      source: 'demo',
    },
    isPricingOpen: true,
    isCustomPresetModalOpen: false,
    customPresets: [],
    openPricing: vi.fn(),
    closePricing: vi.fn(),
    openCustomPresetModal: vi.fn(),
    closeCustomPresetModal: vi.fn(),
    activateKey: vi.fn().mockImplementation((k: string) => {
      if (k === 'VOCALMIRROR-PRO-2026') return { success: true };
      return { success: false, message: 'Invalid key' };
    }),
    activateDemo: vi.fn(),
    deactivate: vi.fn(),
    savePreset: vi.fn().mockReturnValue({
      id: 'c1',
      name: 'Custom',
      tag: 'C',
      description: 'Desc',
      createdAt: '2026-09-06',
      params: DEFAULT_DSP_PARAMS,
    }),
    deletePreset: vi.fn(),
    exportPresets: vi.fn().mockReturnValue('{}'),
    importPresets: vi.fn().mockReturnValue({ success: true, count: 1 }),
    refreshPresets: vi.fn(),
    ...overrides,
  };
}

describe('PricingModal Component Test Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const mockPlan = createMockProPlan();
    const { container, unmount } = renderUI(
      <PricingModal isOpen={false} onClose={vi.fn()} proPlan={mockPlan} />
    );

    expect(container.textContent).toBe('');
    unmount();
  });

  it('renders modal header, plans, and value proposition when open', () => {
    const mockPlan = createMockProPlan();
    const { container, unmount } = renderUI(
      <PricingModal isOpen={true} onClose={vi.fn()} proPlan={mockPlan} />
    );

    expect(container.textContent).toMatch(/Unlock VocalMirror PRO/i);
    expect(container.textContent).toMatch(/Pro Monthly/i);
    expect(container.textContent).toMatch(/Pro Lifetime/i);
    expect(container.textContent).toMatch(/32-bit Float/i);
    unmount();
  });

  it('switches currency when currency buttons are clicked', () => {
    const mockPlan = createMockProPlan();
    const { container, unmount } = renderUI(
      <PricingModal isOpen={true} onClose={vi.fn()} proPlan={mockPlan} />
    );

    // Initial USD display
    expect(container.textContent).toContain('$7.99');
    expect(container.textContent).toContain('$39.00');

    // Click JPY button
    const jpyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('JPY')
    );
    expect(jpyBtn).toBeDefined();

    act(() => {
      jpyBtn?.click();
    });

    expect(container.textContent).toContain('¥980');
    expect(container.textContent).toContain('¥4,980');
    unmount();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const mockPlan = createMockProPlan();
    const { container, unmount } = renderUI(
      <PricingModal isOpen={true} onClose={onClose} proPlan={mockPlan} />
    );

    const closeBtn = container.querySelector('[data-testid="pricing-close-btn"]') as HTMLButtonElement;
    expect(closeBtn).toBeDefined();

    act(() => {
      closeBtn.click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('activates key on form submission', () => {
    const mockPlan = createMockProPlan();
    const { container, unmount } = renderUI(
      <PricingModal isOpen={true} onClose={vi.fn()} proPlan={mockPlan} />
    );

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(input, 'VOCALMIRROR-PRO-2026');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mockPlan.activateKey).toHaveBeenCalledWith('VOCALMIRROR-PRO-2026');
    unmount();
  });

  it('triggers instant pro demo when demo button is clicked', () => {
    const mockPlan = createMockProPlan();
    const { container, unmount } = renderUI(
      <PricingModal isOpen={true} onClose={vi.fn()} proPlan={mockPlan} />
    );

    const demoBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Instant Pro Demo')
    );
    expect(demoBtn).toBeDefined();

    act(() => {
      demoBtn?.click();
    });

    expect(mockPlan.activateDemo).toHaveBeenCalledTimes(1);
    unmount();
  });
});
