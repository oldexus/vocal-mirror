/**
 * VocalMirror — Psychoacoustic Guidance Cards Component Unit Test Suite
 * File: tests/unit/components/GuidanceCards.test.tsx
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { GuidanceCards } from '../../../src/components/GuidanceCards';
import {
  DEFAULT_GUIDANCE_ITEMS,
} from '../../../src/constants/guidanceContent';

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

describe('GuidanceCards Component Test Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------
  // 1. Initial Rendering & Catalog Display
  // -------------------------------------------------------------
  describe('1. Initial Rendering & Catalog Display', () => {
    it('renders guidance header, subtitle, and all 4 default training cards', () => {
      const { container, unmount } = renderUI(<GuidanceCards />);

      expect(container.textContent).toMatch(/Psychoacoustic Guidance & Vocal Training/i);
      expect(container.textContent).toMatch(/Acoustic Guide/i);

      // Verify all 4 cards are rendered
      expect(container.textContent).toContain('The Bone Conduction Illusion');
      expect(container.textContent).toContain('Chest Resonance & Mask Placement');
      expect(container.textContent).toContain("The Singer's Formant");
      expect(container.textContent).toContain('Microphone Proximity & Acoustic Bridging');

      const cards = container.querySelectorAll('[data-testid^="guidance-card-"]');
      expect(cards.length).toBe(4);
      unmount();
    });

    it('renders category badges with distinct thematic labels', () => {
      const { container, unmount } = renderUI(<GuidanceCards />);

      expect(container.textContent).toMatch(/Psychoacoustics/i);
      expect(container.textContent).toMatch(/Resonance/i);
      expect(container.textContent).toMatch(/Projection/i);
      expect(container.textContent).toMatch(/Engineering/i);
      unmount();
    });

    it('renders cards in collapsed state by default with aria-expanded="false"', () => {
      const { container, unmount } = renderUI(<GuidanceCards />);
      const cardHeaderButtons = container.querySelectorAll(
        '[data-testid^="guidance-card-"] button[aria-expanded]'
      );

      expect(cardHeaderButtons.length).toBe(4);
      cardHeaderButtons.forEach((btn) => {
        expect(btn.getAttribute('aria-expanded')).toBe('false');
      });
      unmount();
    });
  });

  // -------------------------------------------------------------
  // 2. Accordion Card Expansion & Toggle Interactions
  // -------------------------------------------------------------
  describe('2. Card Expansion & Accordion Interactions', () => {
    it('expands card on click, sets aria-expanded="true", and displays detailed description', () => {
      const { container, unmount } = renderUI(<GuidanceCards />);
      const firstCardHeader = container.querySelector(
        '[data-testid="guidance-card-bone_conduction_illusion"] button[aria-expanded]'
      ) as HTMLButtonElement;

      expect(firstCardHeader).not.toBeNull();

      act(() => {
        firstCardHeader.click();
      });

      expect(firstCardHeader.getAttribute('aria-expanded')).toBe('true');
      expect(container.querySelector('[data-testid="expanded-content"]')).not.toBeNull();
      expect(container.textContent).toContain('Scientific Acoustic Mechanism');
      expect(container.textContent).toContain('The human skull is a natural acoustic filter');

      unmount();
    });

    it('collapses an expanded card when clicked again', () => {
      const { container, unmount } = renderUI(<GuidanceCards />);
      const firstCardHeader = container.querySelector(
        '[data-testid="guidance-card-bone_conduction_illusion"] button[aria-expanded]'
      ) as HTMLButtonElement;

      // Expand
      act(() => {
        firstCardHeader.click();
      });
      expect(firstCardHeader.getAttribute('aria-expanded')).toBe('true');

      // Collapse
      act(() => {
        firstCardHeader.click();
      });
      expect(firstCardHeader.getAttribute('aria-expanded')).toBe('false');
      expect(container.querySelector('[data-testid="expanded-content"]')).toBeNull();

      unmount();
    });

    it('supports keyboard expansion via Enter and Space keys', () => {
      const { container, unmount } = renderUI(<GuidanceCards />);
      const firstCardHeader = container.querySelector(
        '[data-testid="guidance-card-bone_conduction_illusion"] button[aria-expanded]'
      ) as HTMLButtonElement;

      // Press Enter to expand
      act(() => {
        firstCardHeader.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })
        );
      });
      expect(firstCardHeader.getAttribute('aria-expanded')).toBe('true');

      // Press Space to collapse
      act(() => {
        firstCardHeader.dispatchEvent(
          new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })
        );
      });
      expect(firstCardHeader.getAttribute('aria-expanded')).toBe('false');

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 3. Deep-Dive Psychoacoustic Overview Drawer
  // -------------------------------------------------------------
  describe('3. Deep-Dive Psychoacoustic Overview Drawer', () => {
    it('toggles scientific model drawer on clicking "Why Does Voice Sound Strange?" button', () => {
      const { container, unmount } = renderUI(<GuidanceCards />);
      const overviewToggleBtn = container.querySelector(
        'button[aria-label="Toggle Psychoacoustic Scientific Model"]'
      ) as HTMLButtonElement;

      expect(overviewToggleBtn).not.toBeNull();
      expect(container.querySelector('[data-testid="psychoacoustic-overview-drawer"]')).toBeNull();

      // Open drawer
      act(() => {
        overviewToggleBtn.click();
      });

      expect(overviewToggleBtn.getAttribute('aria-expanded')).toBe('true');
      expect(container.querySelector('[data-testid="psychoacoustic-overview-drawer"]')).not.toBeNull();
      expect(container.textContent).toContain('The Physics of Voice Confrontation');
      expect(container.textContent).toContain('Internal Bone Conduction Pathway');
      expect(container.textContent).toContain('External Air Conduction Pathway');
      expect(container.textContent).toContain('Sub-Bass & Laryngeal');

      // Close drawer
      act(() => {
        overviewToggleBtn.click();
      });
      expect(overviewToggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(container.querySelector('[data-testid="psychoacoustic-overview-drawer"]')).toBeNull();

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 4. Acoustic Advice Tips & Practical Exercise Box
  // -------------------------------------------------------------
  describe('4. Acoustic Advice Tips & Practical Exercise Box', () => {
    it('renders practical exercise with steps and pro tip in expanded card', () => {
      const { container, unmount } = renderUI(<GuidanceCards />);
      const firstCardHeader = container.querySelector(
        '[data-testid="guidance-card-bone_conduction_illusion"] button[aria-expanded]'
      ) as HTMLButtonElement;

      act(() => {
        firstCardHeader.click();
      });

      expect(container.textContent).toContain('Exercise: The Occlusion Test & Ear-Cup Method');
      const tipBox = container.querySelector('[data-testid="acoustic-tip-box"]');
      expect(tipBox).not.toBeNull();
      expect(tipBox?.textContent).toContain('Pro Tip:');
      expect(tipBox?.textContent).toContain('Mode B');

      const listItems = container.querySelectorAll('[data-testid="expanded-content"] ol li');
      expect(listItems.length).toBe(4);

      unmount();
    });

    it('renders key insight takeaway box in expanded card', () => {
      const { container, unmount } = renderUI(<GuidanceCards />);
      const firstCardHeader = container.querySelector(
        '[data-testid="guidance-card-bone_conduction_illusion"] button[aria-expanded]'
      ) as HTMLButtonElement;

      act(() => {
        firstCardHeader.click();
      });

      expect(container.textContent).toContain('Key Insight:');
      expect(container.textContent).toContain(
        'Your recorded voice is not deficient; it is simply the uncolored truth of air conduction.'
      );

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 5. Interactive Action Triggers & Studio Presets / Modes
  // -------------------------------------------------------------
  describe('5. Interactive Action Triggers & Studio Presets', () => {
    it('triggers onApplyPreset and onSelectPreset when clicking preset action button', () => {
      const onApplyPreset = vi.fn();
      const onSelectPreset = vi.fn();
      const onSelectMode = vi.fn();

      const { container, unmount } = renderUI(
        <GuidanceCards
          onApplyPreset={onApplyPreset}
          onSelectPreset={onSelectPreset}
          onSelectMode={onSelectMode}
        />
      );

      const firstCardHeader = container.querySelector(
        '[data-testid="guidance-card-bone_conduction_illusion"] button[aria-expanded]'
      ) as HTMLButtonElement;

      act(() => {
        firstCardHeader.click();
      });

      const presetBtn = container.querySelector(
        '[data-testid="action-preset-bone_conduction_illusion"]'
      ) as HTMLButtonElement;

      expect(presetBtn).not.toBeNull();

      act(() => {
        presetBtn.click();
      });

      expect(onApplyPreset).toHaveBeenCalledWith('intense_confrontation');
      expect(onSelectPreset).toHaveBeenCalledWith('intense_confrontation');
      expect(onSelectMode).toHaveBeenCalledWith('INTERNAL_SIM');

      unmount();
    });

    it('triggers onSelectMode when clicking mode switch action button', () => {
      const onSelectMode = vi.fn();
      const { container, unmount } = renderUI(
        <GuidanceCards onSelectMode={onSelectMode} />
      );

      const firstCardHeader = container.querySelector(
        '[data-testid="guidance-card-bone_conduction_illusion"] button[aria-expanded]'
      ) as HTMLButtonElement;

      act(() => {
        firstCardHeader.click();
      });

      const modeBtn = container.querySelector(
        '[data-testid="action-mode-bone_conduction_illusion"]'
      ) as HTMLButtonElement;

      expect(modeBtn).not.toBeNull();

      act(() => {
        modeBtn.click();
      });

      expect(onSelectMode).toHaveBeenCalledWith('INTERNAL_SIM');

      unmount();
    });

    it('shows "Active in Studio" styling when studio mode and preset match card', () => {
      const { container, unmount } = renderUI(
        <GuidanceCards
          activeMode="INTERNAL_SIM"
          activePreset="intense_confrontation"
        />
      );

      const firstCardHeader = container.querySelector(
        '[data-testid="guidance-card-bone_conduction_illusion"] button[aria-expanded]'
      ) as HTMLButtonElement;

      act(() => {
        firstCardHeader.click();
      });

      const presetBtn = container.querySelector(
        '[data-testid="action-preset-bone_conduction_illusion"]'
      ) as HTMLButtonElement;

      expect(presetBtn.textContent).toContain('Active in Studio');

      unmount();
    });
  });

  // -------------------------------------------------------------
  // 6. Custom Guidance Items & Boundary Resilience
  // -------------------------------------------------------------
  describe('6. Custom Items & Boundary Resilience', () => {
    it('renders custom guidance items when supplied via props', () => {
      const { container, unmount } = renderUI(
        <GuidanceCards items={DEFAULT_GUIDANCE_ITEMS} />
      );

      expect(container.textContent).toContain('The Bone Conduction Illusion');
      expect(container.textContent).toContain('Chest Resonance & Mask Placement');

      // Expand one custom item
      const firstCardHeader = container.querySelector(
        '[data-testid="guidance-card-bone_conduction_illusion"] button[aria-expanded]'
      ) as HTMLButtonElement;

      act(() => {
        firstCardHeader.click();
      });

      expect(container.querySelector('[data-testid="acoustic-tip-box"]')).not.toBeNull();
      expect(container.textContent).toContain('Use Mode B to simulate');

      unmount();
    });

    it('handles empty items array gracefully without throwing', () => {
      const { container, unmount } = renderUI(<GuidanceCards items={[]} />);
      expect(container).toBeDefined();
      expect(container.querySelectorAll('[data-testid^="guidance-card-"]').length).toBe(0);
      unmount();
    });
  });
});
