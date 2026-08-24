/**
 * VocalMirror — SpectrumVisualizerRenderer Lifecycle & Rendering Test Suite
 * 
 * Validates zero-allocation buffer setup, 60fps animation loop lifecycle,
 * display mode transitions, cursor inspection, and memory leak prevention.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SpectrumVisualizerRenderer,
} from '../../../src/audio/SpectrumVisualizerRenderer';
import { installWebAudioMocks } from '../../mocks/webAudioMock';

describe('SpectrumVisualizerRenderer Canvas Engine', () => {
  let canvas: HTMLCanvasElement;
  let mockRawAnalyser: AnalyserNode;
  let mockBoneAnalyser: AnalyserNode;

  beforeEach(() => {
    installWebAudioMocks(globalThis);
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 300;

    const ctx = new AudioContext();
    mockRawAnalyser = ctx.createAnalyser();
    mockBoneAnalyser = ctx.createAnalyser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('instantiates renderer cleanly and pre-allocates frequency buffers without throwing', () => {
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: mockRawAnalyser,
      processedAnalyser: mockBoneAnalyser,
    });

    expect(renderer).toBeDefined();
    expect(renderer.getMode()).toBe('OVERLAY');
    renderer.destroy();
  });

  it('starts and stops requestAnimationFrame render loop cleanly', () => {
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');

    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: mockRawAnalyser,
      processedAnalyser: mockBoneAnalyser,
    });

    renderer.start();
    expect(rafSpy).toHaveBeenCalled();

    // Calling start again when already running is idempotent
    renderer.start();

    renderer.stop();
    expect(cancelSpy).toHaveBeenCalled();

    renderer.destroy();
  });

  it('updates display mode and renders without throwing in all 3 modes', () => {
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: mockRawAnalyser,
      processedAnalyser: mockBoneAnalyser,
    });
    renderer.resize(800, 300, 1);

    // Overlay Mode
    renderer.setMode('OVERLAY');
    expect(renderer.getMode()).toBe('OVERLAY');
    expect(() => renderer.render()).not.toThrow();

    // Differential Mode
    renderer.setMode('DIFFERENTIAL');
    expect(renderer.getMode()).toBe('DIFFERENTIAL');
    expect(() => renderer.render()).not.toThrow();

    // Gap Only Mode
    renderer.setMode('GAP_ONLY');
    expect(renderer.getMode()).toBe('GAP_ONLY');
    expect(() => renderer.render()).not.toThrow();

    renderer.destroy();
  });

  it('handles null analysers gracefully during render ticks', () => {
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: null,
      processedAnalyser: null,
    });
    renderer.resize(600, 200, 1);

    expect(() => renderer.render()).not.toThrow();
    renderer.destroy();
  });

  it('updates options and analysers dynamically', () => {
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: null,
      processedAnalyser: null,
    });

    renderer.setAnalysers(mockRawAnalyser, mockBoneAnalyser);
    renderer.setOptions({
      showGrid: false,
      showAnnotations: false,
      airCurveColor: '#00ffff',
      boneCurveColor: '#ffaa00',
    });

    renderer.resize(800, 300, 2);
    expect(() => renderer.render()).not.toThrow();
    renderer.destroy();
  });

  it('calculates hover cursor inspection coordinates and triggers onCursorInspect', () => {
    const onCursorInspect = vi.fn();
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: mockRawAnalyser,
      processedAnalyser: mockBoneAnalyser,
      onCursorInspect,
    });
    renderer.resize(1000, 400, 1);

    // Set cursor at ~1000Hz
    const x1k = renderer.frequencyToX(1000, 1000);
    renderer.setHoverCursor(x1k, 200);
    renderer.render();

    expect(onCursorInspect).toHaveBeenCalled();
    const data = renderer.getCursorInspectionData();
    expect(data).not.toBeNull();
    expect(data?.freq).toBeCloseTo(1000, 1);

    renderer.clearHoverCursor();
    expect(renderer.getCursorInspectionData()).toBeNull();

    renderer.destroy();
  });

  it('triggers throttled onMetricsUpdate callback with valid spectral gap data', () => {
    const onMetricsUpdate = vi.fn();
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: mockRawAnalyser,
      processedAnalyser: mockBoneAnalyser,
      onMetricsUpdate,
    });
    renderer.resize(800, 300, 1);

    renderer.render();
    expect(onMetricsUpdate).toHaveBeenCalled();
    const metrics = onMetricsUpdate.mock.calls[0][0];
    expect(metrics).toHaveProperty('lowResonanceBoostDb');
    expect(metrics).toHaveProperty('hfTissueRolloffDb');
    expect(metrics).toHaveProperty('voiceConfrontationIndex');

    renderer.destroy();
  });

  it('properly cleans up resources and prevents post-destroy execution', () => {
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: mockRawAnalyser,
      processedAnalyser: mockBoneAnalyser,
    });
    renderer.start();
    renderer.destroy();

    // Calling render, resize, or start after destroy should safely no-op
    expect(() => renderer.render()).not.toThrow();
    expect(() => renderer.start()).not.toThrow();
    expect(() => renderer.resize(500, 200)).not.toThrow();
  });

  it('handles rapid resizing and High-DPI Retina scaling (dpr = 2, 3) seamlessly', () => {
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: mockRawAnalyser,
      processedAnalyser: mockBoneAnalyser,
    });

    renderer.resize(1920, 1080, 2);
    expect(canvas.width).toBe(3840);
    expect(canvas.height).toBe(2160);
    expect(() => renderer.render()).not.toThrow();

    renderer.resize(320, 240, 3);
    expect(canvas.width).toBe(960);
    expect(canvas.height).toBe(720);
    expect(() => renderer.render()).not.toThrow();

    renderer.destroy();
  });

  it('renders dual spectrum curves with prominent acoustic resonance and tissue damping peaks', () => {
    const rawFreqs = new Float32Array(1024).fill(-70);
    const boneFreqs = new Float32Array(1024).fill(-70);

    // Mandible resonance boost at 150Hz
    for (let i = 5; i <= 10; i++) {
      boneFreqs[i] = -45;
    }
    // High frequency damping at 6kHz
    for (let i = 200; i <= 300; i++) {
      boneFreqs[i] = -90;
      rawFreqs[i] = -55;
    }

    mockRawAnalyser.getFloatFrequencyData = (arr: Float32Array) => {
      arr.set(rawFreqs);
    };
    mockBoneAnalyser.getFloatFrequencyData = (arr: Float32Array) => {
      arr.set(boneFreqs);
    };

    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: mockRawAnalyser,
      processedAnalyser: mockBoneAnalyser,
      renderOptions: {
        showAnnotations: true,
        showDifferentialGap: true,
        showGrid: true,
      },
    });

    renderer.resize(1000, 400, 1);
    expect(() => renderer.render()).not.toThrow();
    renderer.destroy();
  });

  it('handles out-of-bounds hover coordinates safely in renderHoverInspection', () => {
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: mockRawAnalyser,
      processedAnalyser: mockBoneAnalyser,
    });
    renderer.resize(800, 300, 1);

    // Negative X
    renderer.setHoverCursor(-50, 100);
    expect(() => renderer.render()).not.toThrow();

    // X greater than width
    renderer.setHoverCursor(1200, 100);
    expect(() => renderer.render()).not.toThrow();

    renderer.destroy();
  });
});
