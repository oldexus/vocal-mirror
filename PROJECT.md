# Project: VoiceMirror Web Deployment Readiness & Security Hardening

## Architecture
VoiceMirror is a zero-latency client-side Web Audio application built with React 18, TypeScript, Tailwind CSS, and Vite. It utilizes raw Web Audio API (`AudioContext`, `OfflineAudioContext`, `BiquadFilterNode`, `DynamicsCompressorNode`, `AnalyserNode`) and native `getUserMedia` for cranial bone conduction simulation and voice perception calibration.

### Target Deployment Targets & Security Posture
1. **Cloudflare Pages**: Static distribution with `public/_headers` (CSP, COOP `same-origin`, COEP `credentialless`, CORP `same-origin`, HSTS) and `public/_redirects` (SPA routing).
2. **Vercel**: Static distribution with `vercel.json` (Security headers, SPA rewrites, static caching headers).
3. **Netlify**: Static distribution with `netlify.toml` (Security headers, SPA redirects, build commands).
4. **GitHub Pages / Generic Static Hosting**: Dynamic base path support (`BASE_PATH` / `VITE_BASE_PATH`), `public/404.html` SPA fallback, and relative asset resolution.
5. **PWA (Progressive Web App)**: W3C compliant `manifest.webmanifest`, theme-color, responsive viewport with cover fit, and offline-capable static shell.
6. **Multi-Layer Defensive Security**: 0 DOM injection/XSS sinks, prototype pollution guards, 4GB+ WAV chunk boundary overflow guards, 32-channel limits, DSP NaN/Inf elimination, instant microphone hardware revocation release, and full frame isolation (`X-Frame-Options: DENY`, `frame-ancestors 'none'`).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|:---:|:---:|:---:|
| F1 | Base Path Portability | Flexible base URL in `vite.config.ts` (`BASE_PATH` / `VITE_BASE_PATH` / relative `./`) supporting root domains and subpaths | M1 | Survey 1 | **VERIFIED** |
| F2 | Rollup Chunk Splitting | Optimized `manualChunks` in `vite.config.ts` separating vendor-react, vendor-icons, and audio DSP engine | M1 | Survey 1 | **VERIFIED** |
| F3 | SPA Fallback Handling | Universal 404 rewrite / fallback for static hosts (`_redirects`, `vercel.json`, `netlify.toml`, `public/404.html`) | M1 | Survey 1, 2 | **VERIFIED** |
| F4 | Production Security Headers | Full suite of HTTP headers: CSP (Blob/MediaStream/data compliant), COOP (`same-origin`), COEP (`credentialless`), HSTS, Referrer-Policy, Permissions-Policy | M2 | Survey 2 | **VERIFIED** |
| F5 | Static Host Configurations | Deployment config generation: `public/_headers`, `public/_redirects`, `vercel.json`, `netlify.toml`, `public/robots.txt` | M2 | Survey 2 | **VERIFIED** |
| F6 | PWA Manifest & App Icons | `public/manifest.webmanifest`, SVG/PNG icons (192x192, 512x512, maskable 512, apple-touch-icon 180), and theme-color `#020617` | M2 | Survey 2 | **VERIFIED** |
| F7 | Social & SEO HTML Metadata | Open Graph tags (`og:*`), Twitter Card (`twitter:*`), viewport-fit=cover, and dynamic `%BASE_URL%` in `index.html` | M2 | Survey 2 | **VERIFIED** |
| F8 | AudioContext Autoplay & Unlock | Robust user-gesture unlock across iOS Safari, iPadOS, Android Chrome, and desktop browsers | M3 | Survey 3 | **VERIFIED** |
| F9 | Microphone Stream & Visibility Lifecycle | Secure context checking, microphone error handling, stream track stopping, and background tab suspension | M3 | Survey 3 | **VERIFIED** |
| F10 | Dynamic Sample Rate DSP | Robust operation on 44.1kHz, 48kHz, and 96kHz DACs in real-time DSP and OfflineAudioContext rendering | M3 | Survey 3 | **VERIFIED** |
| F11 | WAV Export Blob Downloads | Cross-device WAV blob generation and `<a download>` DOM attachment with delay cleanup for iOS Safari & Firefox | M3 | Survey 3 | **VERIFIED** |
| F12 | Automated GitHub Actions CI/CD | Reusable CI workflow (`.github/workflows/deploy.yml`) for lint/typecheck, full test suite (650 tests passing), build, and artifact verification | M4 | Survey 1 | **VERIFIED** |
| F13 | Local Preview & Build Verification | Clean verification of `dist/` production assets via `vite preview` and static serve | M4 | Survey 1 | **VERIFIED** |
| F14 | Comprehensive Deployment Audit Report | Complete Japanese deployment readiness assessment document ([`docs/DEPLOYMENT_AUDIT.md`](./docs/DEPLOYMENT_AUDIT.md)) | M5 | Survey 1, 2, 3 | **VERIFIED** |
| F15 | Adversarial Security Hardening Suite | Automated programmatic security & fuzzing suite (`tests/security/` 61 tests) and report ([`docs/SECURITY_HARDENING_AUDIT.md`](./docs/SECURITY_HARDENING_AUDIT.md)) | M6 | Sec Survey | **VERIFIED** |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|:---:|:---:|
| M1 | **Production Build & SPA Portability** | `vite.config.ts` base path, chunk splitting, asset optimization, SPA 404 fallback | none | **DONE** |
| M2 | **Security Headers, PWA & Metadata** | `public/_headers`, `_redirects`, `vercel.json`, `netlify.toml`, `manifest.webmanifest`, `robots.txt`, PNG icons, `index.html` metadata | M1 | **DONE** |
| M3 | **Cross-Platform Audio Compatibility** | Web Audio lifecycle, user-gesture unlock, background tab visibility suspension, WAV blob download hardening | M1 | **DONE** |
| M4 | **CI/CD Automation & Build Verification** | GitHub Actions workflow (`.github/workflows/deploy.yml`), local preview validation, full test verification suite | M1, M2, M3 | **DONE** |
| M5 | **Deployment Audit Report & Acceptance** | Comprehensive Japanese deployment manual ([`docs/DEPLOYMENT_AUDIT.md`](./docs/DEPLOYMENT_AUDIT.md)), Reviewer & Forensic Audit verification | M1, M2, M3, M4 | **DONE** |
| M6 | **Security Hardening & Adversarial Penetration Audit** | Programmatic security tests (`tests/security/` 61 tests), multi-layer defensive guards, Japanese audit report ([`docs/SECURITY_HARDENING_AUDIT.md`](./docs/SECURITY_HARDENING_AUDIT.md)), Victory Auditor verification | M1-M5 | **DONE** |

---

## Documentation Index
- Japanese Security Hardening Audit Report: [`docs/SECURITY_HARDENING_AUDIT.md`](./docs/SECURITY_HARDENING_AUDIT.md)
- Japanese Master Deployment Manual: [`docs/DEPLOYMENT_AUDIT.md`](./docs/DEPLOYMENT_AUDIT.md)
- Japanese Project Specification: [`docs/PROJECT_JA.md`](./docs/PROJECT_JA.md)
- Historical Phase 1 Code Review Specification: [`docs/CODE_REVIEW_PROJECT_JA.md`](./docs/CODE_REVIEW_PROJECT_JA.md)
- Historical Phase 1 Prompt Draft: [`docs/PROMPT_DRAFT_JA.md`](./docs/PROMPT_DRAFT_JA.md)

---

## Code Layout
```
vocal-mirror/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions automated CI/CD pipeline
├── public/
│   ├── _headers                # Cloudflare Pages HTTP security & cache headers
│   ├── _redirects              # Cloudflare Pages SPA rewrite rules
│   ├── 404.html                # GitHub Pages / static host SPA fallback
│   ├── favicon.svg             # Vector favicon
│   ├── icon-192.png            # PWA 192x192 icon
│   ├── icon-512.png            # PWA 512x512 icon
│   ├── icon-maskable-512.png   # PWA 512x512 maskable icon
│   ├── apple-touch-icon.png    # iOS Safari 180x180 touch icon
│   ├── og-image.png            # Open Graph social preview banner (1200x630)
│   ├── manifest.webmanifest    # W3C Web App Manifest
│   └── robots.txt              # Search engine crawling rules
├── docs/
│   ├── SECURITY_HARDENING_AUDIT.md # Security Penetration Hardening & Forensic Audit Report (Japanese)
│   ├── DEPLOYMENT_AUDIT.md     # Master Web Deployment Readiness Report (Japanese)
│   ├── PROJECT_JA.md           # Japanese Project Specification
│   ├── CODE_REVIEW_PROJECT_JA.md # Historical Phase 1 Code Review Specification
│   └── PROMPT_DRAFT_JA.md      # Historical Phase 1 Prompt Draft Archive
├── tests/
│   ├── security/               # Automated adversarial security test suite (61 tests)
│   │   ├── client_injection_csp.test.ts
│   │   ├── binary_dsp_fuzz.test.ts
│   │   └── hardware_concurrency_abuse.test.ts
│   ├── stress/                 # Adversarial stress & concurrency test suite
│   ├── unit/                   # Unit test suites (DSP, hooks, i18n, visualizer, components)
│   └── e2e/                    # End-to-end integration tiers (Tier 1-4)
├── src/
│   ├── audio/                  # Web Audio DSP engine, models, sample audio
│   ├── components/             # React UI components (Oscilloscope, Spectrum, Studio, Modal)
│   ├── hooks/                  # Audio studio hooks, audio context lifecycle
│   ├── utils/                  # WAV encoder, frequency math, audio helpers
│   ├── App.tsx                 # Main application shell
│   └── main.tsx                # React DOM entry point
├── index.html                  # HTML entry point with OGP, PWA, theme & viewport meta
├── vite.config.ts              # Vite configuration (dynamic base, manualChunks, security headers)
├── vercel.json                 # Vercel deployment configuration (headers & rewrites)
├── netlify.toml                # Netlify deployment configuration (headers & redirects)
├── package.json
└── tsconfig.json
```
