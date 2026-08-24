import { describe, it, expect, beforeEach } from 'vitest';
import {
  AudioContextMock,
  OfflineAudioContextMock,
  BiquadFilterNodeMock,
  GainNodeMock,
  AnalyserNodeMock,
  AudioBufferMock,
  AudioBufferSourceNodeMock,
  MediaStreamMock,
  MediaStreamTrackMock,
  MediaRecorderMock,
  AudioParamMock,
  installWebAudioMocks,
  computeBiquadCoefficients,
} from '../mocks/webAudioMock';

describe('Web Audio API Mock Infrastructure Fidelity Test Suite', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
  });

  describe('1. AudioParam Mock Scheduling & Events', () => {
    it('manages value clamps and records setValueAtTime', () => {
      const param = new AudioParamMock(1.0, 0.0, 10.0);
      expect(param.value).toBe(1.0);

      param.setValueAtTime(5.0, 1.0);
      expect(param.value).toBe(5.0);
      expect(param.events).toHaveLength(1);
      expect(param.events[0]).toEqual({
        type: 'setValueAtTime',
        value: 5.0,
        time: 1.0,
      });

      // Clamping test
      param.setValueAtTime(15.0, 2.0);
      expect(param.value).toBe(10.0);
    });

    it('records linearRampToValueAtTime, exponentialRampToValueAtTime, and setTargetAtTime', () => {
      const param = new AudioParamMock(0.0, -100, 100);

      param.linearRampToValueAtTime(0.5, 0.025);
      param.exponentialRampToValueAtTime(1.0, 0.05);
      param.setTargetAtTime(0.2, 0.1, 0.015);

      expect(param.events).toHaveLength(3);
      expect(param.events[0].type).toBe('linearRamp');
      expect(param.events[1].type).toBe('exponentialRamp');
      expect(param.events[2].type).toBe('setTargetAtTime');
      expect(param.events[2].timeConstant).toBe(0.015);
    });

    it('handles setValueCurveAtTime and cancellation methods', () => {
      const param = new AudioParamMock(0.0);
      const curve = new Float32Array([0.1, 0.5, 0.9]);

      param.setValueCurveAtTime(curve, 0.0, 0.1);
      expect(param.value).toBeCloseTo(0.9, 5);
      expect(param.events).toHaveLength(1);

      param.setValueAtTime(0.2, 0.5);
      param.setValueAtTime(0.3, 1.0);
      expect(param.events).toHaveLength(3);

      param.cancelScheduledValues(0.6);
      expect(param.events).toHaveLength(2);

      param.cancelAndHoldAtTime(0.5);
      expect(param.events).toHaveLength(2);
    });
  });

  describe('2. AudioNode Graph Connection & Disconnection', () => {
    it('connects nodes and manages input/output references', () => {
      const ctx = new AudioContextMock();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      gain1.connect(gain2);
      expect(gain1._outputs).toContain(gain2);
      expect(gain2._inputs).toContain(gain1);

      gain1.disconnect(gain2);
      expect(gain1._outputs).not.toContain(gain2);
      expect(gain2._inputs).not.toContain(gain1);
    });

    it('connects node to AudioParam', () => {
      const ctx = new AudioContextMock();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      gain1.connect(gain2.gain);
      expect(gain1._outputs).toContain(gain2.gain);

      gain1.disconnect();
      expect(gain1._outputs).toHaveLength(0);
    });
  });

  describe('3. Analytical RBJ BiquadFilter Frequency Response', () => {
    it('calculates analytical Low-Shelf response correctly', () => {
      const ctx = new AudioContextMock(48000);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowshelf';
      filter.frequency.value = 180;
      filter.gain.value = 8.0; // +8 dB boost

      const freqs = new Float32Array([50, 180, 2000]);
      const mag = new Float32Array(3);
      const phase = new Float32Array(3);

      filter.getFrequencyResponse(freqs, mag, phase);

      // Low frequency (50Hz) should be boosted (linear > 2.0, ~2.51 for 8dB)
      expect(mag[0]).toBeGreaterThan(2.0);
      // Center frequency (180Hz) should be approximately half-gain (~4dB -> ~1.58)
      expect(mag[1]).toBeCloseTo(1.58, 1);
      // High frequency (2000Hz) should have unity gain (1.0 -> 0dB)
      expect(mag[2]).toBeCloseTo(1.0, 1);
      expect(phase).toHaveLength(3);
    });

    it('calculates analytical High-Shelf response correctly', () => {
      const ctx = new AudioContextMock(48000);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highshelf';
      filter.frequency.value = 4000;
      filter.gain.value = -12.0; // -12 dB cut

      const freqs = new Float32Array([100, 4000, 10000]);
      const mag = new Float32Array(3);

      filter.getFrequencyResponse(freqs, mag);

      // Low frequency should have unity gain
      expect(mag[0]).toBeCloseTo(1.0, 1);
      // High frequency should be attenuated (-12dB -> ~0.25)
      expect(mag[2]).toBeCloseTo(0.25, 1);
    });

    it('calculates analytical Peaking filter response correctly', () => {
      const ctx = new AudioContextMock(48000);
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = 1000;
      filter.Q.value = 2.0;
      filter.gain.value = 6.0; // +6 dB peak boost (~2.0 linear)

      const freqs = new Float32Array([100, 1000, 10000]);
      const mag = new Float32Array(3);

      filter.getFrequencyResponse(freqs, mag);

      expect(mag[0]).toBeCloseTo(1.0, 1);
      expect(mag[1]).toBeCloseTo(1.995, 1);
      expect(mag[2]).toBeCloseTo(1.0, 1);
    });

    it('calculates analytical Lowpass & Highpass filter responses', () => {
      const ctx = new AudioContextMock(48000);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1000;
      const lpMag = new Float32Array(2);
      lp.getFrequencyResponse(new Float32Array([100, 10000]), lpMag);
      expect(lpMag[0]).toBeCloseTo(1.0, 1);
      expect(lpMag[1]).toBeLessThan(0.1);

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1000;
      const hpMag = new Float32Array(2);
      hp.getFrequencyResponse(new Float32Array([100, 10000]), hpMag);
      expect(hpMag[0]).toBeLessThan(0.1);
      expect(hpMag[1]).toBeCloseTo(1.0, 1);
    });

    it('computes coefficients for notch, bandpass, and allpass', () => {
      const notch = computeBiquadCoefficients('notch', 1000, 48000, 1.0, 0);
      expect(notch.b0).toBe(1);
      expect(notch.a0).toBeGreaterThan(1);

      const bandpass = computeBiquadCoefficients('bandpass', 1000, 48000, 1.0, 0);
      expect(bandpass.b1).toBe(0);

      const allpass = computeBiquadCoefficients('allpass', 1000, 48000, 1.0, 0);
      expect(allpass.a1).toBe(allpass.b1);
    });
  });

  describe('4. OfflineAudioContext Deterministic DSP Rendering & Limiting', () => {
    it('renders audio graph with peaking filter boost and verifies limiter headroom', async () => {
      const length = 4800; // 0.1s
      const offlineCtx = new OfflineAudioContextMock(1, length, 48000);

      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = 440;
      filter.gain.value = 14.0; // Extreme +14dB boost

      const compressor = offlineCtx.createDynamicsCompressor();

      const buffer = offlineCtx.createBuffer(1, length, 48000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        channel[i] = 0.9 * Math.sin((2 * Math.PI * 440 * i) / 48000);
      }

      const src = offlineCtx.createBufferSource();
      src.buffer = buffer;

      src.connect(filter);
      filter.connect(compressor);
      compressor.connect(offlineCtx.destination);
      src.start(0);

      const rendered = await offlineCtx.startRendering();
      expect(rendered.length).toBe(length);

      const out = rendered.getChannelData(0);
      let maxPeak = 0;
      for (let i = 0; i < out.length; i++) {
        const abs = Math.abs(out[i]);
        if (abs > maxPeak) maxPeak = abs;
      }

      // Must be bounded within 1.0 (0dBFS) by soft-knee limiter
      expect(maxPeak).toBeLessThanOrEqual(1.0);
    });
  });

  describe('5. AnalyserNode FFT Data Emulation', () => {
    it('provides default frequency roll-off and supports custom mock frequency data', () => {
      const ctx = new AudioContextMock();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;

      expect(analyser.frequencyBinCount).toBe(1024);

      const floatData = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(floatData);

      expect(floatData).toHaveLength(1024);
      expect(floatData[0]).toBeGreaterThanOrEqual(analyser.minDecibels);
      expect(floatData[0]).toBeLessThanOrEqual(analyser.maxDecibels);

      // Custom mock frequency data injection
      const customFreq = new Float32Array(1024).fill(-20.0);
      analyser.setMockFrequencyData(customFreq);

      const newFloatData = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(newFloatData);
      expect(newFloatData[0]).toBe(-20.0);
      expect(newFloatData[500]).toBe(-20.0);

      // Byte conversion test
      const byteData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(byteData);
      expect(byteData).toHaveLength(1024);
      expect(byteData[0]).toBeGreaterThanOrEqual(0);
      expect(byteData[0]).toBeLessThanOrEqual(255);
    });

    it('provides time domain data correctly', () => {
      const ctx = new AudioContextMock();
      const analyser = ctx.createAnalyser();

      const timeFloat = new Float32Array(512);
      analyser.getFloatTimeDomainData(timeFloat);
      expect(timeFloat[0]).toBe(0);

      const timeByte = new Uint8Array(512);
      analyser.getByteTimeDomainData(timeByte);
      expect(timeByte[0]).toBe(128); // Midpoint for 8-bit PCM

      analyser.setMockTimeDomainData(new Float32Array([0.5, -0.5]));
      analyser.getFloatTimeDomainData(timeFloat);
      expect(timeFloat[0]).toBe(0.5);
      expect(timeFloat[1]).toBe(-0.5);
    });
  });

  describe('6. AudioBuffer & Source Node Functionality', () => {
    it('manages multi-channel buffers and copying', () => {
      const ctx = new AudioContextMock(44100);
      const buffer = ctx.createBuffer(2, 441, 44100);

      expect(buffer.numberOfChannels).toBe(2);
      expect(buffer.length).toBe(441);
      expect(buffer.duration).toBeCloseTo(0.01, 4);

      const src = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      buffer.copyToChannel(src, 0, 10);

      const dst = new Float32Array(4);
      buffer.copyFromChannel(dst, 0, 10);
      expect(dst[0]).toBeCloseTo(0.1, 4);
      expect(dst[3]).toBeCloseTo(0.4, 4);

      expect(() => buffer.getChannelData(5)).toThrow();
    });

    it('controls source playback state and dispatches onended', () => {
      const ctx = new AudioContextMock();
      const src = ctx.createBufferSource();
      let ended = false;
      src.onended = () => {
        ended = true;
      };

      src.start(0);
      expect(src._state).toBe('playing');

      src.stop(1.0);
      expect(src._state).toBe('stopped');
      expect(ended).toBe(true);
    });
  });

  describe('7. MediaStream & MediaRecorder Mock Lifecycle', () => {
    it('handles MediaStream tracks and stop behavior', () => {
      const track1 = new MediaStreamTrackMock();
      const track2 = new MediaStreamTrackMock();
      const stream = new MediaStreamMock([track1, track2]);

      expect(stream.getTracks()).toHaveLength(2);
      expect(stream.getAudioTracks()).toHaveLength(2);
      expect(stream.getVideoTracks()).toHaveLength(0);

      track1.stop();
      expect(track1.readyState).toBe('ended');

      stream.removeTrack(track1);
      expect(stream.getTracks()).toHaveLength(1);
    });

    it('emulates MediaRecorder recording, dataavailable, and stop lifecycle', async () => {
      const stream = new MediaStreamMock();
      const recorder = new MediaRecorderMock(stream, { mimeType: 'audio/webm' });

      let receivedBlob: Blob | null = null;
      let stopTriggered = false;

      recorder.ondataavailable = (event) => {
        receivedBlob = event.data;
      };
      recorder.onstop = () => {
        stopTriggered = true;
      };

      recorder.start();
      expect(recorder.state).toBe('recording');

      recorder.pause();
      expect(recorder.state).toBe('paused');

      recorder.resume();
      expect(recorder.state).toBe('recording');

      recorder.stop();
      expect(recorder.state).toBe('inactive');
      expect(receivedBlob).not.toBeNull();
      expect(stopTriggered).toBe(true);

      expect(MediaRecorderMock.isTypeSupported('audio/webm')).toBe(true);
      expect(MediaRecorderMock.isTypeSupported('video/mp4')).toBe(false);
    });
  });

  describe('8. AudioContext Lifecycle & State Transitions', () => {
    it('transitions states cleanly and triggers onstatechange', async () => {
      const ctx = new AudioContextMock();
      let changeCount = 0;
      ctx.onstatechange = () => {
        changeCount++;
      };

      expect(ctx.state).toBe('suspended');

      await ctx.resume();
      expect(ctx.state).toBe('running');
      expect(changeCount).toBe(1);

      await ctx.suspend();
      expect(ctx.state).toBe('suspended');
      expect(changeCount).toBe(2);

      await ctx.close();
      expect(ctx.state).toBe('closed');
      expect(changeCount).toBe(3);
    });

    it('decodes audio data into an AudioBufferMock', async () => {
      const ctx = new AudioContextMock();
      const rawData = new ArrayBuffer(1024);

      let callbackBuffer: AudioBufferMock | null = null;
      const buffer = await ctx.decodeAudioData(rawData, (b) => {
        callbackBuffer = b;
      });

      expect(buffer).toBeDefined();
      expect(buffer.length).toBe(512);
      expect(callbackBuffer).toBe(buffer);
    });
  });
});
