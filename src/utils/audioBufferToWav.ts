/**
 * VocalMirror — Client-Side RIFF/WAVE Audio Encoder & Export Pipeline
 * 
 * Encodes Web Audio API AudioBuffer instances into standard 16-bit Linear PCM
 * or 32-bit IEEE 754 Floating-Point canonical 44-byte RIFF/WAVE audio binaries.
 * Provides in-browser Blob generation, download triggering with automatic URL
 * revocation, and offline DSP batch rendering via AcousticEngine.processBuffer().
 */

import { AcousticEngine } from '../audio/AcousticEngine';
import { DSPParameters, ListeningMode } from '../types/audio';
import { DEFAULT_DSP_PARAMS } from '../audio/constants';

export interface WavEncodeOptions {
  /**
   * If true, encodes as 32-bit IEEE 754 Floating Point (AudioFormat = 3).
   * If false (default), encodes as standard 16-bit Signed Linear PCM (AudioFormat = 1).
   */
  float32?: boolean;
}

export type WavEncoderOptions = WavEncodeOptions;

/**
 * Validates whether an object conforms to minimal AudioBuffer interface.
 */
function isValidAudioBuffer(buffer: unknown): buffer is AudioBuffer {
  if (!buffer || typeof buffer !== 'object') return false;
  const b = buffer as Partial<AudioBuffer>;
  return (
    typeof b.numberOfChannels === 'number' &&
    typeof b.sampleRate === 'number' &&
    typeof b.length === 'number' &&
    typeof b.getChannelData === 'function'
  );
}

/**
 * Encodes an AudioBuffer into a canonical 44-byte RIFF/WAVE ArrayBuffer.
 * 
 * Supports mono, stereo, and multi-channel interleaving with precise
 * float-to-PCM clamping and asymmetric integer scaling.
 * 
 * @param buffer - The Web Audio API AudioBuffer to encode
 * @param options - Encoding options (e.g. float32 for 32-bit IEEE Float format)
 * @returns ArrayBuffer containing the complete RIFF/WAVE binary data
 */
export function audioBufferToWav(
  buffer: AudioBuffer,
  options: WavEncodeOptions = {}
): ArrayBuffer {
  if (!isValidAudioBuffer(buffer)) {
    throw new TypeError(
      'audioBufferToWav: Invalid AudioBuffer provided. Expected a valid AudioBuffer instance.'
    );
  }

  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const isFloat = Boolean(options.float32);

  const format = isFloat ? 3 : 1; // 1 = WAVE_FORMAT_PCM, 3 = WAVE_FORMAT_IEEE_FLOAT
  const bitDepth = isFloat ? 32 : 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // ---------------------------------------------------------------------------
  // 1. RIFF Chunk Descriptor (12 bytes)
  // ---------------------------------------------------------------------------
  // Offset 0: 'RIFF' (0x52, 0x49, 0x46, 0x46)
  writeAscii(view, 0, 'RIFF');
  // Offset 4: ChunkSize = 36 + Subchunk2Size (totalSize - 8 bytes)
  view.setUint32(4, 36 + dataSize, true);
  // Offset 8: 'WAVE' (0x57, 0x41, 0x56, 0x45)
  writeAscii(view, 8, 'WAVE');

  // ---------------------------------------------------------------------------
  // 2. fmt Sub-chunk (24 bytes)
  // ---------------------------------------------------------------------------
  // Offset 12: 'fmt ' (0x66, 0x6D, 0x74, 0x20)
  writeAscii(view, 12, 'fmt ');
  // Offset 16: Subchunk1Size = 16 for standard PCM/canonical format
  view.setUint32(16, 16, true);
  // Offset 20: AudioFormat (1 = PCM, 3 = IEEE Float)
  view.setUint16(20, format, true);
  // Offset 22: NumChannels
  view.setUint16(22, numChannels, true);
  // Offset 24: SampleRate
  view.setUint32(24, sampleRate, true);
  // Offset 28: ByteRate = SampleRate * NumChannels * (BitsPerSample / 8)
  view.setUint32(28, byteRate, true);
  // Offset 32: BlockAlign = NumChannels * (BitsPerSample / 8)
  view.setUint16(32, blockAlign, true);
  // Offset 34: BitsPerSample (16 or 32)
  view.setUint16(34, bitDepth, true);

  // ---------------------------------------------------------------------------
  // 3. data Sub-chunk Header (8 bytes)
  // ---------------------------------------------------------------------------
  // Offset 36: 'data' (0x64, 0x61, 0x74, 0x61)
  writeAscii(view, 36, 'data');
  // Offset 40: Subchunk2Size = numSamples * blockAlign
  view.setUint32(40, dataSize, true);

  // If buffer has zero length, return canonical 44-byte empty header
  if (numSamples === 0) {
    return arrayBuffer;
  }

  // ---------------------------------------------------------------------------
  // 4. Interleaved Audio Sample Writing
  // ---------------------------------------------------------------------------
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  let offset = headerSize;

  if (isFloat) {
    // 32-bit IEEE 754 Floating Point Encoding
    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const s = channelData[ch][i];
        const val = Number.isFinite(s) ? s : 0;
        view.setFloat32(offset, val, true);
        offset += 4;
      }
    }
  } else {
    // 16-bit Signed Integer PCM Encoding with exact asymmetric clamping & NaN sanitization
    if (numChannels === 1) {
      // Optimized single-channel mono loop
      const mono = channelData[0];
      for (let i = 0; i < numSamples; i++) {
        const s = mono[i];
        const finiteVal = Number.isFinite(s) ? s : 0;
        const clamped = finiteVal < -1 ? -1 : finiteVal > 1 ? 1 : finiteVal;
        const int16 = clamped < 0 ? (clamped * 0x8000) | 0 : (clamped * 0x7FFF) | 0;
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    } else if (numChannels === 2) {
      // Optimized 2-channel stereo unrolled loop
      const left = channelData[0];
      const right = channelData[1];
      for (let i = 0; i < numSamples; i++) {
        const sL = left[i];
        const finiteL = Number.isFinite(sL) ? sL : 0;
        const clampedL = finiteL < -1 ? -1 : finiteL > 1 ? 1 : finiteL;
        const int16L = clampedL < 0 ? (clampedL * 0x8000) | 0 : (clampedL * 0x7FFF) | 0;
        view.setInt16(offset, int16L, true);

        const sR = right[i];
        const finiteR = Number.isFinite(sR) ? sR : 0;
        const clampedR = finiteR < -1 ? -1 : finiteR > 1 ? 1 : finiteR;
        const int16R = clampedR < 0 ? (clampedR * 0x8000) | 0 : (clampedR * 0x7FFF) | 0;
        view.setInt16(offset + 2, int16R, true);

        offset += 4;
      }
    } else {
      // Generic multi-channel loop
      for (let i = 0; i < numSamples; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
          const s = channelData[ch][i];
          const finiteVal = Number.isFinite(s) ? s : 0;
          const clamped = finiteVal < -1 ? -1 : finiteVal > 1 ? 1 : finiteVal;
          const int16 = clamped < 0 ? (clamped * 0x8000) | 0 : (clamped * 0x7FFF) | 0;
          view.setInt16(offset, int16, true);
          offset += 2;
        }
      }
    }
  }

  return arrayBuffer;
}

/**
 * Encodes an AudioBuffer to a standard audio/wav Blob.
 */
export function exportAudioBufferAsWavBlob(
  buffer: AudioBuffer,
  options: WavEncodeOptions = {}
): Blob {
  const arrayBuffer = audioBufferToWav(buffer, options);
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Triggers a browser download of a WAV Blob or AudioBuffer and ensures memory cleanup.
 */
export function downloadWavBlob(
  target: Blob | AudioBuffer,
  filename = 'vocal_mirror_export.wav',
  options: WavEncodeOptions = {}
): void {
  let blob: Blob;

  if (target instanceof Blob) {
    blob = target;
  } else if (isValidAudioBuffer(target)) {
    blob = exportAudioBufferAsWavBlob(target, options);
  } else {
    throw new TypeError('downloadWavBlob: expected a Blob or an AudioBuffer instance.');
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename.endsWith('.wav') ? filename : `${filename}.wav`;

  document.body.appendChild(anchor);
  anchor.click();

  // Asynchronous cleanup to ensure download dispatch without leaking memory
  setTimeout(() => {
    try {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      URL.revokeObjectURL(url);
    } catch {
      // Defensive fallback
    }
  }, 1000);
}

/**
 * Encodes and immediately triggers download for an AudioBuffer.
 */
export function downloadAudioBufferAsWav(
  buffer: AudioBuffer,
  filename = 'vocal_mirror_export.wav',
  options: WavEncodeOptions = {}
): void {
  downloadWavBlob(buffer, filename, options);
}

/**
 * Offline batch rendering and export pipeline.
 * Renders active DSP settings on arbitrary AudioBuffers via AcousticEngine.processBuffer()
 * and exports the bit-accurate result as a WAV Blob.
 */
export async function renderAndExportWav(
  buffer: AudioBuffer,
  mode: ListeningMode,
  params: DSPParameters = DEFAULT_DSP_PARAMS,
  filename?: string,
  options: WavEncodeOptions = {}
): Promise<{ blob: Blob; renderedBuffer: AudioBuffer }> {
  let targetBuffer = buffer;

  if (mode !== 'RAW') {
    targetBuffer = await AcousticEngine.processBuffer(buffer, mode, params);
  }

  const blob = exportAudioBufferAsWavBlob(targetBuffer, options);

  if (filename) {
    downloadWavBlob(blob, filename, options);
  }

  return { blob, renderedBuffer: targetBuffer };
}

/**
 * Helper to write a 4-character ASCII string into DataView in Big-Endian byte order.
 */
function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
