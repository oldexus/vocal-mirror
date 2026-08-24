# E2E Test Infra: VocalMirror

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation internals.
- Verified against `ORIGINAL_REQUEST.md` and acoustic physical standards.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.

## Feature Inventory & Test Coverage Mapping

| # | Feature | Requirement Source | Tier 1 (Features) | Tier 2 (Boundaries) | Tier 3 (Pairwise) | Tier 4 (Scenarios) |
|---|---------|-------------------|:-----------------:|:-------------------:|:-----------------:|:------------------:|
| 1 | Air-to-Internal Simulation | R1 | 5 | 5 | ✓ | ✓ |
| 2 | Internal-to-External Compensation | R1 | 5 | 5 | ✓ | ✓ |
| 3 | Headroom & Anti-Clipping Limiter | R1 | 5 | 5 | ✓ | ✓ |
| 4 | Parameter Sliders & Presets | R2 | 5 | 5 | ✓ | ✓ |
| 5 | Zero-Pop A/B/C Crossfading | R2 | 5 | 5 | ✓ | ✓ |
| 6 | Audio Recording & Playback Lifecycle | R2 | 5 | 5 | ✓ | ✓ |
| 7 | Dual FFT Spectral Gap Visualizer | R3 | 5 | 5 | ✓ | ✓ |
| 8 | Client-side WAV Binary Encoder | R4 | 5 | 5 | ✓ | ✓ |
| 9 | Psychoacoustic Guidance Module | R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture

### Test Runner
- Framework: Vitest (`npx vitest run`)
- Environment: jsdom + Web Audio API environment / mocks
- Expected: All unit and E2E test suites pass with exit code 0.

### Directory Layout
```
tests/
├── mocks/
│   └── webAudioMock.ts
├── unit/
│   ├── dsp/
│   ├── visualizer/
│   ├── export/
│   └── components/
└── e2e/
    ├── tier1_features.test.ts      # Tier 1: ≥45 isolated feature verification tests
    ├── tier2_boundaries.test.ts    # Tier 2: ≥45 boundary, extreme & corner tests
    ├── tier3_combinations.test.ts  # Tier 3: ≥10 pairwise cross-feature interaction tests
    └── tier4_scenarios.test.ts     # Tier 4: ≥5 realistic end-to-end vocal studio workflows
```

## Real-World Application Scenarios (Tier 4)

| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Podcaster Voice Confrontation Calibration | Mic Recording -> A/B Switch -> Low-Shelf/Tissue Adjustment -> Spectral Gap Visualizer Inspection -> WAV Export | High |
| 2 | High-Soprano Cranial Resonance Equalization | Bright Cranial Preset -> Formant Boost -> Realtime Sine Analysis -> Zero-Pop Crossfade -> WAV Validation | Medium |
| 3 | Baritone Chest Voice Compensation | Deep Chest Preset -> Extreme Low-Boost -> Dynamic Pre-attenuation & Compressor Limiting Verification | High |
| 4 | Vocal Training & Acoustic Education Flow | Guidance Card Step-Through -> Spectral Gap Inspection -> Live Parameter Tuning -> Comparison Export | Medium |
| 5 | Zero-Audio Input Graceful Fallback & Fast Recovery | Missing Mic Permission -> Synthetic Buffer Fallback -> Parameter Manipulation -> Clean Unmount / Destroy | High |

## Coverage Thresholds
- **Tier 1**: ≥5 per feature (Total ≥ 45 test cases)
- **Tier 2**: ≥5 per feature across extreme boundaries & invalid inputs (Total ≥ 45 test cases)
- **Tier 3**: ≥10 pairwise interaction test cases (covering DSP, UI, Canvas, and Export interoperability)
- **Tier 4**: ≥5 complete real-world vocal studio end-to-end workflow scenarios
- **Total Suite**: ≥ 105 test cases ensuring 100% specification and acoustic fidelity.
