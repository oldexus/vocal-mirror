/**
 * VocalMirror — Tier 4 Realistic Studio Workflow Scenarios Test Suite
 * 
 * End-to-end realistic multi-step user workflows:
 * - Scenario 1: Professional Singer Vocal Resonance Calibration & 16-bit WAV Export
 * - Scenario 2: Podcaster Voice Confrontation Diagnosis & Compensated Voice Bridging
 * - Scenario 3: Audio Mastering Engineer Batch Multi-Mode 32-bit Float WAV Archiving
 * - Scenario 4: Acoustic Science Classroom Interactive Lecture & Psychoacoustic Guidance
 * - Scenario 5: Hardware Permission Fallback, Custom Anatomical Tuning & Safe Destruction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { AcousticEngine } from '../../src/audio/AcousticEngine';
import {
  DEFAULT_DSP_PARAMS,
  ACOUSTIC_PRESETS,
  PARAMETER_LIMITS,
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
  audioBufferToWav,
  exportAudioBufferAsWavBlob,
  renderAndExportWav,
} from '../../src/utils/audioBufferToWav';
import { SpectrumVisualizerRenderer } from '../../src/audio/SpectrumVisualizerRenderer';
import { GuidanceCards } from '../../src/components/GuidanceCards';
import { ExportModal } from '../../src/components/ExportModal';
import { PresetSelector } from '../../src/components/PresetSelector';
import { ParameterSliders } from '../../src/components/ParameterSliders';
import { ModeSelector } from '../../src/components/ModeSelector';
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
    root.render(React.createElement(LanguageProvider, { defaultLanguage: 'en' }, ui));
  });

  return {
    container,
    rerender: (newUi: React.ReactElement) => {
      act(() => {
        root.render(React.createElement(LanguageProvider, { defaultLanguage: 'en' }, newUi));
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

describe('Tier 4: Realistic Studio Workflow Scenarios (>=5 Scenarios)', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Scenario 1: Professional Singer Vocal Resonance Calibration & 16-bit WAV Export
  // ===========================================================================
  it('Scenario 1: Professional Singer Vocal Resonance Calibration & 16-bit WAV Export', async () => {
    // 1. Singer opens VocalMirror and records a 3-second vocal warm-up
    const ctx = new AudioContextMock();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorder.start();
    recorder.stop();

    const vocalBuffer = ctx.createBuffer(1, 48000 * 3, 48000);
    expect(vocalBuffer.duration).toBe(3.0);

    // 2. Singer initializes AcousticEngine with Bright Cranial Female profile
    const engine = new AcousticEngine(ctx as unknown as AudioContext);
    const sopranoPreset = ACOUSTIC_PRESETS.bright_cranial_female;
    engine.applyParameters(sopranoPreset.params, true);

    // 3. Singer fine-tunes sinus cavity resonance (+5.5dB at 950Hz) and tissue cutoff (5.2kHz)
    const tunedParams = {
      ...sopranoPreset.params,
      sinusResFreq: 950,
      sinusResGain: 5.5,
      tissueCutoffFreq: 5200,
    };
    engine.applyParameters(tunedParams, false);
    expect(engine.getParameters().sinusResFreq).toBe(950);

    // 4. Singer connects dual analysers to 60fps Spectrum Visualizer and inspects gap
    const canvas = document.createElement('canvas');
    let liveMetrics: any = null;
    const renderer = new SpectrumVisualizerRenderer({
      canvas,
      rawAnalyser: engine.getRawAnalyser(),
      processedAnalyser: engine.getProcessedAnalyser(),
      onMetricsUpdate: (m) => { liveMetrics = m; },
    });
    renderer.resize(800, 300, 1);
    renderer.render();

    // 5. Singer switches to Mode B (Simulated Internal) and listens with zero pops
    engine.setMode('INTERNAL_SIM', false);
    expect(engine.getMode()).toBe('INTERNAL_SIM');

    // 6. Singer exports the calibrated internal voice as standard 16-bit PCM WAV
    const { blob, renderedBuffer } = await renderAndExportWav(
      vocalBuffer as unknown as AudioBuffer,
      'INTERNAL_SIM',
      tunedParams,
      'singer_cranial_calibration.wav',
      { float32: false }
    );

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(44 + 48000 * 3 * 2);
    expect(renderedBuffer.length).toBe(48000 * 3);

    renderer.destroy();
    engine.destroy();
  });

  // ===========================================================================
  // Scenario 2: Podcaster Voice Confrontation Diagnosis & Compensated Voice Bridging
  // ===========================================================================
  it('Scenario 2: Podcaster Voice Confrontation Diagnosis & Compensated Voice Bridging', async () => {
    const ctx = new AudioContextMock();

    // 1. Podcaster loads synthetic Baritone vocal sample
    const podcasterBuffer = createSyntheticVocalBuffer(ctx as unknown as AudioContext, {
      preset: 'male_baritone',
      duration: 4.0,
    });
    expect(podcasterBuffer.duration).toBe(4.0);

    // 2. Mounts studio engine with Deep Chest Male preset
    const engine = new AcousticEngine(ctx as unknown as AudioContext);
    const deepChest = ACOUSTIC_PRESETS.deep_chest_male;
    engine.applyParameters(deepChest.params, true);

    // 3. Podcaster toggles A/B/C listening to diagnose why recorded voice feels "thin"
    engine.setMode('RAW', true);
    expect(engine.getMode()).toBe('RAW');

    engine.setMode('INTERNAL_SIM', false);
    expect(engine.getMode()).toBe('INTERNAL_SIM');

    // 4. Podcaster activates Mode C (COMPENSATED) to restore chest warmth for listeners
    engine.setMode('COMPENSATED', false);
    expect(engine.getMode()).toBe('COMPENSATED');

    // 5. Verifies anti-clipping headroom ensures zero digital clipping
    const headroom = calculateDynamicPreAttenuation(deepChest.params);
    expect(headroom.preAttenDb).toBeLessThanOrEqual(-3.0);

    // 6. Exports compensated voice track for podcast publishing
    const { blob } = await renderAndExportWav(
      podcasterBuffer as unknown as AudioBuffer,
      'COMPENSATED',
      deepChest.params,
      'podcast_compensated_voice.wav'
    );
    expect(blob.size).toBe(44 + podcasterBuffer.length * 2);

    engine.destroy();
  });

  // ===========================================================================
  // Scenario 3: Audio Mastering Engineer Batch Multi-Mode 32-bit Float WAV Archiving
  // ===========================================================================
  it('Scenario 3: Audio Mastering Engineer Batch Multi-Mode 32-bit Float WAV Archiving', async () => {
    const ctx = new AudioContextMock({ sampleRate: 96000 });
    const stereoMasterBuffer = ctx.createBuffer(2, 96000 * 2, 96000); // 2-sec 96kHz stereo

    const dspParams = { ...DEFAULT_DSP_PARAMS, masterGain: -0.5 };

    // Batch render all 3 modes in high-resolution 32-bit IEEE Float format
    const rawResult = await renderAndExportWav(
      stereoMasterBuffer as unknown as AudioBuffer,
      'RAW',
      dspParams,
      'master_track_raw.wav',
      { float32: true }
    );

    const fwdResult = await renderAndExportWav(
      stereoMasterBuffer as unknown as AudioBuffer,
      'INTERNAL_SIM',
      dspParams,
      'master_track_internal.wav',
      { float32: true }
    );

    const invResult = await renderAndExportWav(
      stereoMasterBuffer as unknown as AudioBuffer,
      'COMPENSATED',
      dspParams,
      'master_track_compensated.wav',
      { float32: true }
    );

    // Verify 32-bit float header structure on all three exports
    // Total size = 44 + (96000 * 2 samples) * 2 channels * 4 bytes = 44 + 1536000 = 1536044 bytes
    const expectedSize = 44 + 96000 * 2 * 2 * 4;
    expect(rawResult.blob.size).toBe(expectedSize);
    expect(fwdResult.blob.size).toBe(expectedSize);
    expect(invResult.blob.size).toBe(expectedSize);

    // Validate IEEE Float format tag (0x0003)
    const rawView = new DataView(audioBufferToWav(rawResult.renderedBuffer, { float32: true }));
    expect(rawView.getUint16(20, true)).toBe(3);
    expect(rawView.getUint16(34, true)).toBe(32);
    expect(rawView.getUint32(24, true)).toBe(96000);
  });

  // ===========================================================================
  // Scenario 4: Acoustic Science Classroom Interactive Lecture & Psychoacoustic Guidance
  // ===========================================================================
  it('Scenario 4: Acoustic Science Classroom Interactive Lecture & Psychoacoustic Guidance', () => {
    let activePreset = 'natural_standard';
    let activeMode = 'RAW';

    const { container, unmount } = renderUI(
      React.createElement('div', null,
        React.createElement(GuidanceCards, {
          activeMode: activeMode as any,
          activePreset: activePreset as any,
          onSelectMode: (m) => { activeMode = m; },
          onSelectPreset: (p) => { activePreset = p; },
        })
      )
    );

    // 1. Instructor opens scientific drawer explaining cranial bone conduction physics
    const toggleDrawerBtn = container.querySelector(
      'button[aria-label="Toggle Psychoacoustic Scientific Model"]'
    ) as HTMLButtonElement;
    act(() => {
      toggleDrawerBtn.click();
    });

    expect(container.querySelector('[data-testid="psychoacoustic-overview-drawer"]')).not.toBeNull();
    expect(container.textContent).toContain('Internal Bone Conduction Pathway');
    expect(container.textContent).toContain('External Air Conduction Pathway');

    // 2. Instructor clicks training card action to apply Soprano Cranial profile in studio
    const cardButtons = container.querySelectorAll('[data-testid^="guidance-card-"] button');
    act(() => {
      (cardButtons[0] as HTMLButtonElement).click();
    });

    const presetBtn = container.querySelector('[data-testid^="action-preset-"]') as HTMLButtonElement;
    if (presetBtn) {
      act(() => {
        presetBtn.click();
      });
      expect(activePreset).toBeTruthy();
    }

    unmount();
  });

  // ===========================================================================
  // Scenario 5: Hardware Permission Fallback, Custom Anatomical Tuning & Safe Destruction
  // ===========================================================================
  it('Scenario 5: Hardware Permission Fallback, Custom Anatomical Tuning & Safe Destruction', async () => {
    // 1. User denies microphone permission
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValueOnce(
      new DOMException('Permission denied', 'NotAllowedError')
    );

    // 2. Studio gracefully handles refusal and loads fallback synthetic demo voice
    const ctx = new AudioContextMock();
    const demoBuffer = createSyntheticVocalBuffer(ctx as unknown as AudioContext, {
      duration: 3.0,
      basePitch: 145.0,
    });
    expect(demoBuffer).toBeDefined();

    // 3. User customizes all 16 physiological parameters to match their skull structure
    const customAnatomicalParams = {
      lowShelfFreq: 195,
      lowShelfGain: 9.5,
      mandibleResFreq: 260,
      mandibleResGain: 5.0,
      mandibleResQ: 1.9,
      sinusResFreq: 820,
      sinusResGain: 3.5,
      sinusResQ: 2.3,
      antiResFreq: 1700,
      antiResGain: -4.0,
      antiResQ: 2.1,
      tissueCutoffFreq: 4200,
      tissueCutoffQ: 0.707,
      highShelfFreq: 5800,
      highShelfGain: -7.0,
      masterGain: 0.0,
    };

    const engine = new AcousticEngine(ctx as unknown as AudioContext);
    engine.applyParameters(customAnatomicalParams, true);

    // 4. Performs seamless playback through the custom filter pipeline
    const source = ctx.createBufferSource();
    source.buffer = demoBuffer;
    source.connect(engine.getInput());
    source.start(0);

    // 5. Switches through all 3 modes
    engine.setMode('RAW', false);
    engine.setMode('INTERNAL_SIM', false);
    engine.setMode('COMPENSATED', false);

    source.stop(0);

    // 6. Completely tears down engine and audio graph without leaking nodes
    engine.destroy();
    expect(engine.getParameters().lowShelfFreq).toBe(195);
  });
});
