/**
 * VocalMirror Web Audio API Mocking Infrastructure for Vitest / jsdom
 * 
 * Provides high-fidelity, standalone Web Audio API mocks including:
 * - Analytical BiquadFilterNode.getFrequencyResponse (RBJ Cookbook formulas)
 * - Deterministic OfflineAudioContext DSP difference equation rendering
 * - AudioParam scheduling and transition event tracking
 * - AnalyserNode FFT float and byte frequency simulation
 * - MediaStream / MediaStreamTrack / MediaRecorder / getUserMedia emulation
 */

// ==========================================
// 1. AudioParam Mock
// ==========================================

export interface ScheduledAudioParamEvent {
  type: 'setValueAtTime' | 'linearRamp' | 'exponentialRamp' | 'setTargetAtTime' | 'setValueCurve';
  value?: number;
  time: number;
  duration?: number;
  timeConstant?: number;
  curve?: Float32Array | number[];
}

export class AudioParamMock {
  public value: number;
  public defaultValue: number;
  public minValue: number;
  public maxValue: number;
  public events: ScheduledAudioParamEvent[] = [];

  constructor(defaultValue = 0, minValue = -3.4028235e38, maxValue = 3.4028235e38) {
    this.value = defaultValue;
    this.defaultValue = defaultValue;
    this.minValue = minValue;
    this.maxValue = maxValue;
  }

  public setValueAtTime(value: number, startTime: number): this {
    this.value = Math.max(this.minValue, Math.min(this.maxValue, value));
    this.events.push({ type: 'setValueAtTime', value: this.value, time: startTime });
    return this;
  }

  public linearRampToValueAtTime(value: number, endTime: number): this {
    this.value = Math.max(this.minValue, Math.min(this.maxValue, value));
    this.events.push({ type: 'linearRamp', value: this.value, time: endTime });
    return this;
  }

  public exponentialRampToValueAtTime(value: number, endTime: number): this {
    this.value = Math.max(this.minValue, Math.min(this.maxValue, value));
    this.events.push({ type: 'exponentialRamp', value: this.value, time: endTime });
    return this;
  }

  public setTargetAtTime(target: number, startTime: number, timeConstant: number): this {
    this.value = Math.max(this.minValue, Math.min(this.maxValue, target));
    this.events.push({ type: 'setTargetAtTime', value: this.value, time: startTime, timeConstant });
    return this;
  }

  public setValueCurveAtTime(values: Float32Array | number[], startTime: number, duration: number): this {
    if (values.length > 0) {
      this.value = values[values.length - 1];
    }
    this.events.push({ type: 'setValueCurve', curve: values, time: startTime, duration });
    return this;
  }

  public cancelScheduledValues(startTime: number): this {
    this.events = this.events.filter((e) => e.time < startTime);
    return this;
  }

  public cancelAndHoldAtTime(cancelTime: number): this {
    this.events = this.events.filter((e) => e.time <= cancelTime);
    return this;
  }
}

// ==========================================
// 2. Base AudioNode Mock
// ==========================================

export class AudioNodeMock {
  public context: BaseAudioContextMock;
  public numberOfInputs: number;
  public numberOfOutputs: number;
  public channelCount = 2;
  public channelCountMode: ChannelCountMode = 'max';
  public channelInterpretation: ChannelInterpretation = 'speakers';

  public _outputs: Array<AudioNodeMock | AudioParamMock> = [];
  public _inputs: AudioNodeMock[] = [];

  constructor(context: BaseAudioContextMock, inputs = 1, outputs = 1) {
    this.context = context;
    this.numberOfInputs = inputs;
    this.numberOfOutputs = outputs;
  }

  public connect(destination: AudioNodeMock | AudioParamMock, _outputIndex = 0, _inputIndex = 0): any {
    this._outputs.push(destination);
    if (destination instanceof AudioNodeMock) {
      destination._inputs.push(this);
    }
    return destination;
  }

  public disconnect(destination?: AudioNodeMock | AudioParamMock | number): void {
    if (destination === undefined) {
      for (const out of this._outputs) {
        if (out instanceof AudioNodeMock) {
          const idx = out._inputs.indexOf(this);
          if (idx !== -1) out._inputs.splice(idx, 1);
        }
      }
      this._outputs = [];
    } else if (typeof destination === 'number') {
      this._outputs = [];
    } else {
      const idx = this._outputs.indexOf(destination);
      if (idx !== -1) {
        this._outputs.splice(idx, 1);
        if (destination instanceof AudioNodeMock) {
          const inIdx = destination._inputs.indexOf(this);
          if (inIdx !== -1) destination._inputs.splice(inIdx, 1);
        }
      }
    }
  }

  // Event Target Stubs
  public addEventListener(_type: string, _listener: any): void {}
  public removeEventListener(_type: string, _listener: any): void {}
  public dispatchEvent(_event: any): boolean { return true; }
}

// ==========================================
// 3. GainNode Mock
// ==========================================

export class GainNodeMock extends AudioNodeMock {
  public gain: AudioParamMock;

  constructor(context: BaseAudioContextMock) {
    super(context, 1, 1);
    this.gain = new AudioParamMock(1.0, -3.4028235e38, 3.4028235e38);
  }
}

// ==========================================
// 4. BiquadFilterNode Mock (with Analytical RBJ Math)
// ==========================================

export type BiquadFilterType =
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'lowshelf'
  | 'highshelf'
  | 'peaking'
  | 'notch'
  | 'allpass';

export class BiquadFilterNodeMock extends AudioNodeMock {
  public type: BiquadFilterType = 'lowpass';
  public frequency: AudioParamMock;
  public detune: AudioParamMock;
  public Q: AudioParamMock;
  public gain: AudioParamMock;

  constructor(context: BaseAudioContextMock) {
    super(context, 1, 1);
    this.frequency = new AudioParamMock(350, 0, context.sampleRate / 2);
    this.detune = new AudioParamMock(0, -153600, 153600);
    this.Q = new AudioParamMock(1.0, 0.0001, 1000);
    this.gain = new AudioParamMock(0.0, -100, 100);
  }

  /**
   * Calculates analytical RBJ biquad frequency and phase response curves
   */
  public getFrequencyResponse(
    frequencyHz: Float32Array,
    magResponseOutput: Float32Array,
    phaseResponseOutput?: Float32Array
  ): void {
    const fs = this.context.sampleRate;
    const f0 = Math.max(1, Math.min(fs / 2 - 1, this.frequency.value));
    const Q = Math.max(0.001, this.Q.value);
    const gainDb = this.gain.value;

    const { b0, b1, b2, a0, a1, a2 } = computeBiquadCoefficients(this.type, f0, fs, Q, gainDb);

    for (let k = 0; k < frequencyHz.length; k++) {
      const f = frequencyHz[k];
      const theta = (2 * Math.PI * f) / fs;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const cos2T = Math.cos(2 * theta);
      const sin2T = Math.sin(2 * theta);

      const numRe = b0 + b1 * cosT + b2 * cos2T;
      const numIm = -b1 * sinT - b2 * sin2T;
      const denRe = a0 + a1 * cosT + a2 * cos2T;
      const denIm = -a1 * sinT - a2 * sin2T;

      const numMag2 = numRe * numRe + numIm * numIm;
      const denMag2 = denRe * denRe + denIm * denIm;
      const mag = Math.sqrt(numMag2 / Math.max(1e-12, denMag2));

      magResponseOutput[k] = mag;

      if (phaseResponseOutput) {
        const numPhase = Math.atan2(numIm, numRe);
        const denPhase = Math.atan2(denIm, denRe);
        phaseResponseOutput[k] = numPhase - denPhase;
      }
    }
  }
}

/**
 * Helper to compute Robert Bristow-Johnson (RBJ) coefficients
 */
export function computeBiquadCoefficients(
  type: BiquadFilterType,
  f0: number,
  fs: number,
  Q: number,
  gainDb: number
): { b0: number; b1: number; b2: number; a0: number; a1: number; a2: number } {
  const w0 = (2 * Math.PI * f0) / fs;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const A = Math.pow(10, gainDb / 40);
  const alpha = sinW0 / (2 * Math.max(0.0001, Q));
  const beta = Math.sqrt(A) * sinW0;

  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

  switch (type) {
    case 'lowpass':
      b0 = (1 - cosW0) / 2;
      b1 = 1 - cosW0;
      b2 = (1 - cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'highpass':
      b0 = (1 + cosW0) / 2;
      b1 = -(1 + cosW0);
      b2 = (1 + cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'peaking':
      b0 = 1 + alpha * A;
      b1 = -2 * cosW0;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cosW0;
      a2 = 1 - alpha / A;
      break;

    case 'lowshelf':
      b0 = A * ((A + 1) - (A - 1) * cosW0 + beta);
      b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
      b2 = A * ((A + 1) - (A - 1) * cosW0 - beta);
      a0 = (A + 1) + (A - 1) * cosW0 + beta;
      a1 = -2 * ((A - 1) + (A + 1) * cosW0);
      a2 = (A + 1) + (A - 1) * cosW0 - beta;
      break;

    case 'highshelf':
      b0 = A * ((A + 1) + (A - 1) * cosW0 + beta);
      b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
      b2 = A * ((A + 1) + (A - 1) * cosW0 - beta);
      a0 = (A + 1) - (A - 1) * cosW0 + beta;
      a1 = 2 * ((A - 1) - (A + 1) * cosW0);
      a2 = (A + 1) - (A - 1) * cosW0 - beta;
      break;

    case 'notch':
      b0 = 1;
      b1 = -2 * cosW0;
      b2 = 1;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'bandpass':
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'allpass':
      b0 = 1 - alpha;
      b1 = -2 * cosW0;
      b2 = 1 + alpha;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
  }

  return { b0, b1, b2, a0, a1, a2 };
}

// ==========================================
// 5. DynamicsCompressorNode Mock
// ==========================================

export class DynamicsCompressorNodeMock extends AudioNodeMock {
  public threshold: AudioParamMock;
  public knee: AudioParamMock;
  public ratio: AudioParamMock;
  public reduction = 0;
  public attack: AudioParamMock;
  public release: AudioParamMock;

  constructor(context: BaseAudioContextMock) {
    super(context, 1, 1);
    this.threshold = new AudioParamMock(-24, -100, 0);
    this.knee = new AudioParamMock(30, 0, 40);
    this.ratio = new AudioParamMock(12, 1, 20);
    this.attack = new AudioParamMock(0.003, 0, 1);
    this.release = new AudioParamMock(0.25, 0, 1);
  }
}

// ==========================================
// 6. AnalyserNode Mock
// ==========================================

export class AnalyserNodeMock extends AudioNodeMock {
  public fftSize = 2048;
  public minDecibels = -100;
  public maxDecibels = -30;
  public smoothingTimeConstant = 0.8;

  public _mockFloatFreqData: Float32Array | null = null;
  public _mockFloatTimeData: Float32Array | null = null;

  constructor(context: BaseAudioContextMock) {
    super(context, 1, 1);
  }

  public get frequencyBinCount(): number {
    return this.fftSize / 2;
  }

  public getFloatFrequencyData(array: Float32Array): void {
    const bins = this.frequencyBinCount;
    for (let i = 0; i < Math.min(array.length, bins); i++) {
      if (this._mockFloatFreqData && i < this._mockFloatFreqData.length) {
        array[i] = this._mockFloatFreqData[i];
      } else {
        // Default simulated frequency response roll-off
        const freqRatio = i / bins;
        array[i] = this.minDecibels + (this.maxDecibels - this.minDecibels) * Math.max(0, 1 - Math.sqrt(freqRatio));
      }
    }
  }

  public getByteFrequencyData(array: Uint8Array): void {
    const floatData = new Float32Array(array.length);
    this.getFloatFrequencyData(floatData);
    const range = Math.max(1, this.maxDecibels - this.minDecibels);
    for (let i = 0; i < array.length; i++) {
      const normalized = (floatData[i] - this.minDecibels) / range;
      array[i] = Math.max(0, Math.min(255, Math.floor(normalized * 255)));
    }
  }

  public getFloatTimeDomainData(array: Float32Array): void {
    for (let i = 0; i < array.length; i++) {
      if (this._mockFloatTimeData && i < this._mockFloatTimeData.length) {
        array[i] = this._mockFloatTimeData[i];
      } else {
        array[i] = 0;
      }
    }
  }

  public getByteTimeDomainData(array: Uint8Array): void {
    for (let i = 0; i < array.length; i++) {
      array[i] = 128;
    }
  }

  public setMockFrequencyData(data: Float32Array | number[]): void {
    this._mockFloatFreqData = new Float32Array(data);
  }

  public setMockTimeDomainData(data: Float32Array | number[]): void {
    this._mockFloatTimeData = new Float32Array(data);
  }
}

// ==========================================
// 7. AudioBuffer & Source Node Mocks
// ==========================================

export class AudioBufferMock {
  public numberOfChannels: number;
  public length: number;
  public sampleRate: number;
  public _channels: Float32Array[];

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number });
  constructor(numberOfChannels: number, length: number, sampleRate: number);
  constructor(
    arg1: number | { numberOfChannels: number; length: number; sampleRate: number },
    arg2?: number,
    arg3?: number
  ) {
    if (typeof arg1 === 'object') {
      this.numberOfChannels = arg1.numberOfChannels;
      this.length = arg1.length;
      this.sampleRate = arg1.sampleRate;
    } else {
      this.numberOfChannels = arg1;
      this.length = arg2 || 0;
      this.sampleRate = arg3 || 48000;
    }
    this._channels = [];
    for (let c = 0; c < this.numberOfChannels; c++) {
      this._channels.push(new Float32Array(this.length));
    }
  }

  public get duration(): number {
    return this.length / this.sampleRate;
  }

  public getChannelData(channel: number): Float32Array {
    if (channel < 0 || channel >= this.numberOfChannels) {
      throw new DOMException('IndexSizeError: Invalid channel index');
    }
    return this._channels[channel];
  }

  public copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset = 0): void {
    const src = this.getChannelData(channelNumber);
    destination.set(src.subarray(bufferOffset, bufferOffset + destination.length));
  }

  public copyToChannel(source: Float32Array, channelNumber: number, bufferOffset = 0): void {
    const dst = this.getChannelData(channelNumber);
    dst.set(source, bufferOffset);
  }
}

export class AudioBufferSourceNodeMock extends AudioNodeMock {
  public buffer: AudioBufferMock | null = null;
  public playbackRate: AudioParamMock;
  public detune: AudioParamMock;
  public loop = false;
  public loopStart = 0;
  public loopEnd = 0;
  public onended: ((this: AudioBufferSourceNodeMock, ev: Event) => any) | null = null;

  public _state: 'idle' | 'playing' | 'stopped' = 'idle';
  public _startTime: number | null = null;
  public _stopTime: number | null = null;

  constructor(context: BaseAudioContextMock) {
    super(context, 0, 1);
    this.playbackRate = new AudioParamMock(1.0, 0, 1024);
    this.detune = new AudioParamMock(0, -153600, 153600);
  }

  public start(when = 0, _offset = 0, _duration?: number): void {
    this._state = 'playing';
    this._startTime = when;
  }

  public stop(when = 0): void {
    this._state = 'stopped';
    this._stopTime = when;
    if (this.onended) {
      this.onended.call(this, new Event('ended'));
    }
  }
}

// ==========================================
// 8. MediaStream & MediaStreamAudioSourceNode Mocks
// ==========================================

export class MediaStreamTrackMock {
  public kind: 'audio' | 'video' = 'audio';
  public id = `track-${Math.random().toString(36).substr(2, 9)}`;
  public label = 'Mock Audio Track';
  public enabled = true;
  public readyState: 'live' | 'ended' = 'live';
  public onended: ((this: MediaStreamTrackMock, ev: Event) => any) | null = null;

  public stop(): void {
    this.readyState = 'ended';
  }
}

export class MediaStreamMock {
  public id = `stream-${Math.random().toString(36).substr(2, 9)}`;
  public active = true;
  private _tracks: MediaStreamTrackMock[] = [];

  constructor(tracks: MediaStreamTrackMock[] = [new MediaStreamTrackMock()]) {
    this._tracks = [...tracks];
  }

  public getTracks(): MediaStreamTrackMock[] {
    return [...this._tracks];
  }

  public getAudioTracks(): MediaStreamTrackMock[] {
    return this._tracks.filter((t) => t.kind === 'audio');
  }

  public getVideoTracks(): MediaStreamTrackMock[] {
    return this._tracks.filter((t) => t.kind === 'video');
  }

  public addTrack(track: MediaStreamTrackMock): void {
    this._tracks.push(track);
  }

  public removeTrack(track: MediaStreamTrackMock): void {
    const idx = this._tracks.indexOf(track);
    if (idx !== -1) this._tracks.splice(idx, 1);
  }
}

export class MediaStreamAudioSourceNodeMock extends AudioNodeMock {
  public mediaStream: MediaStreamMock;

  constructor(context: BaseAudioContextMock, options: { mediaStream: MediaStreamMock }) {
    super(context, 0, 1);
    this.mediaStream = options.mediaStream;
  }
}

// ==========================================
// 9. MediaRecorder Mock
// ==========================================

export class MediaRecorderMock {
  public stream: MediaStreamMock;
  public mimeType: string;
  public state: 'inactive' | 'recording' | 'paused' = 'inactive';
  public ondataavailable: ((event: { data: Blob }) => void) | null = null;
  public onstop: ((event: Event) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onstart: ((event: Event) => void) | null = null;

  constructor(stream: MediaStreamMock, options: { mimeType?: string } = {}) {
    this.stream = stream;
    this.mimeType = options.mimeType || 'audio/webm';
  }

  public start(_timeslice?: number): void {
    this.state = 'recording';
    if (this.onstart) this.onstart(new Event('start'));
  }

  public stop(): void {
    this.state = 'inactive';
    if (this.ondataavailable) {
      const mockWavData = new Uint8Array(1024);
      const blob = new Blob([mockWavData], { type: this.mimeType });
      this.ondataavailable({ data: blob });
    }
    if (this.onstop) this.onstop(new Event('stop'));
  }

  public pause(): void {
    this.state = 'paused';
  }

  public resume(): void {
    this.state = 'recording';
  }

  public requestData(): void {
    if (this.ondataavailable) {
      const blob = new Blob([new Uint8Array(256)], { type: this.mimeType });
      this.ondataavailable({ data: blob });
    }
  }

  public static isTypeSupported(type: string): boolean {
    return ['audio/webm', 'audio/ogg', 'audio/wav'].some((t) => type.startsWith(t));
  }
}

// ==========================================
// 10. BaseAudioContext, AudioContext & OfflineAudioContext
// ==========================================

export class AudioDestinationNodeMock extends AudioNodeMock {
  public maxChannelCount = 2;
  constructor(context: BaseAudioContextMock) {
    super(context, 1, 0);
  }
}

export abstract class BaseAudioContextMock {
  public sampleRate = 48000;
  public currentTime = 0;
  public state: AudioContextState = 'suspended';
  public destination: AudioDestinationNodeMock;
  public onstatechange: ((this: BaseAudioContextMock, ev: Event) => any) | null = null;

  constructor(sampleRate = 48000) {
    this.sampleRate = sampleRate;
    this.destination = new AudioDestinationNodeMock(this);
  }

  public createGain(): GainNodeMock {
    return new GainNodeMock(this);
  }

  public createBiquadFilter(): BiquadFilterNodeMock {
    return new BiquadFilterNodeMock(this);
  }

  public createDynamicsCompressor(): DynamicsCompressorNodeMock {
    return new DynamicsCompressorNodeMock(this);
  }

  public createAnalyser(): AnalyserNodeMock {
    return new AnalyserNodeMock(this);
  }

  public createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBufferMock {
    return new AudioBufferMock({ numberOfChannels, length, sampleRate });
  }

  public createBufferSource(): AudioBufferSourceNodeMock {
    return new AudioBufferSourceNodeMock(this);
  }

  public createMediaStreamSource(mediaStream: MediaStreamMock): MediaStreamAudioSourceNodeMock {
    return new MediaStreamAudioSourceNodeMock(this, { mediaStream });
  }

  public async decodeAudioData(
    audioData: ArrayBuffer,
    successCallback?: (decodedData: AudioBufferMock) => void,
    _errorCallback?: (error: Error) => void
  ): Promise<AudioBufferMock> {
    const numSamples = Math.max(128, (audioData.byteLength / 2) | 0);
    const buffer = this.createBuffer(1, numSamples, this.sampleRate);
    if (successCallback) successCallback(buffer);
    return buffer;
  }
}

export class AudioContextMock extends BaseAudioContextMock {
  constructor(options?: number | { sampleRate?: number }) {
    const rate = typeof options === 'number' ? options : options?.sampleRate || 48000;
    super(rate);
  }

  public async resume(): Promise<void> {
    this.state = 'running';
    if (this.onstatechange) this.onstatechange.call(this, new Event('statechange'));
  }

  public async suspend(): Promise<void> {
    this.state = 'suspended';
    if (this.onstatechange) this.onstatechange.call(this, new Event('statechange'));
  }

  public async close(): Promise<void> {
    this.state = 'closed';
    if (this.onstatechange) this.onstatechange.call(this, new Event('statechange'));
  }
}

export class OfflineAudioContextMock extends BaseAudioContextMock {
  public length: number;
  public numberOfChannels: number;

  constructor(numberOfChannels: number, length: number, sampleRate: number);
  constructor(options: { numberOfChannels: number; length: number; sampleRate: number });
  constructor(
    arg1: number | { numberOfChannels: number; length: number; sampleRate: number },
    arg2?: number,
    arg3?: number
  ) {
    let channels = 1;
    let len = 48000;
    let rate = 48000;

    if (typeof arg1 === 'object') {
      channels = arg1.numberOfChannels;
      len = arg1.length;
      rate = arg1.sampleRate;
    } else {
      channels = arg1;
      len = arg2 || 48000;
      rate = arg3 || 48000;
    }

    super(rate);
    this.numberOfChannels = channels;
    this.length = len;
  }

  /**
   * Deterministic DSP difference equation rendering of audio graph
   */
  public async startRendering(): Promise<AudioBufferMock> {
    this.state = 'running';
    const rendered = new AudioBufferMock(this.numberOfChannels, this.length, this.sampleRate);

    // If source node is connected, run offline simulation
    const sourceNode = this._findSourceNode();
    if (sourceNode && sourceNode.buffer) {
      const srcChannel = sourceNode.buffer.getChannelData(0);
      const outChannel = rendered.getChannelData(0);

      // Collect biquad filters in forward signal path
      const filterChain = this._findFilterChain(sourceNode);

      // Apply cascade difference equation simulation
      let currentSignal: any = new Float32Array(srcChannel);

      for (const filter of filterChain) {
        currentSignal = applyBiquadFilterDSP(currentSignal, filter, this.sampleRate);
      }

      // Apply dynamic compressor soft-knee limiting
      const compressor = this._findCompressorNode();
      if (compressor) {
        currentSignal = applyCompressorLimiter(currentSignal);
      }

      // Copy to output buffer
      for (let i = 0; i < Math.min(outChannel.length, currentSignal.length); i++) {
        outChannel[i] = currentSignal[i];
      }
    }

    return rendered;
  }

  private _findSourceNode(): AudioBufferSourceNodeMock | null {
    const visited = new Set<any>();
    const stack: any[] = [this.destination];

    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || visited.has(node)) continue;
      visited.add(node);

      if (node instanceof AudioBufferSourceNodeMock) {
        return node;
      }
      if (node._inputs) {
        for (const input of node._inputs) {
          stack.push(input);
        }
      }
    }
    return null;
  }

  private _findFilterChain(sourceNode: AudioNodeMock): BiquadFilterNodeMock[] {
    const filters: BiquadFilterNodeMock[] = [];
    const visited = new Set<any>();
    const stack: any[] = [sourceNode];

    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || visited.has(node)) continue;
      visited.add(node);

      if (node instanceof BiquadFilterNodeMock) {
        filters.push(node);
      }
      if (node instanceof GainNodeMock && node.gain.value <= 0.001) {
        continue;
      }
      if (node._outputs) {
        for (const out of node._outputs) {
          if (out instanceof AudioNodeMock) stack.push(out);
        }
      }
    }
    return filters;
  }

  private _findCompressorNode(): DynamicsCompressorNodeMock | null {
    const visited = new Set<any>();
    const stack: any[] = [this.destination];

    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || visited.has(node)) continue;
      visited.add(node);

      if (node instanceof DynamicsCompressorNodeMock) {
        return node;
      }
      if (node._inputs) {
        for (const input of node._inputs) {
          stack.push(input);
        }
      }
    }
    return null;
  }
}

function applyBiquadFilterDSP(
  input: Float32Array,
  filter: BiquadFilterNodeMock,
  fs: number
): Float32Array {
  const output = new Float32Array(input.length);
  const { b0, b1, b2, a0, a1, a2 } = computeBiquadCoefficients(
    filter.type,
    filter.frequency.value,
    fs,
    filter.Q.value,
    filter.gain.value
  );

  const b0_n = b0 / a0;
  const b1_n = b1 / a0;
  const b2_n = b2 / a0;
  const a1_n = a1 / a0;
  const a2_n = a2 / a0;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let n = 0; n < input.length; n++) {
    const x = input[n];
    const y = b0_n * x + b1_n * x1 + b2_n * x2 - a1_n * y1 - a2_n * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = isFinite(y) ? y : 0;
    output[n] = y1;
  }
  return output;
}

function applyCompressorLimiter(input: Float32Array): Float32Array {
  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const sample = input[i];
    // Transparent soft-knee limiter ensuring peak <= 1.0
    if (Math.abs(sample) <= 0.8) {
      output[i] = sample;
    } else {
      const sign = sample < 0 ? -1 : 1;
      output[i] = sign * (0.8 + 0.2 * Math.tanh((Math.abs(sample) - 0.8) / 0.2));
    }
  }
  return output;
}

// ==========================================
// 11. Environment Setup & Registration
// ==========================================

export function installWebAudioMocks(globalTarget: any = globalThis): void {
  globalTarget.AudioContext = AudioContextMock;
  globalTarget.webkitAudioContext = AudioContextMock;
  globalTarget.OfflineAudioContext = OfflineAudioContextMock;
  globalTarget.webkitOfflineAudioContext = OfflineAudioContextMock;

  globalTarget.AudioNode = AudioNodeMock;
  globalTarget.AudioParam = AudioParamMock;
  globalTarget.GainNode = GainNodeMock;
  globalTarget.BiquadFilterNode = BiquadFilterNodeMock;
  globalTarget.DynamicsCompressorNode = DynamicsCompressorNodeMock;
  globalTarget.AnalyserNode = AnalyserNodeMock;
  globalTarget.AudioBuffer = AudioBufferMock;
  globalTarget.AudioBufferSourceNode = AudioBufferSourceNodeMock;
  globalTarget.MediaStreamAudioSourceNode = MediaStreamAudioSourceNodeMock;

  globalTarget.MediaStream = MediaStreamMock;
  globalTarget.MediaStreamTrack = MediaStreamTrackMock;
  globalTarget.MediaRecorder = MediaRecorderMock;

  if (!globalTarget.navigator) {
    globalTarget.navigator = {};
  }
  if (!globalTarget.navigator.mediaDevices) {
    globalTarget.navigator.mediaDevices = {};
  }
  globalTarget.navigator.mediaDevices.getUserMedia = async (
    _constraints?: MediaStreamConstraints
  ): Promise<MediaStreamMock> => {
    return new MediaStreamMock();
  };
}
