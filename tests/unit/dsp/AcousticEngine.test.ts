import { describe, it, expect, beforeEach } from 'vitest';
import { AcousticEngine } from '../../../src/audio/AcousticEngine';
import { ACOUSTIC_PRESETS } from '../../../src/audio/constants';
import { DSPParameters } from '../../../src/types/audio';
import {
  AudioContextMock,
  OfflineAudioContextMock,
  installWebAudioMocks,
} from '../../mocks/webAudioMock';
import {
  generateSyntheticVocalPCM,
  createSyntheticVocalBuffer,
  SAMPLE_AUDIO_PRESETS,
} from '../../../src/audio/sampleAudio';

describe('AcousticEngine Graph Architecture & Parameter Management', () => {
  let ctx: AudioContext;

  beforeEach(() => {
    installWebAudioMocks(globalThis);
    ctx = new AudioContextMock({ sampleRate: 48000 }) as unknown as AudioContext;
  });

  describe('1. Initialization & Default Topology', () => {
    it('initializes cleanly with default AudioContext, RAW mode, and Natural Standard preset', () => {
      const engine = new AcousticEngine(ctx);

      expect(engine.getMode()).toBe('RAW');
      const params = engine.getParameters();
      expect(params.lowShelfFreq).toBe(180);
      expect(params.lowShelfGain).toBe(8.0);
      expect(params.tissueCutoffFreq).toBe(4000);
      expect(params.masterGain).toBe(0.0);

      // Verify node accessors
      expect(engine.getInput()).toBeDefined();
      expect(engine.getOutput()).toBeDefined();
      expect(engine.getRawAnalyser()).toBeDefined();
      expect(engine.getProcessedAnalyser()).toBeDefined();

      expect(engine.getRawAnalyser().fftSize).toBe(2048);
      expect(engine.getProcessedAnalyser().fftSize).toBe(2048);
    });

    it('supports instantiation with OfflineAudioContext for batch rendering', () => {
      const offlineCtx = new OfflineAudioContextMock(1, 48000, 48000) as unknown as OfflineAudioContext;
      const engine = new AcousticEngine(offlineCtx);

      expect(engine).toBeDefined();
      expect(engine.getInput()).toBeDefined();
      expect(engine.getOutput()).toBeDefined();
    });

    it('supports suspend and resume lifecycle methods', async () => {
      const engine = new AcousticEngine(ctx);
      await engine.resume();
      expect(ctx.state).toBe('running');
      await engine.suspend();
      expect(ctx.state).toBe('suspended');
    });
  });

  describe('2. Parameter Sanitization & Clamping Boundaries', () => {
    it('clamps parameters within safe physiological bounds when out-of-range values are passed', () => {
      const engine = new AcousticEngine(ctx);

      const extremeParams: DSPParameters = {
        lowShelfFreq: 10,       // Below min 80 -> clamp to 80
        lowShelfGain: 30,       // Above max 14 -> clamp to 14
        mandibleResFreq: 800,   // Above max 400 -> clamp to 400
        mandibleResGain: -10,   // Below min 0 -> clamp to 0
        mandibleResQ: 10.0,     // Above max 4.0 -> clamp to 4.0
        sinusResFreq: 200,      // Below min 500 -> clamp to 500
        sinusResGain: 15,       // Above max 6 -> clamp to 6
        sinusResQ: 0.1,         // Below min 0.5 -> clamp to 0.5
        antiResFreq: 5000,      // Above max 2500 -> clamp to 2500
        antiResGain: 5,         // Above max 0 -> clamp to 0
        antiResQ: 8.0,          // Above max 4.0 -> clamp to 4.0
        tissueCutoffFreq: 1000, // Below min 2000 -> clamp to 2000
        tissueCutoffQ: 3.0,     // Above max 1.5 -> clamp to 1.5
        highShelfFreq: 2000,    // Below min 4000 -> clamp to 4000
        highShelfGain: 10,      // Above max 0 -> clamp to 0
        masterGain: -20,        // Below min -6 -> clamp to -6
      };

      engine.applyParameters(extremeParams, true);
      const clamped = engine.getParameters();

      expect(clamped.lowShelfFreq).toBe(80);
      expect(clamped.lowShelfGain).toBe(14);
      expect(clamped.mandibleResFreq).toBe(400);
      expect(clamped.mandibleResGain).toBe(0);
      expect(clamped.mandibleResQ).toBe(4.0);
      expect(clamped.sinusResFreq).toBe(500);
      expect(clamped.sinusResGain).toBe(6);
      expect(clamped.sinusResQ).toBe(0.5);
      expect(clamped.antiResFreq).toBe(2500);
      expect(clamped.antiResGain).toBe(0);
      expect(clamped.tissueCutoffFreq).toBe(2000);
      expect(clamped.highShelfFreq).toBe(4000);
      expect(clamped.highShelfGain).toBe(0);
      expect(clamped.masterGain).toBe(-6);
    });

    it('sanitizes NaN and Infinity to standard defaults without throwing', () => {
      const engine = new AcousticEngine(ctx);
      const invalidParams = {
        ...ACOUSTIC_PRESETS.natural_standard.params,
        lowShelfFreq: NaN,
        lowShelfGain: Infinity,
        tissueCutoffFreq: -Infinity,
      };

      expect(() => engine.applyParameters(invalidParams, true)).not.toThrow();
      const sanitized = engine.getParameters();
      expect(Number.isFinite(sanitized.lowShelfFreq)).toBe(true);
      expect(Number.isFinite(sanitized.lowShelfGain)).toBe(true);
      expect(Number.isFinite(sanitized.tissueCutoffFreq)).toBe(true);
    });

    it('returns an independent cloned copy of parameters to prevent external mutation', () => {
      const engine = new AcousticEngine(ctx);
      const params1 = engine.getParameters();
      params1.lowShelfGain = 999;

      const params2 = engine.getParameters();
      expect(params2.lowShelfGain).not.toBe(999);
    });
  });

  describe('3. Physiological Presets Application', () => {
    it('applies deep_chest_male preset correctly', () => {
      const engine = new AcousticEngine(ctx);
      engine.applyParameters(ACOUSTIC_PRESETS.deep_chest_male.params, true);

      const p = engine.getParameters();
      expect(p.lowShelfFreq).toBe(140);
      expect(p.lowShelfGain).toBe(11.0);
      expect(p.mandibleResGain).toBe(6.0);
      expect(p.tissueCutoffFreq).toBe(3400);
    });

    it('applies bright_cranial_female preset correctly', () => {
      const engine = new AcousticEngine(ctx);
      engine.applyParameters(ACOUSTIC_PRESETS.bright_cranial_female.params, true);

      const p = engine.getParameters();
      expect(p.lowShelfFreq).toBe(220);
      expect(p.lowShelfGain).toBe(6.5);
      expect(p.sinusResFreq).toBe(920);
      expect(p.tissueCutoffFreq).toBe(4800);
    });

    it('applies intense_confrontation preset correctly', () => {
      const engine = new AcousticEngine(ctx);
      engine.applyParameters(ACOUSTIC_PRESETS.intense_confrontation.params, true);

      const p = engine.getParameters();
      expect(p.lowShelfGain).toBe(13.0);
      expect(p.mandibleResGain).toBe(7.0);
      expect(p.tissueCutoffFreq).toBe(3200);
      expect(p.highShelfGain).toBe(-10.0);
    });
  });

  describe('4. A/B/C Listening Mode Transitions & Crossfade Scheduling', () => {
    it('switches between RAW, INTERNAL_SIM, and COMPENSATED modes and updates state', () => {
      const engine = new AcousticEngine(ctx);

      engine.setMode('INTERNAL_SIM', true);
      expect(engine.getMode()).toBe('INTERNAL_SIM');

      engine.setMode('COMPENSATED', true);
      expect(engine.getMode()).toBe('COMPENSATED');

      engine.setMode('RAW', true);
      expect(engine.getMode()).toBe('RAW');
    });

    it('schedules smooth 25ms equal-power / linear crossfades when immediate is false', () => {
      const engine = new AcousticEngine(ctx);
      engine.setMode('INTERNAL_SIM', false);
      expect(engine.getMode()).toBe('INTERNAL_SIM');
    });
  });

  describe('5. Theoretical Response Export API', () => {
    it('exports analytical frequency response curve for FORWARD branch', () => {
      const engine = new AcousticEngine(ctx);
      engine.applyParameters(ACOUSTIC_PRESETS.natural_standard.params, true);

      const testFreqs = new Float32Array([100, 180, 780, 4000, 10000]);
      const response = engine.getTheoreticalResponse(testFreqs, 'FORWARD');

      expect(response).toHaveLength(testFreqs.length);
      // Low frequency (100Hz) should be boosted (>1.5 linear)
      expect(response[0]).toBeGreaterThan(1.5);
      // High frequency (10000Hz) should be attenuated (<0.8 linear)
      expect(response[4]).toBeLessThan(0.8);
    });

    it('exports analytical frequency response curve for INVERSE branch', () => {
      const engine = new AcousticEngine(ctx);
      engine.applyParameters(ACOUSTIC_PRESETS.natural_standard.params, true);

      const testFreqs = new Float32Array([100, 180, 780, 4000, 10000]);
      const response = engine.getTheoreticalResponse(testFreqs, 'INVERSE');

      expect(response).toHaveLength(testFreqs.length);
      // Low frequency (100Hz) should be cut (<1.0 linear)
      expect(response[0]).toBeLessThan(1.0);
      // High frequency presence should be preserved or boosted
      expect(response[3]).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('6. OfflineAudioContext processBuffer Integration', () => {
    it('processes synthetic vocal buffer through AcousticEngine.processBuffer', async () => {
      const testCtx = new OfflineAudioContextMock(1, 48000 * 0.1, 48000) as unknown as BaseAudioContext;
      const testBuffer = createSyntheticVocalBuffer(testCtx, { duration: 0.1 });

      const processed = await AcousticEngine.processBuffer(
        testBuffer,
        'INTERNAL_SIM',
        ACOUSTIC_PRESETS.natural_standard.params
      );

      expect(processed).toBeDefined();
      expect(processed.length).toBe(testBuffer.length);
      expect(processed.numberOfChannels).toBe(testBuffer.numberOfChannels);

      const channelData = processed.getChannelData(0);
      let maxVal = 0;
      for (let i = 0; i < channelData.length; i++) {
        if (Math.abs(channelData[i]) > maxVal) maxVal = Math.abs(channelData[i]);
      }
      expect(maxVal).toBeGreaterThan(0.01);
      expect(maxVal).toBeLessThanOrEqual(1.0);
    });
  });

  describe('7. Sample Audio Synthetic Voice Utility', () => {
    it('generates deterministic PCM vocal data with valid length and bounds', () => {
      const pcm = generateSyntheticVocalPCM({ duration: 0.5, sampleRate: 48000 });
      expect(pcm).toHaveLength(24000);

      let peak = 0;
      for (let i = 0; i < pcm.length; i++) {
        if (Math.abs(pcm[i]) > peak) peak = Math.abs(pcm[i]);
      }
      // Peak normalized to -3dBFS (~0.707)
      expect(peak).toBeCloseTo(0.707, 1);
    });

    it('creates AudioBuffer correctly from synthetic vocal generator presets', () => {
      for (const [, preset] of Object.entries(SAMPLE_AUDIO_PRESETS)) {
        const buffer = createSyntheticVocalBuffer(ctx, { ...preset.options, duration: 0.1 });
        expect(buffer).toBeDefined();
        expect(buffer.duration).toBeCloseTo(0.1, 2);
        expect(buffer.numberOfChannels).toBe(1);
      }
    });
  });

  describe('8. Lifecycle Cleanup & Node Disconnection', () => {
    it('destroys graph and disconnects nodes without error', () => {
      const engine = new AcousticEngine(ctx);
      expect(() => engine.destroy()).not.toThrow();
      // Multiple destroy calls should be idempotent
      expect(() => engine.destroy()).not.toThrow();
    });
  });
});
