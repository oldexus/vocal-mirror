/**
 * VocalMirror — Milestone 3 Programmatic Adversarial Security Test Suite
 * File: tests/security/binary_dsp_fuzz.test.ts
 * 
 * Comprehensive Binary & DSP Hardening Verification:
 * 1. Binary WAV Exporter Fuzzing (audioBufferToWav):
 *    - 4GB+ chunk size boundary attacks (RangeError).
 *    - Malformed/corrupt headers and byte sequences.
 *    - Multi-channel bomb attacks (>32, 65535, 65536, negative channels, float, NaN -> TypeError).
 *    - Extreme sample rates (<8000, >384000, 0, NaN, Infinity, negative -> TypeError).
 *    - Float / PCM NaN, Infinity, -Infinity, denormals, subnormals, out-of-range (+10.0, -10.0) clamping.
 *    - Pathological filenames in sanitizeFilename (control chars \x00-\x1f\x7f, Windows reserved names, ReDoS resilience).
 * 2. Web Audio DSP Math Stress & Zero-Panic Verification:
 *    - Biquad filter coefficient calculations under NaN, Infinity, -Infinity, Nyquist boundary, zero Q, infinite Q.
 *    - Cascade & Branch frequency response under extreme gain modulation (-100dB, +100dB).
 *    - Logarithmic coordinate & spectral gap mapping math under hostile arrays and degenerate inputs.
 *    - AcousticEngine offline batch rendering processBuffer against extreme audio signals.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  audioBufferToWav,
  exportAudioBufferAsWavBlob,
  sanitizeFilename,
} from '../../src/utils/audioBufferToWav';
import {
  computeBiquadCoefficients,
  calculateBiquadResponse,
  calculateCascadeResponse,
  calculateTheoreticalBranchResponse,
  dbToLinear,
  linearToDb,
  calculateDynamicPreAttenuation,
} from '../../src/audio/biquadMath';
import {
  frequencyToNormX,
  frequencyToX,
  normXToFrequency,
  xToFrequency,
  dbToY,
  yToDb,
  getBinForFrequency,
  interpolateMagnitude,
  formatFrequency,
  calculateBandEnergy,
  calculateDifferentialBandGap,
  calculateSpectralGapSummary,
  calculateSpectralGapMetrics,
  interpolateSpectrumToCanvas,
} from '../../src/utils/frequencyMapping';
import { AcousticEngine } from '../../src/audio/AcousticEngine';
import { DEFAULT_DSP_PARAMS } from '../../src/audio/constants';
import { BiquadFilterType, DSPParameters } from '../../src/types/audio';
import { installWebAudioMocks } from '../mocks/webAudioMock';

// Helper to construct mock AudioBuffer for fuzzing
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

describe('M3 Security Suite — Binary WAV Fuzzing & DSP Arithmetic Crash Resistance', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
  });

  // =========================================================================
  // Section 1: Binary WAV Parser/Encoder Fuzzing (audioBufferToWav)
  // =========================================================================
  describe('1. Binary WAV Parser/Encoder Fuzzing (audioBufferToWav)', () => {
    // 1.1: 4GB+ chunk size boundary attacks
    describe('1.1 4GB+ Chunk Size Boundary Attacks', () => {
      it('throws RangeError when 16-bit PCM payload exceeds 32-bit RIFF limit (>4GB)', () => {
        const maxSafeSamples = Math.floor((0xFFFFFFFF - 36) / 4);
        const overflowingSamples = maxSafeSamples + 1;

        const mockOversizedBuffer = {
          numberOfChannels: 2,
          sampleRate: 48000,
          length: overflowingSamples,
          duration: overflowingSamples / 48000,
          getChannelData: () => new Float32Array(0),
        } as unknown as AudioBuffer;

        expect(() => {
          audioBufferToWav(mockOversizedBuffer);
        }).toThrow(RangeError);
      });

      it('throws RangeError when 32-bit Float payload exceeds 32-bit RIFF limit (>4GB)', () => {
        const overflowingSamples = Math.floor((0xFFFFFFFF - 36) / 32) + 1;

        const mockOversizedBuffer = {
          numberOfChannels: 8,
          sampleRate: 48000,
          length: overflowingSamples,
          duration: overflowingSamples / 48000,
          getChannelData: () => new Float32Array(0),
        } as unknown as AudioBuffer;

        expect(() => {
          audioBufferToWav(mockOversizedBuffer, { float32: true });
        }).toThrow(RangeError);
      });
    });

    // 1.2: Malformed/corrupt headers and byte sequences
    describe('1.2 Canonical RIFF Header Structure & Byte Sequences', () => {
      it('generates bit-accurate canonical 44-byte RIFF/WAVE header for standard 16-bit PCM', () => {
        const buffer = createMockAudioBuffer(2, 100, 48000);
        const arrayBuf = audioBufferToWav(buffer);
        const view = new DataView(arrayBuf);

        expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
        expect(view.getUint32(4, true)).toBe(436);
        expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE');
        expect(String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15))).toBe('fmt ');
        expect(view.getUint32(16, true)).toBe(16);
        expect(view.getUint16(20, true)).toBe(1);
        expect(view.getUint16(22, true)).toBe(2);
        expect(view.getUint32(24, true)).toBe(48000);
        expect(view.getUint32(28, true)).toBe(192000);
        expect(view.getUint16(32, true)).toBe(4);
        expect(view.getUint16(34, true)).toBe(16);
        expect(String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39))).toBe('data');
        expect(view.getUint32(40, true)).toBe(400);
        expect(arrayBuf.byteLength).toBe(444);
      });

      it('generates bit-accurate canonical 44-byte RIFF/WAVE header for 32-bit IEEE Float', () => {
        const buffer = createMockAudioBuffer(1, 50, 44100);
        const arrayBuf = audioBufferToWav(buffer, { float32: true });
        const view = new DataView(arrayBuf);

        expect(view.getUint16(20, true)).toBe(3);
        expect(view.getUint16(34, true)).toBe(32);
        expect(view.getUint16(32, true)).toBe(4);
        expect(view.getUint32(28, true)).toBe(176400);
        expect(view.getUint32(40, true)).toBe(200);
        expect(arrayBuf.byteLength).toBe(244);
      });

      it('returns valid 44-byte empty header when audio buffer has 0 length', () => {
        const emptyBuffer = createMockAudioBuffer(1, 0, 48000);
        const arrayBuf = audioBufferToWav(emptyBuffer);
        expect(arrayBuf.byteLength).toBe(44);
        const view = new DataView(arrayBuf);
        expect(view.getUint32(4, true)).toBe(36);
        expect(view.getUint32(40, true)).toBe(0);
      });

      it('throws TypeError when given null, undefined, plain objects, or corrupted structures', () => {
        const corruptedInputs: any[] = [
          null,
          undefined,
          {},
          [],
          { numberOfChannels: 2 },
          { numberOfChannels: 2, sampleRate: 48000 },
          { numberOfChannels: 2, sampleRate: 48000, length: 100 },
          'audio-buffer-string',
          12345,
          new ArrayBuffer(100),
        ];

        for (const input of corruptedInputs) {
          expect(() => {
            audioBufferToWav(input);
          }).toThrow(TypeError);
        }
      });
    });

    // 1.3: Multi-channel bomb attacks
    describe('1.3 Multi-Channel Bomb Attacks', () => {
      it('rejects invalid or explosive channel counts with TypeError', () => {
        const hostileChannels = [
          0,
          -1,
          -2,
          -32,
          33,
          34,
          64,
          128,
          256,
          65535,
          65536,
          1.5,
          2.7,
          NaN,
          Infinity,
          -Infinity,
        ];

        for (const ch of hostileChannels) {
          const badBuffer = {
            numberOfChannels: ch,
            sampleRate: 48000,
            length: 10,
            getChannelData: () => new Float32Array(10),
          } as unknown as AudioBuffer;

          expect(() => {
            audioBufferToWav(badBuffer);
          }).toThrow(TypeError);
        }
      });

      it('correctly encodes supported channel topologies from 1 up to 32 channels with multi-channel interleaving', () => {
        const supportedChannels = [1, 2, 3, 4, 6, 8, 16, 32];

        for (const numCh of supportedChannels) {
          const buffer = createMockAudioBuffer(numCh, 10, 48000, (c, i) => (c + 1) * 0.01 + i * 0.001);
          const arrayBuf = audioBufferToWav(buffer);
          expect(arrayBuf.byteLength).toBe(44 + 10 * numCh * 2);

          const view = new DataView(arrayBuf);
          expect(view.getUint16(22, true)).toBe(numCh);
          expect(view.getUint16(32, true)).toBe(numCh * 2);
        }
      });
    });

    // 1.4: Extreme sample rates
    describe('1.4 Extreme Sample Rates', () => {
      it('rejects invalid, negative, or extreme sample rates with TypeError', () => {
        const hostileSampleRates = [
          0,
          1,
          100,
          1000,
          7999,
          -8000,
          -48000,
          384001,
          500000,
          1000000,
          NaN,
          Infinity,
          -Infinity,
        ];

        for (const rate of hostileSampleRates) {
          const badBuffer = {
            numberOfChannels: 1,
            sampleRate: rate,
            length: 10,
            getChannelData: () => new Float32Array(10),
          } as unknown as AudioBuffer;

          expect(() => {
            audioBufferToWav(badBuffer);
          }).toThrow(TypeError);
        }
      });

      it('supports full professional audio sample rate spectrum (8kHz - 384kHz)', () => {
        const validRates = [8000, 11025, 16000, 22050, 32000, 44100, 48000, 88200, 96000, 176400, 192000, 352800, 384000];

        for (const rate of validRates) {
          const buffer = createMockAudioBuffer(1, 10, rate);
          const arrayBuf = audioBufferToWav(buffer);
          const view = new DataView(arrayBuf);
          expect(view.getUint32(24, true)).toBe(rate);
        }
      });
    });

    // 1.5: Float / PCM NaN, Infinity, -Infinity, denormals, and out-of-range clamping
    describe('1.5 Sample Clamping & NaN/Infinity Sanitization', () => {
      it('sanitizes NaN, Infinity, -Infinity, and out-of-range float values in 16-bit PCM mode', () => {
        const samples = [
          NaN,           // Should be sanitized to 0
          Infinity,      // Should be sanitized to 0
          -Infinity,     // Should be sanitized to 0
          10.0,          // Clamped to +1.0 -> 32767 (0x7FFF)
          -10.0,         // Clamped to -1.0 -> -32768 (-0x8000)
          1.0,           // +1.0 -> 32767
          -1.0,          // -1.0 -> -32768
          0.0,           // 0.0 -> 0
          0.5,           // 0.5 -> 16383
          -0.5,          // -0.5 -> -16384
          1e-40,         // Denormal -> safe small integer
          -1e-40,        // Denormal -> safe small integer
        ];

        const buffer = createMockAudioBuffer(1, samples.length, 48000, (_, i) => samples[i]);
        const arrayBuf = audioBufferToWav(buffer);
        const view = new DataView(arrayBuf);

        expect(view.getInt16(44 + 0 * 2, true)).toBe(0);      // NaN -> 0
        expect(view.getInt16(44 + 1 * 2, true)).toBe(0);      // +Inf -> 0
        expect(view.getInt16(44 + 2 * 2, true)).toBe(0);      // -Inf -> 0
        expect(view.getInt16(44 + 3 * 2, true)).toBe(32767);  // +10.0 -> 32767
        expect(view.getInt16(44 + 4 * 2, true)).toBe(-32768); // -10.0 -> -32768
        expect(view.getInt16(44 + 5 * 2, true)).toBe(32767);  // 1.0 -> 32767
        expect(view.getInt16(44 + 6 * 2, true)).toBe(-32768); // -1.0 -> -32768
        expect(view.getInt16(44 + 7 * 2, true)).toBe(0);      // 0.0 -> 0
        expect(view.getInt16(44 + 8 * 2, true)).toBe(16383);  // 0.5 -> 16383
        expect(view.getInt16(44 + 9 * 2, true)).toBe(-16384); // -0.5 -> -16384
      });

      it('sanitizes NaN and Infinity in 32-bit Float mode without crashing', () => {
        const samples = [NaN, Infinity, -Infinity, 0.75, -0.25];
        const buffer = createMockAudioBuffer(1, samples.length, 48000, (_, i) => samples[i]);
        const arrayBuf = audioBufferToWav(buffer, { float32: true });
        const view = new DataView(arrayBuf);

        expect(view.getFloat32(44 + 0 * 4, true)).toBe(0.0);
        expect(view.getFloat32(44 + 1 * 4, true)).toBe(0.0);
        expect(view.getFloat32(44 + 2 * 4, true)).toBe(0.0);
        expect(view.getFloat32(44 + 3 * 4, true)).toBeCloseTo(0.75, 5);
        expect(view.getFloat32(44 + 4 * 4, true)).toBeCloseTo(-0.25, 5);
      });

      it('exports valid audio/wav Blob with exportAudioBufferAsWavBlob', () => {
        const buffer = createMockAudioBuffer(2, 50, 48000);
        const blob = exportAudioBufferAsWavBlob(buffer);
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('audio/wav');
        expect(blob.size).toBe(44 + 50 * 2 * 2);
      });
    });

    // 1.6: Pathological filenames in sanitizeFilename
    describe('1.6 Pathological Filenames & ReDoS Resilience', () => {
      it('strips all ASCII control characters (\\x00-\\x1f, \\x7f)', () => {
        const controlCharsString = 'my\x00audio\x01file\x08test\x1b\x7f.wav';
        const sanitized = sanitizeFilename(controlCharsString);
        expect(sanitized).toBe('myaudiofiletest.wav');
      });

      it('detects and neutralizes Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)', () => {
        const reservedNames = [
          'CON',
          'con',
          'PRN',
          'prn',
          'AUX',
          'aux',
          'NUL',
          'nul',
          'COM1',
          'com9',
          'LPT1',
          'lpt9',
          'CON.wav',
          'con.wav',
          'AUX.WAV',
          'nul.mp3',
          'COM5.wav',
        ];

        for (const name of reservedNames) {
          const sanitized = sanitizeFilename(name);
          expect(sanitized.startsWith('_')).toBe(true);
          expect(sanitized.toLowerCase()).not.toBe('con');
          expect(sanitized.toLowerCase()).not.toBe('con.wav');
        }
      });

      it('neutralizes multi-level path traversal and dangerous filesystem characters', () => {
        const dangerousPaths = [
          '../../../../etc/passwd',
          '..\\..\\..\\windows\\system32\\cmd.exe',
          '....//....//....//shadow.wav',
          'audio:stream|name*test?.wav',
          '<script>alert(1)</script>.wav',
          'file"with"quotes.wav',
          'audio#track&session~data.wav',
          '{preset_name}.wav',
        ];

        for (const p of dangerousPaths) {
          const sanitized = sanitizeFilename(p);
          expect(sanitized).not.toContain('..');
          expect(sanitized).not.toContain('/');
          expect(sanitized).not.toContain('\\');
          expect(sanitized).not.toContain(':');
          expect(sanitized).not.toContain('*');
          expect(sanitized).not.toContain('?');
          expect(sanitized).not.toContain('"');
          expect(sanitized).not.toContain('<');
          expect(sanitized).not.toContain('>');
          expect(sanitized).not.toContain('|');
          expect(sanitized).not.toContain('~');
          expect(sanitized).not.toContain('#');
          expect(sanitized).not.toContain('&');
          expect(sanitized).not.toContain('{');
          expect(sanitized).not.toContain('}');
        }
      });

      it('survives 100,000 character ReDoS fuzz strings in under 50ms and enforces 128 character max length', () => {
        const reDosPayload = 'a'.repeat(50000) + '..'.repeat(25000) + '///'.repeat(10000);
        const startTime = performance.now();
        const sanitized = sanitizeFilename(reDosPayload);
        const elapsed = performance.now() - startTime;

        expect(elapsed).toBeLessThan(50);
        expect(sanitized.length).toBeLessThanOrEqual(128);
      });

      it('falls back to "recording.wav" for empty, whitespace, or invalid inputs', () => {
        const fallbackInputs: any[] = [
          '',
          '   ',
          '\t\n\r',
          '.wav',
          '.WAV',
          null,
          undefined,
          12345,
          {},
        ];

        for (const input of fallbackInputs) {
          const sanitized = sanitizeFilename(input);
          expect(sanitized).toBe('recording.wav');
        }
      });
    });
  });

  // =========================================================================
  // Section 2: Web Audio DSP Math Stress & Zero-Panic Verification
  // =========================================================================
  describe('2. Web Audio DSP Math Stress & Zero-Panic Verification', () => {
    // 2.1: Biquad Coefficient Computation Robustness
    describe('2.1 Biquad Filter Coefficients & RBJ Cookbook Robustness', () => {
      const FILTER_TYPES: BiquadFilterType[] = [
        'lowpass',
        'highpass',
        'peaking',
        'lowshelf',
        'highshelf',
        'notch',
        'bandpass',
        'allpass',
      ];

      const EXTREME_FREQS = [
        NaN,
        Infinity,
        -Infinity,
        -1000,
        0,
        0.0001,
        1,
        20,
        1000,
        23999,
        24000,
        50000,
        1000000,
      ];

      const EXTREME_SAMPLERATES = [
        NaN,
        Infinity,
        -Infinity,
        -48000,
        0,
        100,
        8000,
        48000,
        192000,
      ];

      it('guarantees 100% finite biquad coefficients under all extreme mathematical inputs', () => {
        for (const type of FILTER_TYPES) {
          for (const f0 of EXTREME_FREQS) {
            for (const fs of EXTREME_SAMPLERATES) {
              for (const Q of [0, 0.707, NaN, Infinity]) {
                for (const gainDb of [0, 20, -20, NaN]) {
                  const coeffs = computeBiquadCoefficients(type, f0, fs, Q, gainDb);

                  expect(Number.isFinite(coeffs.b0), `b0 infinite for type=${type}, f0=${f0}, fs=${fs}`).toBe(true);
                  expect(Number.isFinite(coeffs.b1), `b1 infinite for type=${type}, f0=${f0}, fs=${fs}`).toBe(true);
                  expect(Number.isFinite(coeffs.b2), `b2 infinite for type=${type}, f0=${f0}, fs=${fs}`).toBe(true);
                  expect(Number.isFinite(coeffs.a0), `a0 infinite for type=${type}, f0=${f0}, fs=${fs}`).toBe(true);
                  expect(Number.isFinite(coeffs.a1), `a1 infinite for type=${type}, f0=${f0}, fs=${fs}`).toBe(true);
                  expect(Number.isFinite(coeffs.a2), `a2 infinite for type=${type}, f0=${f0}, fs=${fs}`).toBe(true);
                  expect(coeffs.a0).not.toBe(0);
                }
              }
            }
          }
        }
      });

      it('calculates biquad response without NaN propagation or division-by-zero panics', () => {
        const testFreqs = new Float32Array([20, 100, 500, 1000, 5000, 10000, 20000, 24000]);
        const coeffs = computeBiquadCoefficients('peaking', 1000, 48000, 2.0, 12.0);

        const { magResponse, phaseResponse } = calculateBiquadResponse(coeffs, testFreqs, 48000);

        expect(magResponse.length).toBe(testFreqs.length);
        expect(phaseResponse.length).toBe(testFreqs.length);

        for (let i = 0; i < testFreqs.length; i++) {
          expect(Number.isFinite(magResponse[i])).toBe(true);
          expect(Number.isFinite(phaseResponse[i])).toBe(true);
          expect(magResponse[i]).toBeGreaterThanOrEqual(0);
        }
      });

      it('calculates cascade and branch response under extreme +/-100dB gain settings', () => {
        const freqs = new Float32Array([50, 150, 500, 1000, 3000, 8000, 15000]);

        const hostileParams: DSPParameters = {
          ...DEFAULT_DSP_PARAMS,
          lowShelfGain: 100,
          mandibleResGain: -100,
          sinusResGain: 100,
          antiResGain: -100,
          highShelfGain: 100,
        };

        const fwdResp = calculateTheoreticalBranchResponse(hostileParams, 'FORWARD', freqs, 48000);
        const invResp = calculateTheoreticalBranchResponse(hostileParams, 'INVERSE', freqs, 48000);

        const cascadeResp = calculateCascadeResponse(
          [
            { type: 'lowshelf', f0: 100, Q: 0.707, gainDb: 24 },
            { type: 'peaking', f0: 1000, Q: 2, gainDb: -24 },
          ],
          freqs,
          48000
        );

        for (let i = 0; i < freqs.length; i++) {
          expect(Number.isFinite(fwdResp.magnitudes[i])).toBe(true);
          expect(Number.isFinite(fwdResp.dBMagnitudes[i])).toBe(true);
          expect(Number.isFinite(invResp.magnitudes[i])).toBe(true);
          expect(Number.isFinite(invResp.dBMagnitudes[i])).toBe(true);
          expect(Number.isFinite(cascadeResp.magnitudes[i])).toBe(true);
        }
      });

      it('verifies dbToLinear and linearToDb resilience against non-finite inputs', () => {
        expect(dbToLinear(NaN)).toBe(1.0);
        expect(dbToLinear(Infinity)).toBe(1.0);
        expect(dbToLinear(-Infinity)).toBe(1.0);
        expect(dbToLinear(0)).toBe(1.0);
        expect(dbToLinear(20)).toBeCloseTo(10.0, 4);
        expect(dbToLinear(-20)).toBeCloseTo(0.1, 4);

        expect(linearToDb(NaN)).toBe(-120);
        expect(linearToDb(Infinity)).toBe(-120);
        expect(linearToDb(-Infinity)).toBe(-120);
        expect(linearToDb(0)).toBe(-120);
        expect(linearToDb(-5)).toBe(-120);
        expect(linearToDb(1.0)).toBeCloseTo(0, 4);
        expect(linearToDb(10.0)).toBeCloseTo(20, 4);
      });

      it('calculates dynamic pre-attenuation within safe headroom bounds [-18dB, 0dB]', () => {
        const extremeParams: DSPParameters = {
          ...DEFAULT_DSP_PARAMS,
          lowShelfGain: 50,
          mandibleResGain: 50,
          sinusResGain: 50,
        };

        const { preAttenDb, preGainLinear } = calculateDynamicPreAttenuation(extremeParams);
        expect(preAttenDb).toBeLessThanOrEqual(0);
        expect(preAttenDb).toBeGreaterThanOrEqual(-18);
        expect(Number.isFinite(preGainLinear)).toBe(true);
        expect(preGainLinear).toBeGreaterThan(0);
      });
    });

    // 2.2: Frequency Mapping & Spectral Gap Math Resilience
    describe('2.2 Frequency Mapping & Spectral Gap Math Resilience', () => {
      it('clamps coordinate conversion functions under invalid and extreme numerical inputs', () => {
        const hostileVals = [NaN, Infinity, -Infinity, -500, 0, 1e9, undefined as any, null as any];

        for (const v of hostileVals) {
          const normX = frequencyToNormX(v);
          expect(normX).toBeGreaterThanOrEqual(0.0);
          expect(normX).toBeLessThanOrEqual(1.0);
          expect(Number.isFinite(normX)).toBe(true);

          const pxX = frequencyToX(v, 800);
          expect(pxX).toBeGreaterThanOrEqual(0);
          expect(pxX).toBeLessThanOrEqual(800);
          expect(Number.isFinite(pxX)).toBe(true);

          const freqFromNorm = normXToFrequency(v);
          expect(Number.isFinite(freqFromNorm)).toBe(true);
          expect(freqFromNorm).toBeGreaterThan(0);

          const freqFromX = xToFrequency(v, 800);
          expect(Number.isFinite(freqFromX)).toBe(true);

          const pxY = dbToY(v, 400);
          expect(pxY).toBeGreaterThanOrEqual(0);
          expect(pxY).toBeLessThanOrEqual(400);
          expect(Number.isFinite(pxY)).toBe(true);

          const dbFromY = yToDb(v, 400);
          expect(Number.isFinite(dbFromY)).toBe(true);

          expect(typeof formatFrequency(v)).toBe('string');
        }
      });

      it('interpolates magnitude and FFT bins safely from corrupted or empty data arrays', () => {
        const emptyData = new Float32Array(0);
        const nanData = new Float32Array([NaN, NaN, NaN, NaN]);
        const infData = new Float32Array([Infinity, -Infinity, 10, -50]);

        expect(Number.isFinite(interpolateMagnitude(null, 1000))).toBe(true);
        expect(Number.isFinite(interpolateMagnitude(emptyData, 1000))).toBe(true);
        expect(Number.isFinite(interpolateMagnitude(nanData, 1000))).toBe(true);
        expect(Number.isFinite(interpolateMagnitude(infData, 1000))).toBe(true);

        expect(getBinForFrequency(-500, 48000, 2048)).toBe(0);
        expect(getBinForFrequency(50000, 48000, 2048)).toBe(1024);
      });

      it('calculates spectral gap summary and metrics with 0 NaN propagation', () => {
        const mockRaw = new Float32Array(1024).fill(-60);
        const mockBone = new Float32Array(1024).fill(-50);

        mockRaw[10] = NaN;
        mockRaw[20] = Infinity;
        mockRaw[30] = -Infinity;
        mockBone[10] = NaN;
        mockBone[20] = -Infinity;

        const bandStats = calculateBandEnergy(mockRaw, [50, 300], 48000, 2048);
        expect(Number.isFinite(bandStats.meanDb)).toBe(true);

        const bandDiff = calculateDifferentialBandGap(mockRaw, mockBone, [50, 300], 'Bass', 48000, 2048);
        expect(Number.isFinite(bandDiff.deltaDb)).toBe(true);

        const summary = calculateSpectralGapSummary(mockRaw, mockBone, 48000, 2048);
        expect(Number.isFinite(summary.overallMeanGapDb)).toBe(true);
        expect(Number.isFinite(summary.overallRmsGapDb)).toBe(true);
        expect(Number.isFinite(summary.bassGap.deltaDb)).toBe(true);
        expect(Number.isFinite(summary.midGap.deltaDb)).toBe(true);
        expect(Number.isFinite(summary.trebleGap.deltaDb)).toBe(true);

        const metrics = calculateSpectralGapMetrics(mockRaw, mockBone, 48000, 2048);
        expect(Number.isFinite(metrics.lowResonanceBoostDb)).toBe(true);
        expect(Number.isFinite(metrics.hfTissueRolloffDb)).toBe(true);
        expect(Number.isFinite(metrics.rmsDifferential)).toBe(true);
        expect(metrics.voiceConfrontationIndex).toBeGreaterThanOrEqual(0);
        expect(metrics.voiceConfrontationIndex).toBeLessThanOrEqual(100);
      });

      it('executes zero-allocation batch canvas interpolation without overflow or NaN elements', () => {
        const inputData = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) {
          inputData[i] = -100 + (i / 1024) * 70;
        }

        const outputY = new Float32Array(800);
        interpolateSpectrumToCanvas(inputData, outputY, 800, 300, 48000, 2048);

        for (let i = 0; i < 800; i++) {
          expect(Number.isFinite(outputY[i]), `outputY[${i}] is non-finite`).toBe(true);
          expect(outputY[i]).toBeGreaterThanOrEqual(0);
          expect(outputY[i]).toBeLessThanOrEqual(300);
        }
      });
    });

    // 2.3: AcousticEngine Batch Offline Processing Stress
    describe('2.3 AcousticEngine Offline Processing & Filter Stability', () => {
      it('processes audio buffers via AcousticEngine.processBuffer with 0 crashes and encodes clean WAV', async () => {
        const testBuffer = createMockAudioBuffer(2, 500, 48000, (_, i) => {
          return Math.sin((2 * Math.PI * 440 * i) / 48000) * 0.5;
        });

        const extremeDSPParams: DSPParameters = {
          ...DEFAULT_DSP_PARAMS,
          lowShelfGain: 12,
          mandibleResGain: 12,
          sinusResGain: 12,
          antiResGain: -18,
          tissueCutoffFreq: 2000,
          highShelfGain: -12,
        };

        const modes: Array<'RAW' | 'INTERNAL_SIM' | 'COMPENSATED'> = [
          'RAW',
          'INTERNAL_SIM',
          'COMPENSATED',
        ];

        for (const mode of modes) {
          const rendered = await AcousticEngine.processBuffer(
            testBuffer,
            mode,
            extremeDSPParams
          );

          expect(rendered).toBeDefined();
          expect(rendered.numberOfChannels).toBe(2);
          expect(rendered.length).toBe(500);

          const wavArrayBuffer = audioBufferToWav(rendered);
          expect(wavArrayBuffer.byteLength).toBe(44 + 500 * 2 * 2);
        }
      });
    });
  });
});
