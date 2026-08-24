# Original User Request

## Initial Request — 2026-08-24T12:24:36+09:00

Conduct a comprehensive web deployment readiness assessment, configuration generation, and cross-platform compatibility optimization for the VoiceMirror (VocalMirror) client-side Web Audio application, ensuring it can be deployed seamlessly to standard static hosting environments (Cloudflare Pages, Vercel, GitHub Pages, Firebase Hosting, etc.).

Working directory: /Users/ash/Documents/00_GoogleDriveShare/Lv11_Development/vocal-mirror
Integrity mode: development

## Requirements

### R1. Production Build, SPA Routing & Base Path Portability
- Audit production bundle generation (`dist/`), asset hashing, chunk splitting, and tree-shaking efficiency.
- Ensure flexible base URL configuration in `vite.config.ts` supporting both root domains (`https://example.com/`) and subpath hosting (e.g., `https://example.com/vocal-mirror/` or GitHub Pages `/<repo>/`).
- Configure Single Page Application (SPA) routing fallbacks (e.g. 404 rewrite to `index.html`) for static hosts.

### R2. Web Security Headers, PWA Manifest & Metadata
- Generate production-grade HTTP security headers including Content Security Policy (CSP), Cross-Origin-Opener-Policy (COOP: same-origin), Cross-Origin-Embedder-Policy (COEP: credentialless/require-corp for high-precision audio clocks), HSTS, and Referrer-Policy.
- Create ready-to-use static hosting header configurations (e.g. `public/_headers` for Cloudflare Pages, `vercel.json` for Vercel, and `netlify.toml`).
- Configure a standard Web App Manifest (`public/manifest.webmanifest`), theme color, favicon/PWA icons, and Open Graph / Twitter Card social metadata in `index.html`.

### R3. Cross-Browser, Mobile & Web Audio Deployment Compatibility
- Verify AudioContext user-gesture unlock flow ensuring compliant autoplay behavior across iOS Safari, iPadOS, Android Chrome, and desktop browsers without silent audio playback drops.
- Audit microphone permission flows, HTTPS/Secure Context enforcement, and audio hardware release during background tab suspension / visibility change.
- Verify cross-device sample rate compatibility (44.1kHz vs 48kHz vs 96kHz DACs) and mobile Safari WAV blob download behavior.

### R4. CI/CD Pipeline Automation & Deployment Readiness Report
- Create a reusable GitHub Actions automated CI/CD workflow (`.github/workflows/deploy.yml` or `.github/workflows/ci.yml`) that runs typecheck (`tsc --noEmit`), test suite (`vitest run`), build (`vite build`), and optional deployment steps.
- Verify production distribution locally via preview server (`npm run preview` / static serve).
- Synthesize a comprehensive, prioritized Web Deployment Readiness Report in Japanese (`docs/DEPLOYMENT_AUDIT.md`) with concrete operational guidelines for various hosting targets.

## Acceptance Criteria

### Deployment Configuration & Security
- [ ] Production build (`npm run build`) completes cleanly with 0 errors and generates optimized static distribution assets.
- [ ] Security headers (`_headers`, `vercel.json`, `netlify.toml`) and Web App Manifest (`manifest.webmanifest`) are properly generated, syntactically valid, and placed correctly.
- [ ] Open Graph metadata, responsive viewport, and favicon/app icons are properly integrated into `index.html`.
- [ ] Base URL configurability for both root domain and subpaths is verified.

### Audio & Cross-Browser Robustness
- [ ] AudioContext initialization complies with browser autoplay policies with seamless user-gesture unlock.
- [ ] Microphone permission and stream cleanup under tab visibility changes/backgrounding are verified.
- [ ] WAV export blob download operates correctly across desktop and mobile browsers.

### CI/CD & Verification
- [ ] GitHub Actions CI/CD workflow file is created, valid, and aligned with project scripts.
- [ ] 100% of test suite (429+ tests) continues to pass cleanly (`npm test -- --run`).
- [ ] Comprehensive Japanese Web Deployment Readiness Report (`docs/DEPLOYMENT_AUDIT.md`) is delivered.
