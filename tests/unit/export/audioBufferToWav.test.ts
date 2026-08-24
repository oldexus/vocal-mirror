/**
 * VocalMirror — Client-side WAV Binary Encoder Unit Test Suite
 * File: tests/unit/export/audioBufferToWav.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  audioBufferToWav,
  exportAudioBufferAsWavBlob,
  downloadWavBlob,
  downloadAudioBufferAsWav,
  renderAndExportWav,
  sanitizeFilename,
} from '../../../src/utils/audioBufferToWav';
import { AcousticEngine } from '../../../src/audio/AcousticEngine';
import { DEFAULT_DSP_PARAMS } from '../../../src/audio/constants';
import { AudioBufferMock, installWebAudioMocks } from '../../mocks/webAudioMock';

function createMockAudioBuffer(
  channels: number,
  length: number,
  sampleRate: number,
  filler?: (channel: number, index: number) => number
): AudioBuffer {
  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      data[i] = filler ? filler(c, i) : 0;
    }
    channelData.push(data);
  }

  return {
    numberOfChannels: channels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: (ch: number) => channelData[ch],
    copyFromChannel: (dst: Float32Array, ch: number, offset = 0) => {
      dst.set(channelData[ch].subarray(offset, offset + dst.length));
    },
    copyToChannel: (src: Float32Array, ch: number, offset = 0) => {
      channelData[ch].set(src, offset);
    },
  } as unknown as AudioBuffer;
}

describe('audioBufferToWav Binary RIFF WAV Encoder', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
    vi.useFakeTimers();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------
  // 1. RIFF WAVE Header Structure & Magic Bytes
  // -------------------------------------------------------------
  describe('1. RIFF WAVE Header Structure & Magic Bytes', () => {
    it('writes valid "RIFF" chunk ID at byte offset 0-3 (ASCII 0x52, 0x49, 0x46, 0x46)', () => {
      const buffer = createMockAudioBuffer(1, 100, 44100);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getUint8(0)).toBe(0x52); // 'R'
      expect(view.getUint8(1)).toBe(0x49); // 'I'
      expect(view.getUint8(2)).toBe(0x46); // 'F'
      expect(view.getUint8(3)).toBe(0x46); // 'F'
    });

    it('calculates correct ChunkSize at offset 4-7 (total byte length - 8 bytes)', () => {
      const numSamples = 200;
      const channels = 1;
      const buffer = createMockAudioBuffer(channels, numSamples, 48000);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      const expectedDataSize = numSamples * channels * 2; // 400 bytes
      const expectedChunkSize = 36 + expectedDataSize; // 436 bytes
      expect(view.getUint32(4, true)).toBe(expectedChunkSize);
      expect(wav.byteLength).toBe(expectedChunkSize + 8);
    });

    it('writes valid "WAVE" format identifier at byte offset 8-11 (ASCII 0x57, 0x41, 0x56, 0x45)', () => {
      const buffer = createMockAudioBuffer(1, 100, 48000);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getUint8(8)).toBe(0x57); // 'W'
      expect(view.getUint8(9)).toBe(0x41); // 'A'
      expect(view.getUint8(10)).toBe(0x56); // 'V'
      expect(view.getUint8(11)).toBe(0x45); // 'E'
    });

    it('writes valid "fmt " subchunk1 ID at byte offset 12-15 (ASCII 0x66, 0x6D, 0x74, 0x20)', () => {
      const buffer = createMockAudioBuffer(1, 100, 48000);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getUint8(12)).toBe(0x66); // 'f'
      expect(view.getUint8(13)).toBe(0x6d); // 'm'
      expect(view.getUint8(14)).toBe(0x74); // 't'
      expect(view.getUint8(15)).toBe(0x20); // ' '
    });

    it('writes Subchunk1Size of exactly 16 bytes for standard PCM format at offset 16-19', () => {
      const buffer = createMockAudioBuffer(1, 100, 48000);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getUint32(16, true)).toBe(16);
    });

    it('writes valid "data" subchunk2 ID at byte offset 36-39 (ASCII 0x64, 0x61, 0x74, 0x61)', () => {
      const buffer = createMockAudioBuffer(1, 100, 48000);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getUint8(36)).toBe(0x64); // 'd'
      expect(view.getUint8(37)).toBe(0x61); // 'a'
      expect(view.getUint8(38)).toBe(0x74); // 't'
      expect(view.getUint8(39)).toBe(0x61); // 'a'
    });

    it('calculates exact Subchunk2Size at offset 40-43 (numSamples * numChannels * bytesPerSample)', () => {
      const buffer = createMockAudioBuffer(2, 100, 48000); // 100 samples * 2 ch * 2 bytes = 400
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getUint32(40, true)).toBe(400);
    });
  });

  // -------------------------------------------------------------
  // 2. 16-bit PCM Integer Scaling & Endianness
  // -------------------------------------------------------------
  describe('2. 16-bit PCM Integer Scaling & Endianness', () => {
    it('sets AudioFormat tag to 1 (WAVE_FORMAT_PCM) and BitsPerSample to 16', () => {
      const buffer = createMockAudioBuffer(1, 10, 48000);
      const wav = audioBufferToWav(buffer, { float32: false });
      const view = new DataView(wav);

      expect(view.getUint16(20, true)).toBe(1); // 1 = PCM
      expect(view.getUint16(34, true)).toBe(16); // 16 bits
    });

    it('maps 0.0 float to 0x0000 (0)', () => {
      const buffer = createMockAudioBuffer(1, 1, 48000, () => 0.0);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getInt16(44, true)).toBe(0);
    });

    it('maps +1.0 full scale float to +32767 (0x7FFF) in little-endian byte order [0xFF, 0x7F]', () => {
      const buffer = createMockAudioBuffer(1, 1, 48000, () => 1.0);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getInt16(44, true)).toBe(32767);
      expect(view.getUint8(44)).toBe(0xff);
      expect(view.getUint8(45)).toBe(0x7f);
    });

    it('maps -1.0 full scale float to -32768 (0x8000) in little-endian byte order [0x00, 0x80]', () => {
      const buffer = createMockAudioBuffer(1, 1, 48000, () => -1.0);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getInt16(44, true)).toBe(-32768);
      expect(view.getUint8(44)).toBe(0x00);
      expect(view.getUint8(45)).toBe(0x80);
    });

    it('quantizes fractional amplitudes proportionally (e.g. +0.5 -> ~16383, -0.5 -> -16384)', () => {
      const samples = [0.5, -0.5];
      const buffer = createMockAudioBuffer(1, 2, 48000, (_ch, i) => samples[i]);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getInt16(44, true)).toBe(Math.floor(0.5 * 32767)); // 16383
      expect(view.getInt16(46, true)).toBe(Math.floor(-0.5 * 32768)); // -16384
    });
  });

  // -------------------------------------------------------------
  // 3. 32-bit IEEE 754 Float Format Option
  // -------------------------------------------------------------
  describe('3. 32-bit IEEE 754 Float Format Option', () => {
    it('sets AudioFormat tag to 3 (WAVE_FORMAT_IEEE_FLOAT) and BitsPerSample to 32 when float32 is true', () => {
      const buffer = createMockAudioBuffer(1, 10, 48000);
      const wav = audioBufferToWav(buffer, { float32: true });
      const view = new DataView(wav);

      expect(view.getUint16(20, true)).toBe(3); // 3 = IEEE Float
      expect(view.getUint16(34, true)).toBe(32); // 32 bits
    });

    it('writes exact 32-bit float samples matching input values within IEEE 754 precision', () => {
      const samples = [0.7071, -0.3333, 0.0, 1.0, -1.0];
      const buffer = createMockAudioBuffer(1, samples.length, 48000, (_ch, i) => samples[i]);
      const wav = audioBufferToWav(buffer, { float32: true });
      const view = new DataView(wav);

      for (let i = 0; i < samples.length; i++) {
        expect(view.getFloat32(44 + i * 4, true)).toBeCloseTo(samples[i], 5);
      }
    });

    it('retains dynamic headroom beyond [-1.0, 1.0] in 32-bit float mode (e.g. +1.5, -2.0)', () => {
      const samples = [1.5, -2.0];
      const buffer = createMockAudioBuffer(1, 2, 48000, (_ch, i) => samples[i]);
      const wav = audioBufferToWav(buffer, { float32: true });
      const view = new DataView(wav);

      expect(view.getFloat32(44, true)).toBeCloseTo(1.5, 5);
      expect(view.getFloat32(48, true)).toBeCloseTo(-2.0, 5);
    });
  });

  // -------------------------------------------------------------
  // 4. Sample Rates, Byte Rates, Block Align & Multi-Channel Interleaving
  // -------------------------------------------------------------
  describe('4. Sample Rates, Byte Rates & Multi-Channel Interleaving', () => {
    it('calculates correct ByteRate and BlockAlign for mono and stereo streams across sample rates', () => {
      const rates = [8000, 44100, 48000, 96000];

      for (const rate of rates) {
        // Mono 16-bit
        const monoBuffer = createMockAudioBuffer(1, 10, rate);
        const monoWav = audioBufferToWav(monoBuffer);
        const monoView = new DataView(monoWav);
        expect(monoView.getUint32(24, true)).toBe(rate);
        expect(monoView.getUint32(28, true)).toBe(rate * 1 * 2);
        expect(monoView.getUint16(32, true)).toBe(2);

        // Stereo 16-bit
        const stereoBuffer = createMockAudioBuffer(2, 10, rate);
        const stereoWav = audioBufferToWav(stereoBuffer);
        const stereoView = new DataView(stereoWav);
        expect(stereoView.getUint32(24, true)).toBe(rate);
        expect(stereoView.getUint32(28, true)).toBe(rate * 2 * 2);
        expect(stereoView.getUint16(32, true)).toBe(4);

        // Stereo 32-bit Float
        const floatBuffer = createMockAudioBuffer(2, 10, rate);
        const floatWav = audioBufferToWav(floatBuffer, { float32: true });
        const floatView = new DataView(floatWav);
        expect(floatView.getUint32(24, true)).toBe(rate);
        expect(floatView.getUint32(28, true)).toBe(rate * 2 * 4);
        expect(floatView.getUint16(32, true)).toBe(8);
      }
    });

    it('interleaves stereo audio channels correctly [L0, R0, L1, R1, L2, R2...]', () => {
      const leftValues = [0.1, 0.2, 0.3];
      const rightValues = [-0.1, -0.2, -0.3];

      const buffer = createMockAudioBuffer(2, 3, 48000, (ch, i) =>
        ch === 0 ? leftValues[i] : rightValues[i]
      );
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      // Frame 0: L0, R0
      expect(view.getInt16(44, true)).toBe((0.1 * 32767) | 0);
      expect(view.getInt16(46, true)).toBe((-0.1 * 32768) | 0);

      // Frame 1: L1, R1
      expect(view.getInt16(48, true)).toBe((0.2 * 32767) | 0);
      expect(view.getInt16(50, true)).toBe((-0.2 * 32768) | 0);

      // Frame 2: L2, R2
      expect(view.getInt16(52, true)).toBe((0.3 * 32767) | 0);
      expect(view.getInt16(54, true)).toBe((-0.3 * 32768) | 0);
    });

    it('supports multi-channel audio (e.g. 4 channels) with sequential sample interleaving', () => {
      const channels = 4;
      const numSamples = 2;
      const buffer = createMockAudioBuffer(channels, numSamples, 48000, (ch, i) => (ch + 1) * 0.1 * (i + 1));
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getUint16(22, true)).toBe(4);
      expect(view.getUint16(32, true)).toBe(8); // BlockAlign = 4 * 2 = 8
      expect(view.getUint32(40, true)).toBe(2 * 8); // 16 data bytes

      // Frame 0
      expect(view.getInt16(44, true)).toBe(Math.floor(0.1 * 32767));
      expect(view.getInt16(46, true)).toBe(Math.floor(0.2 * 32767));
      expect(view.getInt16(48, true)).toBe(Math.floor(0.3 * 32767));
      expect(view.getInt16(50, true)).toBe(Math.floor(0.4 * 32767));
    });
  });

  // -------------------------------------------------------------
  // 5. Anti-Clipping Immunity & Boundary Hardening
  // -------------------------------------------------------------
  describe('5. Anti-Clipping Immunity & Value Hardening', () => {
    it('clamps over-unity positive peaks (+1.5, +10.0) safely to +32767 without integer wrap-around', () => {
      const samples = [1.5, 10.0];
      const buffer = createMockAudioBuffer(1, 2, 48000, (_ch, i) => samples[i]);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getInt16(44, true)).toBe(32767);
      expect(view.getInt16(46, true)).toBe(32767);
    });

    it('clamps under-unity negative peaks (-1.5, -10.0) safely to -32768 without integer wrap-around', () => {
      const samples = [-1.5, -10.0];
      const buffer = createMockAudioBuffer(1, 2, 48000, (_ch, i) => samples[i]);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getInt16(44, true)).toBe(-32768);
      expect(view.getInt16(46, true)).toBe(-32768);
    });

    it('sanitizes NaN and Infinity values to 0 without throwing fatal RangeErrors', () => {
      const samples = [NaN, Infinity, -Infinity];
      const buffer = createMockAudioBuffer(1, 3, 48000, (_ch, i) => samples[i]);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(view.getInt16(44, true)).toBe(0);
      expect(view.getInt16(46, true)).toBe(0);
      expect(view.getInt16(48, true)).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 6. Buffer Edge Cases & Input Validation
  // -------------------------------------------------------------
  describe('6. Buffer Edge Cases & Input Validation', () => {
    it('generates valid 44-byte WAV header for zero-length buffer without crashing', () => {
      const buffer = createMockAudioBuffer(1, 0, 48000);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      expect(wav.byteLength).toBe(44);
      expect(view.getUint32(4, true)).toBe(36);
      expect(view.getUint32(40, true)).toBe(0);
    });

    it('encodes zero-filled buffers into all zero PCM samples', () => {
      const buffer = createMockAudioBuffer(1, 10, 48000, () => 0);
      const wav = audioBufferToWav(buffer);
      const view = new DataView(wav);

      for (let i = 0; i < 10; i++) {
        expect(view.getInt16(44 + i * 2, true)).toBe(0);
      }
    });

    it('handles long duration buffers (e.g. 10 seconds at 48kHz) calculating accurate byte sizes', () => {
      const length = 48000 * 10; // 480,000 samples
      const buffer = new AudioBufferMock({
        numberOfChannels: 2,
        length,
        sampleRate: 48000,
      }) as unknown as AudioBuffer;

      const wav = audioBufferToWav(buffer);
      const expectedDataSize = length * 2 * 2; // 1,920,000 bytes
      expect(wav.byteLength).toBe(44 + expectedDataSize);
    });

    it('throws descriptive TypeError when passed null, undefined, or invalid buffer object', () => {
      expect(() => audioBufferToWav(null as any)).toThrow(TypeError);
      expect(() => audioBufferToWav(undefined as any)).toThrow(TypeError);
      expect(() => audioBufferToWav({} as any)).toThrow(TypeError);
    });
  });

  // -------------------------------------------------------------
  // 7. Blob Generation & Download Lifecycle
  // -------------------------------------------------------------
  describe('7. Blob Generation & Download Lifecycle', () => {
    it('creates a Blob with audio/wav MIME type', () => {
      const buffer = createMockAudioBuffer(1, 100, 48000);
      const blob = exportAudioBufferAsWavBlob(buffer);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/wav');
    });

    it('triggers document anchor click and revokes object URL after timeout', () => {
      const buffer = createMockAudioBuffer(1, 100, 48000);
      const blob = exportAudioBufferAsWavBlob(buffer);

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

      downloadWavBlob(blob, 'test_export.wav');

      expect(appendChildSpy).toHaveBeenCalled();
      expect(revokeSpy).not.toHaveBeenCalled();

      // Fast-forward timeout
      vi.advanceTimersByTime(1000);

      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeSpy).toHaveBeenCalled();
    });

    it('downloadAudioBufferAsWav correctly calls download pipeline with AudioBuffer', () => {
      const buffer = createMockAudioBuffer(1, 100, 48000);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      downloadAudioBufferAsWav(buffer, 'direct_test.wav');
      expect(appendChildSpy).toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
    });

    it('downloadWavBlob accepts AudioBuffer directly', () => {
      const buffer = createMockAudioBuffer(1, 100, 48000);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      downloadWavBlob(buffer, 'poly_test.wav');
      expect(appendChildSpy).toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
    });

    it('downloadWavBlob throws TypeError when passed invalid target', () => {
      expect(() => downloadWavBlob(123 as any)).toThrow(TypeError);
    });
  });

  // -------------------------------------------------------------
  // 8. Offline DSP Batch Processing Pipeline
  // -------------------------------------------------------------
  describe('8. Offline DSP Batch Processing Pipeline', () => {
    it('processes buffer through AcousticEngine before exporting', async () => {
      const buffer = createMockAudioBuffer(1, 480, 48000, (_ch, i) => Math.sin(i * 0.1));
      const processSpy = vi.spyOn(AcousticEngine, 'processBuffer');

      const { blob, renderedBuffer } = await renderAndExportWav(
        buffer,
        'INTERNAL_SIM',
        DEFAULT_DSP_PARAMS
      );

      expect(processSpy).toHaveBeenCalledWith(buffer, 'INTERNAL_SIM', DEFAULT_DSP_PARAMS);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/wav');
      expect(renderedBuffer).toBeDefined();
    });

    it('bypasses DSP rendering when exporting in RAW mode', async () => {
      const buffer = createMockAudioBuffer(1, 480, 48000);
      const processSpy = vi.spyOn(AcousticEngine, 'processBuffer');

      const { blob, renderedBuffer } = await renderAndExportWav(
        buffer,
        'RAW',
        DEFAULT_DSP_PARAMS
      );

      expect(processSpy).not.toHaveBeenCalled();
      expect(renderedBuffer).toBe(buffer);
      expect(blob.type).toBe('audio/wav');
    });

    it('triggers file download if filename is supplied in renderAndExportWav', async () => {
      const buffer = createMockAudioBuffer(1, 480, 48000);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      await renderAndExportWav(
        buffer,
        'RAW',
        DEFAULT_DSP_PARAMS,
        'rendered_export.wav'
      );

      expect(appendChildSpy).toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
    });
  });

  // -------------------------------------------------------------
  // 9. Filename Sanitization & Path Traversal Guardrails
  // -------------------------------------------------------------
  describe('9. Filename Sanitization & Path Traversal Guardrails', () => {
    it('strips non-printable ASCII control characters (\\x00-\\x1f, \\x7f)', () => {
      expect(sanitizeFilename('\x00\x08my_\x1frecording\x7f.wav')).toBe('my_recording.wav');
    });

    it('sanitizes illegal path and URL characters [/\\\\?%*:|"<>~#&{}]', () => {
      const hostile = 'test/path\\file?name%with*star:colon|pipe"quote<lt>gt~tilde#hash&amp{brace}.wav';
      const sanitized = sanitizeFilename(hostile);
      expect(sanitized).not.toMatch(/[/\\?%*:|"<>~#&{}]/);
      expect(sanitized).toBe('test_path_file_name_with_star_colon_pipe_quote_lt_gt_tilde_hash_amp_brace_.wav');
    });

    it('collapses consecutive dots to prevent path traversal', () => {
      expect(sanitizeFilename('../../../secret/export..wav')).toBe('._._._secret_export.wav');
      expect(sanitizeFilename('my...vocal....recording.wav')).toBe('my.vocal.recording.wav');
    });

    it('protects against Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)', () => {
      expect(sanitizeFilename('CON')).toBe('_CON');
      expect(sanitizeFilename('con.wav')).toBe('_con.wav');
      expect(sanitizeFilename('PRN.wav')).toBe('_PRN.wav');
      expect(sanitizeFilename('aux.wav')).toBe('_aux.wav');
      expect(sanitizeFilename('NUL')).toBe('_NUL');
      expect(sanitizeFilename('COM1.wav')).toBe('_COM1.wav');
      expect(sanitizeFilename('com9.wav')).toBe('_com9.wav');
      expect(sanitizeFilename('LPT3.wav')).toBe('_LPT3.wav');
    });

    it('truncates filename to a safe maximum length of 128 characters', () => {
      const longName = 'a'.repeat(200) + '.wav';
      const result = sanitizeFilename(longName);
      expect(result.length).toBe(128);
    });

    it('falls back to "recording.wav" on empty, whitespace, or invalid inputs', () => {
      expect(sanitizeFilename('')).toBe('recording.wav');
      expect(sanitizeFilename('   ')).toBe('recording.wav');
      expect(sanitizeFilename('.wav')).toBe('recording.wav');
      expect(sanitizeFilename('  .wav  ')).toBe('recording.wav');
      expect(sanitizeFilename(null as any)).toBe('recording.wav');
      expect(sanitizeFilename(undefined as any)).toBe('recording.wav');
    });
  });

  // -------------------------------------------------------------
  // 10. AudioBuffer Boundary & Format Validation Guardrails
  // -------------------------------------------------------------
  describe('10. AudioBuffer Boundary & Format Validation Guardrails', () => {
    it('rejects buffers with non-integer, zero, negative, or excessive (>32) channel counts', () => {
      expect(() => audioBufferToWav({
        numberOfChannels: 0,
        sampleRate: 48000,
        length: 100,
        getChannelData: () => new Float32Array(100),
      } as any)).toThrow(TypeError);

      expect(() => audioBufferToWav({
        numberOfChannels: -1,
        sampleRate: 48000,
        length: 100,
        getChannelData: () => new Float32Array(100),
      } as any)).toThrow(TypeError);

      expect(() => audioBufferToWav({
        numberOfChannels: 33,
        sampleRate: 48000,
        length: 100,
        getChannelData: () => new Float32Array(100),
      } as any)).toThrow(TypeError);

      expect(() => audioBufferToWav({
        numberOfChannels: 1.5,
        sampleRate: 48000,
        length: 100,
        getChannelData: () => new Float32Array(100),
      } as any)).toThrow(TypeError);

      expect(() => audioBufferToWav({
        numberOfChannels: NaN,
        sampleRate: 48000,
        length: 100,
        getChannelData: () => new Float32Array(100),
      } as any)).toThrow(TypeError);
    });

    it('rejects buffers with out-of-range (<8000 or >384000) or non-finite sample rates', () => {
      expect(() => audioBufferToWav({
        numberOfChannels: 1,
        sampleRate: 7999,
        length: 100,
        getChannelData: () => new Float32Array(100),
      } as any)).toThrow(TypeError);

      expect(() => audioBufferToWav({
        numberOfChannels: 1,
        sampleRate: 384001,
        length: 100,
        getChannelData: () => new Float32Array(100),
      } as any)).toThrow(TypeError);

      expect(() => audioBufferToWav({
        numberOfChannels: 1,
        sampleRate: NaN,
        length: 100,
        getChannelData: () => new Float32Array(100),
      } as any)).toThrow(TypeError);

      expect(() => audioBufferToWav({
        numberOfChannels: 1,
        sampleRate: Infinity,
        length: 100,
        getChannelData: () => new Float32Array(100),
      } as any)).toThrow(TypeError);
    });

    it('rejects buffers with negative or non-integer sample lengths', () => {
      expect(() => audioBufferToWav({
        numberOfChannels: 1,
        sampleRate: 48000,
        length: -5,
        getChannelData: () => new Float32Array(100),
      } as any)).toThrow(TypeError);

      expect(() => audioBufferToWav({
        numberOfChannels: 1,
        sampleRate: 48000,
        length: 10.5,
        getChannelData: () => new Float32Array(100),
      } as any)).toThrow(TypeError);
    });

    it('accepts multi-channel audio within allowed range (e.g. 8 and 32 channels)', () => {
      const buffer8 = createMockAudioBuffer(8, 50, 48000);
      const wav8 = audioBufferToWav(buffer8);
      expect(wav8.byteLength).toBe(44 + 50 * 8 * 2);

      const buffer32 = createMockAudioBuffer(32, 10, 48000);
      const wav32 = audioBufferToWav(buffer32);
      expect(wav32.byteLength).toBe(44 + 10 * 32 * 2);
    });
  });
});
