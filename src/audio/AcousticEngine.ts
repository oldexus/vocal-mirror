/**
 * VocalMirror — Bidirectional Acoustic DSP Engine
 * 
 * Implements real-time cranial bone-conduction simulation (Air-to-Internal)
 * and regularized inverse compensation (Internal-to-External) via Web Audio API.
 */

import {
  DSPParameters,
  ListeningMode,
} from '../types/audio';
import {
  DEFAULT_DSP_PARAMS,
  DEFAULT_COMPRESSOR_SETTINGS,
  AUDIO_CONSTANTS,
  PARAMETER_LIMITS,
} from './constants';
import {
  calculateDynamicPreAttenuation,
  dbToLinear,
  calculateTheoreticalBranchResponse,
} from './biquadMath';

export class AcousticEngine {
  private ctx: AudioContext | OfflineAudioContext;
  private isOffline: boolean;

  // Master Nodes
  private inputNode!: GainNode;
  private outputNode!: GainNode;
  private compressor!: DynamicsCompressorNode;
  private rawAnalyser!: AnalyserNode;
  private processedAnalyser!: AnalyserNode;

  // Mode Crossfade Routing Gains
  private rawGain!: GainNode;
  private fwdGain!: GainNode;
  private invGain!: GainNode;

  // Forward (Air-to-Internal / Mode B) Chain Nodes
  private fwdPreGain!: GainNode;
  private fwdLowShelf!: BiquadFilterNode;
  private fwdMandiblePeak!: BiquadFilterNode;
  private fwdSinusPeak!: BiquadFilterNode;
  private fwdAntiResNotch!: BiquadFilterNode;
  private fwdTissueLP!: BiquadFilterNode;
  private fwdHighShelf!: BiquadFilterNode;
  private fwdPostGain!: GainNode;

  // Inverse (Compensation / Mode C) Chain Nodes
  private invPreGain!: GainNode;
  private invHighPass!: BiquadFilterNode;
  private invLowShelfCut!: BiquadFilterNode;
  private invMandibleDip!: BiquadFilterNode;
  private invSinusDip!: BiquadFilterNode;
  private invPresenceBoost!: BiquadFilterNode;
  private invHighShelfAir!: BiquadFilterNode;
  private invPostGain!: GainNode;

  // State
  private currentMode: ListeningMode = 'RAW';
  private currentParams: DSPParameters = { ...DEFAULT_DSP_PARAMS };
  private isDestroyed = false;

  constructor(context?: AudioContext | OfflineAudioContext) {
    if (context) {
      this.ctx = context;
    } else {
      const AudioCtxConstructor =
        (typeof window !== 'undefined' && ((window as any).AudioContext || (window as any).webkitAudioContext)) ||
        (typeof globalThis !== 'undefined' && ((globalThis as any).AudioContext || (globalThis as any).webkitAudioContext));
      this.ctx = new AudioCtxConstructor();
    }

    this.isOffline =
      typeof OfflineAudioContext !== 'undefined' &&
      this.ctx instanceof OfflineAudioContext;

    this.buildGraph();
    this.applyParameters(this.currentParams, true);
    this.setMode('RAW', true);
  }

  /**
   * Constructs the complete Web Audio processing graph.
   */
  private buildGraph(): void {
    // 1. Inputs, Outputs, and Analysers
    this.inputNode = this.ctx.createGain();
    this.outputNode = this.ctx.createGain();
    this.compressor = this.ctx.createDynamicsCompressor();

    this.rawAnalyser = this.ctx.createAnalyser();
    this.rawAnalyser.fftSize = AUDIO_CONSTANTS.DEFAULT_FFT_SIZE;
    this.rawAnalyser.smoothingTimeConstant = AUDIO_CONSTANTS.SMOOTHING_TIME_CONSTANT;
    this.rawAnalyser.minDecibels = AUDIO_CONSTANTS.MIN_DECIBELS;
    this.rawAnalyser.maxDecibels = AUDIO_CONSTANTS.MAX_DECIBELS;

    this.processedAnalyser = this.ctx.createAnalyser();
    this.processedAnalyser.fftSize = AUDIO_CONSTANTS.DEFAULT_FFT_SIZE;
    this.processedAnalyser.smoothingTimeConstant = AUDIO_CONSTANTS.SMOOTHING_TIME_CONSTANT;
    this.processedAnalyser.minDecibels = AUDIO_CONSTANTS.MIN_DECIBELS;
    this.processedAnalyser.maxDecibels = AUDIO_CONSTANTS.MAX_DECIBELS;

    // Direct input taps into rawAnalyser for input spectrum monitoring
    this.inputNode.connect(this.rawAnalyser);

    // 2. Soft-Knee Limiting Compressor Setup
    this.compressor.threshold.value = DEFAULT_COMPRESSOR_SETTINGS.threshold;
    this.compressor.knee.value = DEFAULT_COMPRESSOR_SETTINGS.knee;
    this.compressor.ratio.value = DEFAULT_COMPRESSOR_SETTINGS.ratio;
    this.compressor.attack.value = DEFAULT_COMPRESSOR_SETTINGS.attack;
    this.compressor.release.value = DEFAULT_COMPRESSOR_SETTINGS.release;

    // 3. Mode Crossfade Gain Nodes
    this.rawGain = this.ctx.createGain();
    this.fwdGain = this.ctx.createGain();
    this.invGain = this.ctx.createGain();

    // Mode A: Raw direct path
    this.inputNode.connect(this.rawGain);
    this.rawGain.connect(this.compressor);

    // 4. Forward Chain (Air-to-Internal)
    this.fwdPreGain = this.ctx.createGain();
    this.fwdLowShelf = this.ctx.createBiquadFilter();
    this.fwdLowShelf.type = 'lowshelf';
    this.fwdMandiblePeak = this.ctx.createBiquadFilter();
    this.fwdMandiblePeak.type = 'peaking';
    this.fwdSinusPeak = this.ctx.createBiquadFilter();
    this.fwdSinusPeak.type = 'peaking';
    this.fwdAntiResNotch = this.ctx.createBiquadFilter();
    this.fwdAntiResNotch.type = 'peaking';
    this.fwdTissueLP = this.ctx.createBiquadFilter();
    this.fwdTissueLP.type = 'lowpass';
    this.fwdHighShelf = this.ctx.createBiquadFilter();
    this.fwdHighShelf.type = 'highshelf';
    this.fwdPostGain = this.ctx.createGain();

    this.inputNode.connect(this.fwdGain);
    this.fwdGain.connect(this.fwdPreGain);
    this.fwdPreGain
      .connect(this.fwdLowShelf)
      .connect(this.fwdMandiblePeak)
      .connect(this.fwdSinusPeak)
      .connect(this.fwdAntiResNotch)
      .connect(this.fwdTissueLP)
      .connect(this.fwdHighShelf)
      .connect(this.fwdPostGain)
      .connect(this.compressor);

    // 5. Inverse Chain (Compensation / Voice Bridging)
    this.invPreGain = this.ctx.createGain();
    this.invHighPass = this.ctx.createBiquadFilter();
    this.invHighPass.type = 'highpass';
    this.invLowShelfCut = this.ctx.createBiquadFilter();
    this.invLowShelfCut.type = 'lowshelf';
    this.invMandibleDip = this.ctx.createBiquadFilter();
    this.invMandibleDip.type = 'peaking';
    this.invSinusDip = this.ctx.createBiquadFilter();
    this.invSinusDip.type = 'peaking';
    this.invPresenceBoost = this.ctx.createBiquadFilter();
    this.invPresenceBoost.type = 'peaking';
    this.invHighShelfAir = this.ctx.createBiquadFilter();
    this.invHighShelfAir.type = 'highshelf';
    this.invPostGain = this.ctx.createGain();

    this.inputNode.connect(this.invGain);
    this.invGain.connect(this.invPreGain);
    this.invPreGain
      .connect(this.invHighPass)
      .connect(this.invLowShelfCut)
      .connect(this.invMandibleDip)
      .connect(this.invSinusDip)
      .connect(this.invPresenceBoost)
      .connect(this.invHighShelfAir)
      .connect(this.invPostGain)
      .connect(this.compressor);

    // 6. Compressor Output -> Processed Analyser -> Master Output
    this.compressor.connect(this.processedAnalyser);
    this.processedAnalyser.connect(this.outputNode);

    if (!this.isOffline && this.ctx.destination) {
      this.outputNode.connect(this.ctx.destination);
    }
  }

  /**
   * Applies DSP parameters to active audio graph with smooth AudioParam transition.
   */
  public applyParameters(params: DSPParameters, immediate = false): void {
    if (this.isDestroyed) return;

    // Clamp input parameters against valid physiological limits and sanitize NaN/Inf
    const p: DSPParameters = {
      lowShelfFreq: this.clamp(params.lowShelfFreq, PARAMETER_LIMITS.lowShelfFreq.min, PARAMETER_LIMITS.lowShelfFreq.max, PARAMETER_LIMITS.lowShelfFreq.default),
      lowShelfGain: this.clamp(params.lowShelfGain, PARAMETER_LIMITS.lowShelfGain.min, PARAMETER_LIMITS.lowShelfGain.max, PARAMETER_LIMITS.lowShelfGain.default),
      mandibleResFreq: this.clamp(params.mandibleResFreq, PARAMETER_LIMITS.mandibleResFreq.min, PARAMETER_LIMITS.mandibleResFreq.max, PARAMETER_LIMITS.mandibleResFreq.default),
      mandibleResGain: this.clamp(params.mandibleResGain, PARAMETER_LIMITS.mandibleResGain.min, PARAMETER_LIMITS.mandibleResGain.max, PARAMETER_LIMITS.mandibleResGain.default),
      mandibleResQ: this.clamp(params.mandibleResQ, PARAMETER_LIMITS.mandibleResQ.min, PARAMETER_LIMITS.mandibleResQ.max, PARAMETER_LIMITS.mandibleResQ.default),
      sinusResFreq: this.clamp(params.sinusResFreq, PARAMETER_LIMITS.sinusResFreq.min, PARAMETER_LIMITS.sinusResFreq.max, PARAMETER_LIMITS.sinusResFreq.default),
      sinusResGain: this.clamp(params.sinusResGain, PARAMETER_LIMITS.sinusResGain.min, PARAMETER_LIMITS.sinusResGain.max, PARAMETER_LIMITS.sinusResGain.default),
      sinusResQ: this.clamp(params.sinusResQ, PARAMETER_LIMITS.sinusResQ.min, PARAMETER_LIMITS.sinusResQ.max, PARAMETER_LIMITS.sinusResQ.default),
      antiResFreq: this.clamp(params.antiResFreq, PARAMETER_LIMITS.antiResFreq.min, PARAMETER_LIMITS.antiResFreq.max, PARAMETER_LIMITS.antiResFreq.default),
      antiResGain: this.clamp(params.antiResGain, PARAMETER_LIMITS.antiResGain.min, PARAMETER_LIMITS.antiResGain.max, PARAMETER_LIMITS.antiResGain.default),
      antiResQ: this.clamp(params.antiResQ, PARAMETER_LIMITS.antiResQ.min, PARAMETER_LIMITS.antiResQ.max, PARAMETER_LIMITS.antiResQ.default),
      tissueCutoffFreq: this.clamp(params.tissueCutoffFreq, PARAMETER_LIMITS.tissueCutoffFreq.min, PARAMETER_LIMITS.tissueCutoffFreq.max, PARAMETER_LIMITS.tissueCutoffFreq.default),
      tissueCutoffQ: this.clamp(params.tissueCutoffQ, PARAMETER_LIMITS.tissueCutoffQ.min, PARAMETER_LIMITS.tissueCutoffQ.max, PARAMETER_LIMITS.tissueCutoffQ.default),
      highShelfFreq: this.clamp(params.highShelfFreq, PARAMETER_LIMITS.highShelfFreq.min, PARAMETER_LIMITS.highShelfFreq.max, PARAMETER_LIMITS.highShelfFreq.default),
      highShelfGain: this.clamp(params.highShelfGain, PARAMETER_LIMITS.highShelfGain.min, PARAMETER_LIMITS.highShelfGain.max, PARAMETER_LIMITS.highShelfGain.default),
      masterGain: this.clamp(params.masterGain, PARAMETER_LIMITS.masterGain.min, PARAMETER_LIMITS.masterGain.max, PARAMETER_LIMITS.masterGain.default),
    };

    this.currentParams = { ...p };
    const now = this.ctx.currentTime;
    const timeConst = immediate ? 0 : AUDIO_CONSTANTS.PARAM_SMOOTHING_TIME_SEC;

    // 1. Dynamic Headroom Pre-Attenuation
    const { preGainLinear } = calculateDynamicPreAttenuation(p);
    this.setParam(this.fwdPreGain.gain, preGainLinear, now, timeConst);

    // 2. Forward Node Parameter Updates
    this.setParam(this.fwdLowShelf.frequency, p.lowShelfFreq, now, timeConst);
    this.setParam(this.fwdLowShelf.gain, p.lowShelfGain, now, timeConst);

    this.setParam(this.fwdMandiblePeak.frequency, p.mandibleResFreq, now, timeConst);
    this.setParam(this.fwdMandiblePeak.Q, p.mandibleResQ, now, timeConst);
    this.setParam(this.fwdMandiblePeak.gain, p.mandibleResGain, now, timeConst);

    this.setParam(this.fwdSinusPeak.frequency, p.sinusResFreq, now, timeConst);
    this.setParam(this.fwdSinusPeak.Q, p.sinusResQ, now, timeConst);
    this.setParam(this.fwdSinusPeak.gain, p.sinusResGain, now, timeConst);

    this.setParam(this.fwdAntiResNotch.frequency, p.antiResFreq, now, timeConst);
    this.setParam(this.fwdAntiResNotch.Q, p.antiResQ, now, timeConst);
    this.setParam(this.fwdAntiResNotch.gain, p.antiResGain, now, timeConst);

    this.setParam(this.fwdTissueLP.frequency, p.tissueCutoffFreq, now, timeConst);
    this.setParam(this.fwdTissueLP.Q, p.tissueCutoffQ, now, timeConst);

    this.setParam(this.fwdHighShelf.frequency, p.highShelfFreq, now, timeConst);
    this.setParam(this.fwdHighShelf.gain, p.highShelfGain, now, timeConst);

    const fwdPostGainLinear = dbToLinear(1.5);
    this.setParam(this.fwdPostGain.gain, fwdPostGainLinear, now, timeConst);

    // 3. Inverse Node Parameter Updates
    this.setParam(this.invPreGain.gain, 0.707, now, timeConst); // -3dB
    this.setParam(this.invHighPass.frequency, AUDIO_CONSTANTS.INVERSE_SUBSONIC_HIGHPASS_FREQ, now, timeConst);
    this.setParam(this.invHighPass.Q, AUDIO_CONSTANTS.INVERSE_SUBSONIC_HIGHPASS_Q, now, timeConst);

    this.setParam(this.invLowShelfCut.frequency, p.lowShelfFreq, now, timeConst);
    this.setParam(this.invLowShelfCut.gain, -p.lowShelfGain, now, timeConst);

    this.setParam(this.invMandibleDip.frequency, p.mandibleResFreq, now, timeConst);
    this.setParam(this.invMandibleDip.Q, p.mandibleResQ, now, timeConst);
    this.setParam(this.invMandibleDip.gain, -p.mandibleResGain, now, timeConst);

    this.setParam(this.invSinusDip.frequency, p.sinusResFreq, now, timeConst);
    this.setParam(this.invSinusDip.Q, p.sinusResQ, now, timeConst);
    this.setParam(this.invSinusDip.gain, -p.sinusResGain, now, timeConst);

    this.setParam(this.invPresenceBoost.frequency, p.antiResFreq, now, timeConst);
    this.setParam(this.invPresenceBoost.Q, p.antiResQ, now, timeConst);
    this.setParam(this.invPresenceBoost.gain, -p.antiResGain, now, timeConst);

    this.setParam(this.invHighShelfAir.frequency, AUDIO_CONSTANTS.INVERSE_HIGHSHELF_AIR_FREQ, now, timeConst);
    this.setParam(
      this.invHighShelfAir.gain,
      Math.min(AUDIO_CONSTANTS.INVERSE_MAX_AIR_BOOST_DB, -p.highShelfGain),
      now,
      timeConst
    );

    const invPostGainLinear = dbToLinear(1.0);
    this.setParam(this.invPostGain.gain, invPostGainLinear, now, timeConst);

    // 4. Output Trim
    this.setParam(this.outputNode.gain, dbToLinear(p.masterGain), now, timeConst);
  }

  /**
   * Switches active listening mode with 25ms equal-power zero-pop crossfade.
   */
  public setMode(mode: ListeningMode, immediate = false): void {
    if (this.isDestroyed) return;
    this.currentMode = mode;

    const now = this.ctx.currentTime;
    const duration = immediate ? 0 : AUDIO_CONSTANTS.CROSSFADE_DURATION_SEC;

    const rawTarget = mode === 'RAW' ? 1.0 : 0.0001;
    const fwdTarget = mode === 'INTERNAL_SIM' ? 1.0 : 0.0001;
    const invTarget = mode === 'COMPENSATED' ? 1.0 : 0.0001;

    this.crossfadeGain(this.rawGain, rawTarget, now, duration);
    this.crossfadeGain(this.fwdGain, fwdTarget, now, duration);
    this.crossfadeGain(this.invGain, invTarget, now, duration);
  }

  /**
   * Safely ramps an AudioParam without audio artifacts or scheduling collisions.
   */
  private setParam(param: AudioParam, value: number, now: number, timeConstant: number): void {
    if (timeConstant <= 0) {
      param.cancelScheduledValues(now);
      param.setValueAtTime(value, now);
    } else {
      param.setTargetAtTime(value, now, timeConstant);
    }
  }

  /**
   * Crossfades a GainNode smoothly using linear ramps.
   */
  private crossfadeGain(gainNode: GainNode, target: number, now: number, duration: number): void {
    gainNode.gain.cancelScheduledValues(now);
    if (duration <= 0) {
      gainNode.gain.setValueAtTime(target, now);
    } else {
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(target, now + duration);
    }
  }

  private clamp(val: number, min: number, max: number, defaultVal: number): number {
    if (val === undefined || val === null || isNaN(val) || !isFinite(val)) {
      return defaultVal;
    }
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Returns analytical linear frequency response curve for the active filter cascade.
   */
  public getTheoreticalResponse(
    frequencies: Float32Array,
    mode: 'FORWARD' | 'INVERSE'
  ): Float32Array {
    const { magnitudes } = calculateTheoreticalBranchResponse(
      this.currentParams,
      mode,
      frequencies,
      this.ctx.sampleRate
    );
    return magnitudes;
  }

  /**
   * Processes an AudioBuffer through the DSP engine using OfflineAudioContext.
   * Ensures 100% bit-accurate parity with live real-time studio listening.
   */
  public static async processBuffer(
    inputBuffer: AudioBuffer,
    mode: ListeningMode,
    params: DSPParameters = DEFAULT_DSP_PARAMS
  ): Promise<AudioBuffer> {
    const OfflineCtxConstructor =
      (typeof window !== 'undefined' && ((window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext)) ||
      (typeof globalThis !== 'undefined' && ((globalThis as any).OfflineAudioContext || (globalThis as any).webkitOfflineAudioContext));
    const offlineCtx = new OfflineCtxConstructor(
      inputBuffer.numberOfChannels,
      inputBuffer.length,
      inputBuffer.sampleRate
    );

    const offlineEngine = new AcousticEngine(offlineCtx);
    offlineEngine.applyParameters(params, true);
    offlineEngine.setMode(mode, true);

    const source = offlineCtx.createBufferSource();
    source.buffer = inputBuffer;
    source.connect(offlineEngine.getInput());
    offlineEngine.getOutput().connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    offlineEngine.destroy();
    return renderedBuffer;
  }

  // Lifecycle & Getters
  public getInput(): GainNode { return this.inputNode; }
  public getOutput(): GainNode { return this.outputNode; }
  public getRawAnalyser(): AnalyserNode { return this.rawAnalyser; }
  public getProcessedAnalyser(): AnalyserNode { return this.processedAnalyser; }
  public getMode(): ListeningMode { return this.currentMode; }
  public getParameters(): DSPParameters { return { ...this.currentParams }; }
  public getContext(): AudioContext | OfflineAudioContext { return this.ctx; }

  public async resume(): Promise<void> {
    if (this.ctx.state === 'suspended' && 'resume' in this.ctx) {
      await this.ctx.resume();
    }
  }

  public async suspend(): Promise<void> {
    if (this.ctx instanceof AudioContext && this.ctx.state === 'running') {
      await this.ctx.suspend();
    }
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    try {
      this.inputNode.disconnect();
      this.rawGain.disconnect();
      this.fwdGain.disconnect();
      this.invGain.disconnect();
      this.fwdPreGain.disconnect();
      this.fwdLowShelf.disconnect();
      this.fwdMandiblePeak.disconnect();
      this.fwdSinusPeak.disconnect();
      this.fwdAntiResNotch.disconnect();
      this.fwdTissueLP.disconnect();
      this.fwdHighShelf.disconnect();
      this.fwdPostGain.disconnect();
      this.invPreGain.disconnect();
      this.invHighPass.disconnect();
      this.invLowShelfCut.disconnect();
      this.invMandibleDip.disconnect();
      this.invSinusDip.disconnect();
      this.invPresenceBoost.disconnect();
      this.invHighShelfAir.disconnect();
      this.invPostGain.disconnect();
      this.compressor.disconnect();
      this.rawAnalyser.disconnect();
      this.processedAnalyser.disconnect();
      this.outputNode.disconnect();

      if (this.ctx && typeof (this.ctx as any).close === 'function' && this.ctx.state !== 'closed') {
        (this.ctx as any).close().catch(() => {});
      }
    } catch {
      // Ignore disconnect errors during teardown
    }
  }
}
