/**
 * VocalMirror — Synthetic Vocal Harmonic Audio Generator
 * 
 * Generates realistic harmonic vocal samples using a source-filter physical acoustic model:
 * 1. Glottal source: Fundamental F0 with natural vibrato and micro-jitter
 * 2. Harmonic series: 28 overtones with 1/k^1.15 glottal spectral rolloff
 * 3. Vocal tract formants: F1-F4 resonant bandpass filtering for /ɑ/, /oʊ/, /i/
 * 4. Aspiration breath turbulence
 * 5. Smooth cosine envelope windowing
 */

export type SyntheticVowel = 'AH' | 'OH' | 'EE' | 'PHRASE';

export interface SyntheticVocalOptions {
  duration?: number;          // duration in seconds (default: 4.0)
  sampleRate?: number;        // sample rate in Hz (default: 48000)
  basePitch?: number;         // base F0 in Hz (default: 145.0)
  vibratoRate?: number;       // vibrato frequency in Hz (default: 5.2)
  vibratoDepth?: number;      // vibrato depth in semitones (default: 0.35)
  vowel?: SyntheticVowel;     // vowel profile (default: "PHRASE")
  peakGainDb?: number;        // peak normalization in dBFS (default: -3.0)
}

interface Formant {
  freq: number;
  bandwidth: number;
  gain: number;
}

const VOWEL_FORMANTS: Record<'AH' | 'OH' | 'EE', Formant[]> = {
  AH: [
    { freq: 730, bandwidth: 90, gain: 1.0 },
    { freq: 1090, bandwidth: 110, gain: 0.6 },
    { freq: 2440, bandwidth: 170, gain: 0.3 },
    { freq: 3400, bandwidth: 250, gain: 0.15 },
  ],
  OH: [
    { freq: 500, bandwidth: 80, gain: 1.0 },
    { freq: 900, bandwidth: 100, gain: 0.5 },
    { freq: 2300, bandwidth: 150, gain: 0.25 },
    { freq: 3200, bandwidth: 220, gain: 0.12 },
  ],
  EE: [
    { freq: 280, bandwidth: 60, gain: 1.0 },
    { freq: 2250, bandwidth: 120, gain: 0.7 },
    { freq: 2800, bandwidth: 160, gain: 0.4 },
    { freq: 3500, bandwidth: 240, gain: 0.15 },
  ],
};

/**
 * Generates raw Float32Array PCM samples of synthesized human vocal audio.
 */
export function generateSyntheticVocalPCM(options: SyntheticVocalOptions = {}): Float32Array {
  const duration = options.duration ?? 4.0;
  const sampleRate = options.sampleRate ?? 48000;
  const baseF0 = options.basePitch ?? 145.0;
  const vibRate = options.vibratoRate ?? 5.2;
  const vibDepth = options.vibratoDepth ?? 0.35; // semitones
  const vowelMode = options.vowel ?? 'PHRASE';
  const peakDb = options.peakGainDb ?? -3.0;

  const numSamples = Math.floor(duration * sampleRate);
  const pcm = new Float32Array(numSamples);

  let phase = 0.0;
  const maxHarmonics = 28;

  // Pseudo-random generator with fixed seed for deterministic output
  let seed = 123456789;
  const pseudoRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let n = 0; n < numSamples; n++) {
    const t = n / sampleRate;

    // 1. Compute dynamic pitch with vibrato and subtle jitter
    const vibratoSemis = vibDepth * Math.sin(2 * Math.PI * vibRate * t);
    const jitter = (pseudoRand() - 0.5) * 0.008; // 0.8% micro-jitter
    const pitchFactor = Math.pow(2, vibratoSemis / 12) * (1 + jitter);
    const f0 = baseF0 * pitchFactor;

    // Phase accumulator step
    phase += (2 * Math.PI * f0) / sampleRate;
    if (phase > 2 * Math.PI) {
      phase -= 2 * Math.PI;
    }

    // 2. Interpolate Formants for dynamic phrase or static vowel
    let formants: Formant[];
    if (vowelMode === 'PHRASE') {
      // Natural 3-phase phrase: 0.0-1.5s (AH) -> 1.5-2.8s (OH) -> 2.8-4.0s (EE/Hum)
      const progress = (t / duration) * 3.0;
      if (progress < 1.0) {
        formants = interpolateFormants(VOWEL_FORMANTS.AH, VOWEL_FORMANTS.OH, progress);
      } else if (progress < 2.0) {
        formants = interpolateFormants(VOWEL_FORMANTS.OH, VOWEL_FORMANTS.EE, progress - 1.0);
      } else {
        formants = interpolateFormants(VOWEL_FORMANTS.EE, VOWEL_FORMANTS.AH, progress - 2.0);
      }
    } else {
      formants = VOWEL_FORMANTS[vowelMode];
    }

    // 3. Glottal harmonic series evaluated through formant filters
    let sample = 0.0;
    for (let k = 1; k <= maxHarmonics; k++) {
      const harmFreq = k * f0;
      if (harmFreq >= sampleRate / 2) break;

      // Source spectrum roll-off (1 / k^1.15)
      const sourceAmp = 1.0 / Math.pow(k, 1.15);

      // Formant frequency response evaluation
      let formantGain = 0.05; // baseline transmission
      for (const f of formants) {
        const delta = Math.abs(harmFreq - f.freq);
        const qFactor = f.freq / Math.max(10, f.bandwidth);
        const response = f.gain / Math.sqrt(1 + Math.pow((2 * qFactor * delta) / f.freq, 2));
        formantGain += response;
      }

      sample += sourceAmp * formantGain * Math.sin(k * phase);
    }

    // 4. Subtle aspiration breath noise
    const breathNoise = (pseudoRand() * 2 - 1) * 0.025;
    sample += breathNoise;

    // 5. Envelope windowing (smooth attack and release)
    const attackSamples = Math.floor(0.12 * sampleRate);
    const releaseSamples = Math.floor(0.25 * sampleRate);
    let env = 1.0;
    if (n < attackSamples) {
      env = 0.5 * (1 - Math.cos((Math.PI * n) / attackSamples));
    } else if (n > numSamples - releaseSamples) {
      const relIdx = n - (numSamples - releaseSamples);
      env = 0.5 * (1 + Math.cos((Math.PI * relIdx) / releaseSamples));
    }

    // Subtle natural syllable breathing modulation (0.75 Hz)
    const syllableMod = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.75 * t);

    pcm[n] = sample * env * syllableMod;
  }

  // 6. Peak Normalization to specified peakDb
  let peak = 0.0;
  for (let n = 0; n < numSamples; n++) {
    const absVal = Math.abs(pcm[n]);
    if (absVal > peak) peak = absVal;
  }

  if (peak > 1e-6) {
    const targetLinear = Math.pow(10, peakDb / 20);
    const normFactor = targetLinear / peak;
    for (let n = 0; n < numSamples; n++) {
      pcm[n] *= normFactor;
    }
  }

  return pcm;
}

function interpolateFormants(a: Formant[], b: Formant[], frac: number): Formant[] {
  const clamped = Math.max(0, Math.min(1, frac));
  return a.map((fa, i) => {
    const fb = b[i] || fa;
    return {
      freq: fa.freq + (fb.freq - fa.freq) * clamped,
      bandwidth: fa.bandwidth + (fb.bandwidth - fa.bandwidth) * clamped,
      gain: fa.gain + (fb.gain - fa.gain) * clamped,
    };
  });
}

/**
 * Creates a playable Web Audio AudioBuffer from synthesized vocal PCM data.
 */
export function createSyntheticVocalBuffer(
  ctx: BaseAudioContext,
  options?: SyntheticVocalOptions
): AudioBuffer {
  const sampleRate = ctx.sampleRate || options?.sampleRate || 48000;
  const pcm = generateSyntheticVocalPCM({ ...options, sampleRate });
  const buffer = ctx.createBuffer(1, pcm.length, sampleRate);
  buffer.getChannelData(0).set(pcm);
  return buffer;
}

/**
 * Pre-defined demonstration voice presets for instant studio audition.
 */
export const SAMPLE_AUDIO_PRESETS = {
  male_baritone: {
    name: 'Baritone Male Voice (130Hz)',
    description: 'Deep, chest-resonant natural speech phrase /ɑ/ -> /oʊ/ -> /i/.',
    options: {
      duration: 4.0,
      basePitch: 130.0,
      vibratoRate: 5.0,
      vibratoDepth: 0.30,
      vowel: 'PHRASE' as SyntheticVowel,
    },
  },
  female_alto: {
    name: 'Alto Female Voice (210Hz)',
    description: 'Bright, cranial-resonant vocal phrase with open formants.',
    options: {
      duration: 4.0,
      basePitch: 210.0,
      vibratoRate: 5.5,
      vibratoDepth: 0.40,
      vowel: 'PHRASE' as SyntheticVowel,
    },
  },
  tenor_vowel_ah: {
    name: 'Sustained Tenor /ɑ/ (165Hz)',
    description: 'Steady sustained open vowel for precise spectral gap calibration.',
    options: {
      duration: 4.0,
      basePitch: 165.0,
      vibratoRate: 5.2,
      vibratoDepth: 0.25,
      vowel: 'AH' as SyntheticVowel,
    },
  },
};
