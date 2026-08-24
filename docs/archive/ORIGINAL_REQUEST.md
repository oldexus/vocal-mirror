# Original User Request

## 2026-08-23T13:38:58Z

# Teamwork Project Prompt — VocalMirror

An interactive, zero-server-cost Web application ("VocalMirror") that simulates and bridges the acoustic gap between how a person hears their own voice (internal bone conduction + air conduction) and how others hear it (external air conduction only), providing bidirectional voice transformation, visual spectral gap analysis, and vocal training feedback.

Working directory: ~/teamwork_projects/vocal_mirror
Integrity mode: development

## Requirements-to-Implementation Traceability Matrix

| Requirement | Scientific & Physical Grounding | Implementation Component | Verification Mechanism |
| :--- | :--- | :--- | :--- |
| **R1. Bidirectional Acoustic DSP Engine** | Cranial bone conduction boosts 50-300Hz & attenuates high frequencies (>4kHz); Voice Confrontation occurs due to missing low harmonics in air conduction. | Web Audio API DSP pipeline (`BiquadFilterNode` cascade, `GainNode`, `DynamicsCompressorNode`). | Vitest automated unit tests verifying transfer function frequency curves and headroom limits. |
| **R2. Perception Calibrator & A/B/C Studio** | Subjective skull density and cavity resonance vary per individual; requires real-time perceptual calibration. | React + Tailwind interactive studio with smooth Gain cross-fading for zero-pop A/B/C switching. | Vitest component tests + manual verification of recording/playback and state persistence. |
| **R3. Spectral Gap Analyzer** | Physical gap between air and bone conduction spectra can be visualized via FFT differential curves. | `AnalyserNode` (2048 FFT bins) + 60fps Canvas 2D differential energy renderer. | Vitest verification of FFT bin mapping and Canvas rendering lifecycle without memory leaks. |
| **R4. Client-side WAV Export & Guidance** | Users need to preserve transformed voice profiles and understand vocal acoustics. | In-browser WAV encoder (`audioBufferToWav`) + Educational/Vocal training guidance cards. | Automated blob generation test & valid RIFF WAV header structure validation. |

## Requirements

### R1. Bidirectional Acoustic Simulation Engine (Web Audio API)
Implement high-fidelity DSP filters in Web Audio API without external server dependencies:
1. **Air-to-Internal (What I hear)**: Simulates the cranial bone-conduction pathway by applying low-frequency resonance boosting (50 Hz–300 Hz low-shelf / peaking filters), high-frequency skull tissue attenuation (low-pass filter ~4kHz cutoff), and cranial cavity harmonics.
2. **Internal-to-External Compensation (What others hear / Bridging)**: Applies inverse/equalization filtering so the user can transform external recordings into their perceived internal tone, or generate an equalized voice track that preserves their perceived warmth when played to others.

### R2. Interactive Perception Calibrator & Voice Studio UI
Build a lightweight, responsive Web interface (React + Vite + Tailwind CSS):
- Live microphone recording (MediaRecorder API) and playback controls.
- Parameter sliders for skull resonance, low-shelf boost, tissue dampening, and formant correction.
- Instant zero-lag A/B/C listening switch: Original (Air Conduction), Simulated Internal (Bone Conduction), and Compensated Voice.

### R3. Visual Spectral Gap Analyzer
Provide real-time frequency visualizers (Web Audio `AnalyserNode` + Canvas API):
- Frequency distribution comparison between the raw microphone signal and the bone-conducted internal model.
- Highlighting the exact "gap frequency bands" (e.g., the missing bass resonance and formant differences that cause Voice Confrontation).

### R4. Browser-Side Audio Export & Vocal Guidance Module
- Client-side WAV encoder (no backend required) to download converted audio files.
- Interactive vocal feedback / training tips explaining why the voice sounds different and how to adjust pitch, projection, and resonance.

## Acceptance Criteria

### DSP & Audio Processing
- [ ] Implement bone-conduction simulation filter pipeline purely using Web Audio API nodes (`BiquadFilterNode`, `GainNode`, `DynamicsCompressorNode`).
- [ ] End-to-end audio processing latency measured under 30ms on standard hardware.
- [ ] Automated Vitest unit tests verifying DSP parameter calculations, frequency response curves, and clipping prevention.

### User Interface & Features
- [ ] Responsive Web UI builds cleanly via `npm run build` and runs via `npm run dev` with zero console errors.
- [ ] Support recording audio via `navigator.mediaDevices.getUserMedia`, playback, and real-time parameter tweaking.
- [ ] A/B/C toggle allows smooth switching without audio pops or clicks.
- [ ] Real-time Canvas visualizer renders smooth 60fps spectrum and differential gap curves.
- [ ] Audio export feature successfully downloads valid WAV files playable in standard OS players.
