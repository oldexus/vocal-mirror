import { describe, it, expect } from 'vitest';
import '../setup';

describe('VocalMirror Milestone 0 — Baseline Toolchain Smoke Test Suite', () => {

  describe('1. Runtime & Environment Sanity', () => {
    it('should have standard modern JavaScript globals and TypedArrays', () => {
      expect(Float32Array).toBeDefined();
      expect(Int16Array).toBeDefined();
      expect(Uint8Array).toBeDefined();
      expect(Uint8ClampedArray).toBeDefined();
      expect(DataView).toBeDefined();
      expect(ArrayBuffer).toBeDefined();
      expect(Math.log10).toBeDefined();
    });

    it('should execute asynchronous microtasks cleanly', async () => {
      const result = await Promise.resolve('VOCAL_MIRROR_M0_READY');
      expect(result).toBe('VOCAL_MIRROR_M0_READY');
    });
  });

  describe('2. Web Audio & Media Global Mock Environment', () => {
    it('should expose AudioContext and OfflineAudioContext constructors globally', () => {
      expect(globalThis.AudioContext).toBeDefined();
      expect(globalThis.OfflineAudioContext).toBeDefined();
      const ctx = new globalThis.AudioContext();
      expect(ctx).toBeDefined();
      expect(ctx.sampleRate).toBe(48000);
      expect(ctx.state).toBe('suspended');
    });

    it('should expose MediaStream and MediaRecorder constructors globally', () => {
      expect(globalThis.MediaStream).toBeDefined();
      expect(globalThis.MediaRecorder).toBeDefined();
      const stream = new globalThis.MediaStream();
      expect(stream.active).toBe(true);
      expect(stream.getTracks().length).toBeGreaterThan(0);
      const recorder = new globalThis.MediaRecorder(stream);
      expect(recorder.state).toBe('inactive');
    });

    it('should support navigator.mediaDevices.getUserMedia mock', async () => {
      expect(navigator.mediaDevices).toBeDefined();
      expect(navigator.mediaDevices.getUserMedia).toBeDefined();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      expect(stream).toBeDefined();
      expect(stream.getAudioTracks().length).toBeGreaterThan(0);
    });
  });

  describe('3. Acoustic Frequency Mathematics Verification', () => {
    it('should calculate accurate Logarithmic frequency coordinate mapping', () => {
      const fMin = 20;
      const fMax = 20000;
      const canvasWidth = 1000;

      const logMap = (f: number): number => {
        const clampedF = Math.max(fMin, Math.min(fMax, f));
        return (
          ((Math.log10(clampedF) - Math.log10(fMin)) /
            (Math.log10(fMax) - Math.log10(fMin))) *
          canvasWidth
        );
      };

      // 20Hz should map to x = 0
      expect(logMap(20)).toBeCloseTo(0, 1);
      // 20000Hz should map to x = 1000
      expect(logMap(20000)).toBeCloseTo(1000, 1);
      // 1000Hz should map to approximately 566px (log10(1000/20) / log10(1000) = 1.69897 / 3 = 0.5663)
      const x1k = logMap(1000);
      expect(x1k).toBeGreaterThan(550);
      expect(x1k).toBeLessThan(580);
    });

    it('should convert decibels to linear amplitude and back correctly', () => {
      const dbToLin = (db: number) => Math.pow(10, db / 20);
      const linToDb = (lin: number) => 20 * Math.log10(Math.max(1e-6, lin));

      expect(dbToLin(0)).toBeCloseTo(1.0, 4);
      expect(dbToLin(-6)).toBeCloseTo(0.501, 3);
      expect(dbToLin(6)).toBeCloseTo(1.995, 3);

      expect(linToDb(1.0)).toBeCloseTo(0, 4);
      expect(linToDb(0.501187)).toBeCloseTo(-6, 2);
    });
  });

  describe('4. Binary RIFF/WAV Header Structure Verification', () => {
    it('should validate standard 44-byte RIFF WAVE header byte layout', () => {
      const buffer = new ArrayBuffer(44);
      const view = new DataView(buffer);

      const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      };

      // 1. "RIFF" chunk descriptor
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + 1000, true); // ChunkSize
      writeString(8, 'WAVE');

      // 2. "fmt " sub-chunk
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);       // Subchunk1Size (16 for PCM)
      view.setUint16(20, 1, true);        // AudioFormat (1 for PCM)
      view.setUint16(22, 1, true);        // NumChannels (1 mono)
      view.setUint32(24, 44100, true);    // SampleRate (44100 Hz)
      view.setUint32(28, 44100 * 2, true);// ByteRate (SampleRate * NumChannels * BitsPerSample/8)
      view.setUint16(32, 2, true);        // BlockAlign (NumChannels * BitsPerSample/8)
      view.setUint16(34, 16, true);       // BitsPerSample (16 bits)

      // 3. "data" sub-chunk
      writeString(36, 'data');
      view.setUint32(40, 1000, true);     // Subchunk2Size

      // Validate Header
      expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
      expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE');
      expect(String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15))).toBe('fmt ');
      expect(view.getUint16(20, true)).toBe(1); // PCM format
      expect(view.getUint32(24, true)).toBe(44100); // 44.1kHz
      expect(view.getUint16(34, true)).toBe(16); // 16-bit
      expect(String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39))).toBe('data');
    });
  });

  describe('5. DOM & Canvas 2D Context Sanity', () => {
    it('should support DOM element creation and query', () => {
      const container = document.createElement('div');
      container.id = 'studio-test-root';
      const heading = document.createElement('h1');
      heading.textContent = 'VocalMirror Audio Studio';
      container.appendChild(heading);
      document.body.appendChild(container);

      const found = document.getElementById('studio-test-root');
      expect(found).not.toBeNull();
      expect(found?.textContent).toBe('VocalMirror Audio Studio');
    });

    it('should support Canvas 2D context getContext call', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      expect(ctx).toBeDefined();
    });
  });
});
