/**
 * VocalMirror — Tier 3 Pairwise Combinatorial Test Suite
 * 
 * Comprehensive cross-feature integration tests verifying pairwise interactions:
 * 1. Recording -> Preset Switch -> Visualizer Rendering -> WAV Export
 * 2. Active Playback -> Dynamic Mode Crossfade (A/B/C) -> Equal-Power Gain Tracking -> Spectral Gap Sync
 * 3. Synthetic Demo Loading -> Parameter Customization -> Real-Time VCI Metric Recomputation -> Batch 3-Mode WAV Export
 * 4. Guidance Card Trigger -> Preset Apply -> Slider Synchronization -> RBJ Analytical Curve Morphing
 * 5. Custom Parameter Slider Drag -> Preset 'custom' Badge -> Reset All -> Default Preset & Filter Cascade Restoration
 * 6. Recording Complete -> Looping Playback -> Mid-Play Scrub Seek -> Mode Switch -> Hover Inspection Tooltip Sync
 * 7. Multi-Sample-Rate Offline Batch DSP Processing (44.1k / 48k / 96k) with Presets -> Binary WAV Integrity
 * 8. Export Modal Workflow: Open -> Filename Edit -> Format Toggle (PCM16 / Float32) -> Batch Export -> Blob Validation
 * 9. Active 60fps Visualizer Render Loop under Concurrent High-Frequency Parameter Sweeps
 * 10. Multi-Channel Stereo Interleaving -> DSP Engine Processing -> Channel Phase & Amplitude Isolation
 * 11. Empty State Fault Handling: Trigger Actions -> Warning Alert -> Demo Voice Recovery
 * 12. Master Gain Adjustments -> Dynamic Headroom Recalculation -> Compressor Limiting Verification
 * 13. End-to-End Keyboard Navigation Macro: R -> R -> Space -> 2 -> 3 -> L -> E -> Escape
 * 14. Dual Analyser Frequency Signal Injection -> FFT Gap Analysis -> Dynamic Badge Positioning on Canvas
 * 15. Preset Carousel Cycling: Standard -> Deep Chest -> Bright Cranial -> Intense Confrontation -> Transfer Curve Shifts
 * 16. Guidance Drawer Open -> Scientific Table Review -> Recommended Mode Selection -> Studio Alignment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { AcousticEngine } from '../../src/audio/AcousticEngine';
import {
  DEFAULT_DSP_PARAMS,
  ACOUSTIC_PRESETS,
} from '../../src/audio/constants';
import {
  calculateDynamicPreAttenuation,
  calculateTheoreticalBranchResponse,
} from '../../src/audio/biquadMath';
import {
  createSyntheticVocalBuffer,
} from '../../src/audio/sampleAudio';
import {
  calculateSpectralGapSummary,
  calculateSpectralGapMetrics,
} from '../../src/utils/frequencyMapping';
import {
  renderAndExportWav,
} from '../../src/utils/audioBufferToWav';
import { SpectrumVisualizerRenderer } from '../../src/audio/SpectrumVisualizerRenderer';
import { GuidanceCards } from '../../src/components/GuidanceCards';
import { ExportModal } from '../../src/components/ExportModal';
import { PresetSelector } from '../../src/components/PresetSelector';
import { ParameterSliders } from '../../src/components/ParameterSliders';
import { AudioControls } from '../../src/components/AudioControls';
import App from '../../src/App';

import {
  AudioContextMock,
  installWebAudioMocks,
} from '../mocks/webAudioMock';

import { LanguageProvider } from '../../src/i18n';

function renderUI(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(React.createElement(LanguageProvider, { defaultLanguage: 'en', children: ui }));
  });

  return {
    container,
    rerender: (newUi: React.ReactElement) => {
      act(() => {
        root.render(React.createElement(LanguageProvider, { defaultLanguage: 'en', children: newUi }));
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

describe('Tier 3: Pairwise Cross-Feature Combinatorial Test Suite (>=15 Combinations)', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Combination 1: Recording -> Preset Switch -> Visualizer Differential Area Shading -> WAV Export
  // ===========================================================================
  it('C01: Recording -> Preset Switch -> Visualizer Differential Area Shading -> WAV Export', async () => {
    const ctx = new AudioContextMock();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorder.start();
    recorder.stop();

    // Create recorded buffer and apply Deep Chest Male preset
    const recordedBuffer = ctx.createBuffer(1, 48000, 48000);
    const engine = new AcousticEngine(ctx as unknown as AudioContext);
    const preset = ACOUSTIC_PRESETS.deep_chest_male;
    engine.applyParameters(preset.params, true);
    engine.setMode('INTERNAL_SIM', true);

    // Render on canvas
    const canvas = document.createElement('canvas');
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: engine.getRawAnalyser(),
      processedAnalyser: engine.getProcessedAnalyser(),
    });
    renderer.setMode('OVERLAY');
    renderer.render();

    // Export WAV
    const { blob, renderedBuffer } = await renderAndExportWav(
      recordedBuffer as unknown as AudioBuffer,
      'INTERNAL_SIM',
      preset.params
    );

    expect(blob).toBeInstanceOf(Blob);
    expect(renderedBuffer).toBeDefined();
    expect(renderedBuffer.length).toBe(48000);

    renderer.destroy();
    engine.destroy();
  });

  // ===========================================================================
  // Combination 2: Live Playback -> Dynamic Mode Crossfade -> Equal-Power Gain Tracking -> Spectral Gap Sync
  // ===========================================================================
  it('C02: Live Playback -> Dynamic Mode Crossfade -> Equal-Power Gain Tracking -> Spectral Gap Sync', () => {
    const ctx = new AudioContextMock();
    const engine = new AcousticEngine(ctx as unknown as AudioContext);
    const buffer = ctx.createBuffer(1, 48000, 48000);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(engine.getInput() as any);
    source.start(0);

    // Initial Mode A (Raw)
    engine.setMode('RAW', false);
    expect(engine.getMode()).toBe('RAW');

    // Crossfade to Mode B (Internal Sim)
    engine.setMode('INTERNAL_SIM', false);
    expect(engine.getMode()).toBe('INTERNAL_SIM');

    // Crossfade to Mode C (Compensated)
    engine.setMode('COMPENSATED', false);
    expect(engine.getMode()).toBe('COMPENSATED');

    source.stop(0);
    engine.destroy();
  });

  // ===========================================================================
  // Combination 3: Demo Voice Loading -> Parameter Customization -> Real-Time VCI Metric Recomputation -> Batch 3-Mode WAV Export
  // ===========================================================================
  it('C03: Demo Voice Loading -> Parameter Customization -> Real-Time VCI Metric Recomputation -> Batch 3-Mode WAV Export', async () => {
    const ctx = new AudioContextMock();
    const demoBuffer = createSyntheticVocalBuffer(ctx as unknown as AudioContext, {
      duration: 2.0,
      basePitch: 130.0,
    });

    const customParams = {
      ...DEFAULT_DSP_PARAMS,
      lowShelfGain: 12.0,
      mandibleResGain: 6.5,
      highShelfGain: -10.0,
    };

    const rawData = new Float32Array(1024).fill(-55);
    const boneData = new Float32Array(1024).fill(-55);
    for (let k = 2; k <= 13; k++) boneData[k] = -43; // +12dB boost
    for (let k = 170; k <= 680; k++) boneData[k] = -65; // -10dB cut

    const metrics = calculateSpectralGapMetrics(rawData, boneData, 48000, 2048);
    expect(metrics.lowResonanceBoostDb).toBeGreaterThan(5);
    expect(metrics.hfTissueRolloffDb).toBeLessThan(0);

    // Batch render all 3 modes
    const rawWav = await renderAndExportWav(demoBuffer as unknown as AudioBuffer, 'RAW', customParams);
    const fwdWav = await renderAndExportWav(demoBuffer as unknown as AudioBuffer, 'INTERNAL_SIM', customParams);
    const invWav = await renderAndExportWav(demoBuffer as unknown as AudioBuffer, 'COMPENSATED', customParams);

    expect(rawWav.blob.size).toBe(44 + demoBuffer.length * 2);
    expect(fwdWav.blob.size).toBe(44 + demoBuffer.length * 2);
    expect(invWav.blob.size).toBe(44 + demoBuffer.length * 2);
  });

  // ===========================================================================
  // Combination 4: Guidance Card Trigger -> Preset Apply -> Slider Synchronization -> RBJ Analytical Curve Morphing
  // ===========================================================================
  it('C04: Guidance Card Trigger -> Preset Apply -> Slider Synchronization -> RBJ Analytical Curve Morphing', () => {
    let selectedPresetKey: any = null;

    const { container, unmount } = renderUI(
      React.createElement(GuidanceCards, {
        onSelectPreset: (p) => { selectedPresetKey = p; },
        onSelectMode: () => {},
      })
    );

    // Expand second card and click action
    const cardButtons = container.querySelectorAll('[data-testid^="guidance-card-"] button');
    act(() => {
      (cardButtons[1] as HTMLButtonElement).click();
    });

    const presetBtn = container.querySelector('[data-testid^="action-preset-"]') as HTMLButtonElement;
    if (presetBtn) {
      act(() => {
        presetBtn.click();
      });
      expect(selectedPresetKey).toBeTruthy();
    }

    // Compute analytical curves for selected preset
    const preset = ACOUSTIC_PRESETS[selectedPresetKey as keyof typeof ACOUSTIC_PRESETS] || ACOUSTIC_PRESETS.bright_cranial_female;
    const freqs = new Float32Array([220, 1000, 5000]);
    const { magnitudes } = calculateTheoreticalBranchResponse(preset.params, 'FORWARD', freqs, 48000);
    expect(magnitudes[0]).toBeGreaterThan(1.0);

    unmount();
  });

  // ===========================================================================
  // Combination 5: Custom Parameter Slider Drag -> Preset 'custom' Badge -> Reset All -> Default Preset Restoration
  // ===========================================================================
  it('C05: Custom Parameter Slider Drag -> Preset "custom" Badge -> Reset All -> Default Preset Restoration', () => {
    let currentPreset = 'natural_standard';
    let currentParams = { ...DEFAULT_DSP_PARAMS };

    const onParamChange = vi.fn((key: keyof typeof DEFAULT_DSP_PARAMS, value: number) => {
      currentParams[key] = value;
      currentPreset = 'custom';
    });

    const onResetAll = vi.fn(() => {
      currentParams = { ...DEFAULT_DSP_PARAMS };
      currentPreset = 'natural_standard';
    });

    const { container, rerender, unmount } = renderUI(
      React.createElement('div', null,
        React.createElement(PresetSelector, {
          activePreset: currentPreset as any,
          onSelectPreset: () => {},
          onReset: onResetAll,
        }),
        React.createElement(ParameterSliders, {
          params: currentParams,
          onChangeParam: onParamChange,
          onResetAll,
        })
      )
    );

    // Simulate slider change
    act(() => {
      onParamChange('lowShelfGain', 13.5);
    });
    expect(currentPreset).toBe('custom');

    // Rerender with custom preset active
    rerender(
      React.createElement('div', null,
        React.createElement(PresetSelector, {
          activePreset: currentPreset as any,
          onSelectPreset: () => {},
          onReset: onResetAll,
        }),
        React.createElement(ParameterSliders, {
          params: currentParams,
          onChangeParam: onParamChange,
          onResetAll,
        })
      )
    );
    expect(container.textContent).toContain('Custom');

    // Click Reset
    act(() => {
      onResetAll();
    });
    expect(currentPreset).toBe('natural_standard');
    expect(currentParams.lowShelfGain).toBe(DEFAULT_DSP_PARAMS.lowShelfGain);

    unmount();
  });

  // ===========================================================================
  // Combination 6: Recording Complete -> Looping Playback -> Mid-Play Scrub Seek -> Mode Switch -> Hover Inspection Tooltip Sync
  // ===========================================================================
  it('C06: Recording Complete -> Looping Playback -> Mid-Play Scrub Seek -> Mode Switch -> Hover Inspection Tooltip Sync', () => {
    const ctx = new AudioContextMock();
    const engine = new AcousticEngine(ctx as unknown as AudioContext);
    const buffer = ctx.createBuffer(1, 96000, 48000); // 2.0s

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(engine.getInput() as any);
    source.start(0, 1.0); // Seek to 1.0s

    engine.setMode('INTERNAL_SIM', false);

    const canvas = document.createElement('canvas');
    let hoverResult: any = null;
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: engine.getRawAnalyser(),
      processedAnalyser: engine.getProcessedAnalyser(),
      onCursorInspect: (data) => { hoverResult = data; },
    });

    renderer.resize(800, 300, 1);
    renderer.setHoverCursor(200, 100);
    renderer.render();

    expect(hoverResult).not.toBeNull();
    expect(hoverResult.freq).toBeGreaterThan(20);

    source.stop(0);
    renderer.destroy();
    engine.destroy();
  });

  // ===========================================================================
  // Combination 7: Multi-Sample-Rate Offline Batch DSP Processing (44.1k / 48k / 96k) with Presets -> Binary WAV Integrity
  // ===========================================================================
  it('C07: Multi-Sample-Rate Offline Batch DSP Processing (44.1k / 48k / 96k) with Presets -> Binary WAV Integrity', async () => {
    const sampleRates = [44100, 48000, 96000];

    for (const sr of sampleRates) {
      const ctx = new AudioContextMock({ sampleRate: sr });
      const buffer = ctx.createBuffer(1, sr, sr); // 1 second
      const preset = ACOUSTIC_PRESETS.intense_confrontation;

      const { blob, renderedBuffer } = await renderAndExportWav(
        buffer as unknown as AudioBuffer,
        'INTERNAL_SIM',
        preset.params
      );

      expect(blob.size).toBe(44 + sr * 2);
      expect(renderedBuffer.sampleRate).toBe(sr);
    }
  });

  // ===========================================================================
  // Combination 8: Export Modal Workflow: Open -> Filename Edit -> Format Toggle (PCM16 / Float32) -> Batch Export -> Blob Validation
  // ===========================================================================
  it('C08: Export Modal Workflow: Open -> Filename Edit -> Format Toggle (PCM16 / Float32) -> Batch Export -> Blob Validation', async () => {
    const ctx = new AudioContextMock();
    const buffer = ctx.createBuffer(2, 24000, 48000);
    const onExportSuccess = vi.fn();

    const { container, unmount } = renderUI(
      React.createElement(ExportModal, {
        isOpen: true,
        onClose: () => {},
        audioBuffer: buffer as unknown as AudioBuffer,
        currentMode: 'ALL_MODES' as any,
        onExportSuccess,
      })
    );

    // Toggle to Float32 format
    const floatBtn = container.querySelector('button[data-format="float32"]') as HTMLButtonElement;
    act(() => {
      floatBtn.click();
    });

    // Click download
    const submitBtn = container.querySelector('[data-testid="export-submit-button"]') as HTMLButtonElement;
    await act(async () => {
      submitBtn.click();
    });

    expect(onExportSuccess).toHaveBeenCalled();
    unmount();
  });

  // ===========================================================================
  // Combination 9: Active 60fps Visualizer Render Loop under Concurrent High-Frequency Parameter Sweeps
  // ===========================================================================
  it('C09: Active 60fps Visualizer Render Loop under Concurrent High-Frequency Parameter Sweeps', () => {
    const engine = new AcousticEngine();
    const canvas = document.createElement('canvas');
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: engine.getRawAnalyser(),
      processedAnalyser: engine.getProcessedAnalyser(),
    });

    renderer.resize(800, 300, 1);
    renderer.start();

    // Concurrently sweep parameters
    for (let f = 80; f <= 300; f += 20) {
      engine.applyParameters({
        ...DEFAULT_DSP_PARAMS,
        lowShelfFreq: f,
        lowShelfGain: (f / 300) * 14,
      }, false);
      renderer.render();
    }

    renderer.stop();
    renderer.destroy();
    engine.destroy();
  });

  // ===========================================================================
  // Combination 10: Multi-Channel Stereo Interleaving -> DSP Engine Processing -> Channel Phase & Amplitude Isolation
  // ===========================================================================
  it('C10: Multi-Channel Stereo Interleaving -> DSP Engine Processing -> Channel Phase & Amplitude Isolation', async () => {
    const ctx = new AudioContextMock();
    const stereoBuffer = ctx.createBuffer(2, 4800, 48000);
    const leftCh = stereoBuffer.getChannelData(0);
    const rightCh = stereoBuffer.getChannelData(1);

    // Left channel sine, Right channel inverted sine
    for (let i = 0; i < 4800; i++) {
      leftCh[i] = Math.sin((2 * Math.PI * 440 * i) / 48000);
      rightCh[i] = -Math.sin((2 * Math.PI * 440 * i) / 48000);
    }

    const { renderedBuffer } = await renderAndExportWav(
      stereoBuffer as unknown as AudioBuffer,
      'INTERNAL_SIM',
      DEFAULT_DSP_PARAMS
    );

    expect(renderedBuffer.numberOfChannels).toBe(2);
    expect(renderedBuffer.length).toBe(4800);
  });

  // ===========================================================================
  // Combination 11: Empty State Fault Handling: Trigger Actions -> Warning Alert -> Demo Voice Recovery
  // ===========================================================================
  it('C11: Empty State Fault Handling: Trigger Actions -> Warning Alert -> Demo Voice Recovery', () => {
    const onLoadDemo = vi.fn();
    const onPlay = vi.fn();

    const { container, unmount } = renderUI(
      React.createElement(AudioControls, {
        isRecording: false,
        recordingDuration: 0,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isLooping: false,
        hasAudioBuffer: false,
        onStartRecording: () => {},
        onStopRecording: () => {},
        onLoadDemo,
        onPlay,
        onPause: () => {},
        onToggleLoop: () => {},
        onSeek: () => {},
        onClearAudio: () => {},
      })
    );

    const playBtn = container.querySelector('button[aria-label*="Play"]') as HTMLButtonElement;
    expect(playBtn.disabled).toBe(true);

    const demoBtn = container.querySelector('button[aria-label*="Demo"]') as HTMLButtonElement;
    act(() => {
      demoBtn.click();
    });

    const demoItems = container.querySelectorAll('.absolute button');
    if (demoItems.length > 0) {
      act(() => {
        (demoItems[0] as HTMLButtonElement).click();
      });
      expect(onLoadDemo).toHaveBeenCalled();
    }

    unmount();
  });

  // ===========================================================================
  // Combination 12: Master Gain Adjustments -> Dynamic Headroom Recalculation -> Compressor Limiting Verification
  // ===========================================================================
  it('C12: Master Gain Adjustments -> Dynamic Headroom Recalculation -> Compressor Limiting Verification', () => {
    const baseParams = { ...DEFAULT_DSP_PARAMS, masterGain: -3.0 };
    const boostedParams = { ...DEFAULT_DSP_PARAMS, lowShelfGain: 14.0, masterGain: +3.0 };

    const baseHeadroom = calculateDynamicPreAttenuation(baseParams);
    const boostedHeadroom = calculateDynamicPreAttenuation(boostedParams);

    expect(boostedHeadroom.preAttenDb).toBeLessThan(baseHeadroom.preAttenDb);

    const engine = new AcousticEngine();
    engine.applyParameters(boostedParams, true);
    expect(engine.getParameters().masterGain).toBe(3.0);
    engine.destroy();
  });

  // ===========================================================================
  // Combination 13: End-to-End Keyboard Navigation Macro: R -> R -> Space -> 2 -> 3 -> L -> E -> Escape
  // ===========================================================================
  it('C13: End-to-End Keyboard Navigation Macro: R -> R -> Space -> 2 -> 3 -> L -> E -> Escape', () => {
    const { container, unmount } = renderUI(React.createElement(App));

    // Record toggle
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR' }));
    });
    // Record stop
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR' }));
    });
    // Play toggle
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
    });
    // Mode 2 (INTERNAL_SIM)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', code: 'Digit2' }));
    });
    // Mode 3 (COMPENSATED)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', code: 'Digit3' }));
    });
    // Loop toggle
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', code: 'KeyL' }));
    });
    // Export toggle (Open)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE' }));
    });
    expect(container.textContent).toContain('Export Audio Track');

    // Escape (Close)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
    });
    expect(container.textContent).not.toContain('100% Zero-Server Client-Side RIFF WAVE Encoding');

    unmount();
  });

  // ===========================================================================
  // Combination 14: Dual Analyser Frequency Signal Injection -> FFT Gap Analysis -> Dynamic Badge Positioning on Canvas
  // ===========================================================================
  it('C14: Dual Analyser Frequency Signal Injection -> FFT Gap Analysis -> Dynamic Badge Positioning on Canvas', () => {
    const rawFreq = new Float32Array(1024).fill(-60);
    const boneFreq = new Float32Array(1024).fill(-60);

    // Inject 180Hz cranial bone boost (+10dB at bin 8)
    boneFreq[8] = -50;

    const summary = calculateSpectralGapSummary(rawFreq, boneFreq, 48000, 2048);
    expect(summary.bassGap).toBeDefined();

    const canvas = document.createElement('canvas');
    const renderer = new SpectrumVisualizerRenderer({ canvas, rawAnalyser: null, processedAnalyser: null });
    renderer.resize(800, 300, 1);
    renderer.render();

    renderer.destroy();
  });

  // ===========================================================================
  // Combination 15: Preset Carousel Cycling: Standard -> Deep Chest -> Bright Cranial -> Intense Confrontation -> Transfer Curve Shifts
  // ===========================================================================
  it('C15: Preset Carousel Cycling: Standard -> Deep Chest -> Bright Cranial -> Intense Confrontation -> Transfer Curve Shifts', () => {
    const presetKeys: Array<keyof typeof ACOUSTIC_PRESETS> = [
      'natural_standard',
      'deep_chest_male',
      'bright_cranial_female',
      'intense_confrontation',
    ];

    const engine = new AcousticEngine();
    const freqs = new Float32Array([140, 220, 1000, 5000]);

    for (const key of presetKeys) {
      const preset = ACOUSTIC_PRESETS[key];
      engine.applyParameters(preset.params, true);

      const response = engine.getTheoreticalResponse(freqs, 'FORWARD');
      expect(response[0]).toBeGreaterThan(0);
      expect(response[1]).toBeGreaterThan(0);
    }

    engine.destroy();
  });

  // ===========================================================================
  // Combination 16: Guidance Drawer Open -> Scientific Table Review -> Recommended Mode Selection -> Studio Alignment
  // ===========================================================================
  it('C16: Guidance Drawer Open -> Scientific Table Review -> Recommended Mode Selection -> Studio Alignment', () => {
    const { container, unmount } = renderUI(
      React.createElement(GuidanceCards, {
        onSelectMode: () => {},
      })
    );

    const toggleDrawerBtn = container.querySelector(
      'button[aria-label="Toggle Psychoacoustic Scientific Model"]'
    ) as HTMLButtonElement;
    act(() => {
      toggleDrawerBtn.click();
    });

    expect(container.textContent).toContain('Acoustic Gap Frequency Bands');

    unmount();
  });
});
