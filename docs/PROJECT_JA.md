# プロジェクト仕様書: VoiceMirror Web デプロイ適合性 & セキュリティ硬化

## アーキテクチャ (Architecture)
VoiceMirror は、React 18、TypeScript、Tailwind CSS、および Vite で構築された、ゼロレイテンシーのクライアントサイド Web Audio アプリケーションです。ネイティブの Web Audio API（`AudioContext`、`OfflineAudioContext`、`BiquadFilterNode`、`DynamicsCompressorNode`、`AnalyserNode`）および `getUserMedia` を活用し、頭蓋骨伝導（骨導音）シミュレーションと音声知覚キャリブレーションを実現します。

### 対応デプロイ対象環境 & セキュリティポスチャ
1. **Cloudflare Pages**: `public/_headers`（CSP、COOP `same-origin`、COEP `credentialless`、CORP `same-origin`、HSTS）および `public/_redirects`（SPA ルーティング）による静的配信。
2. **Vercel**: `vercel.json`（セキュリティヘッダー、SPA リライト、静的キャッシュヘッダー）による静的配信。
3. **Netlify**: `netlify.toml`（セキュリティヘッダー、SPA リダイレクト、ビルド構成）による静的配信。
4. **GitHub Pages / 汎用静的ホスティング**: 動的ベースパス対応（`BASE_PATH` / `VITE_BASE_PATH`）、`public/404.html` SPA フォールバック、および相対アセット解決。
5. **PWA (Progressive Web App)**: W3C 準拠の `manifest.webmanifest`、テーマカラー、セーフエリア対応レスポンシブビューポート、オフライン対応静的シェル。
6. **多層防御セキュリティ**: DOM 注入/XSS 危険シンク 0 件化、プロトタイプ汚染防御、4GB+ WAV チャンク境界オーバーフロー防御、最大 32ch 制限、DSP NaN/Inf 排除、マイク動的剥奪時の即時ハードウェア解放、フレーム分離（`X-Frame-Options: DENY`, `frame-ancestors 'none'`）。

---

## 機能一覧 (Feature Inventory)
| # | 機能名 | 説明 | マイルストーン | 要件元 | ステータス |
|---|---------|-------------|:---:|:---:|:---:|
| F1 | ベースパス可搬性 | ルートドメインおよびサブパス配信を両立する `vite.config.ts` の柔軟な Base URL 設定（`BASE_PATH` / `VITE_BASE_PATH` / 相対パス `./`） | M1 | Survey 1 | **検証完了 (VERIFIED)** |
| F2 | Rollup チャンク分割 | `vendor-react`、`vendor-icons`、および音響 DSP エンジンを分離する `vite.config.ts` の `manualChunks` 最適化 | M1 | Survey 1 | **検証完了 (VERIFIED)** |
| F3 | SPA 404 フォールバック処理 | 静的ホスト向け汎用 404 リライト / フォールバック機構（`_redirects`, `vercel.json`, `netlify.toml`, `public/404.html`） | M1 | Survey 1, 2 | **検証完了 (VERIFIED)** |
| F4 | 本番セキュリティヘッダー | HTTP セキュリティヘッダー群の配備: CSP（Blob/MediaStream/data 適合）、COOP (`same-origin`)、COEP (`credentialless`)、HSTS、Referrer-Policy、Permissions-Policy | M2 | Survey 2 | **検証完了 (VERIFIED)** |
| F5 | 静的ホスト設定ファイル群 | デプロイ設定の自動生成: `public/_headers`、`public/_redirects`、`vercel.json`、`netlify.toml`、`public/robots.txt` | M2 | Survey 2 | **検証完了 (VERIFIED)** |
| F6 | PWA マニフェスト & アイコン群 | `public/manifest.webmanifest`、SVG/PNG アイコン（192x192, 512x512, maskable 512, apple-touch-icon 180）、テーマカラー `#020617` | M2 | Survey 2 | **検証完了 (VERIFIED)** |
| F7 | ソーシャル & SEO メタデータ | Open Graph タグ（`og:*`）、Twitter Card（`twitter:*`）、`viewport-fit=cover`、および `index.html` 内の動的 `%BASE_URL%` 解決 | M2 | Survey 2 | **検証完了 (VERIFIED)** |
| F8 | AudioContext 自動再生アンロック | iOS Safari、iPadOS、Android Chrome、デスクトップブラウザ全般での堅牢なユーザージェスチャー連動アンロック | M3 | Survey 3 | **検証完了 (VERIFIED)** |
| F9 | マイクストリーム & タブ可視性制御 | セキュアコンテキスト検証、マイクエラー処理、ストリームトラック停止、およびバックグラウンドタブ移行時のマイク自動解放 | M3 | Survey 3 | **検証完了 (VERIFIED)** |
| F10 | 動的サンプリングレート DSP | 44.1kHz、48kHz、96kHz 異種 DAC 環境におけるリアルタイム DSP および `OfflineAudioContext` レンダリングの完全整合性 | M3 | Survey 3 | **検証完了 (VERIFIED)** |
| F11 | WAV エクスポート Blob ダウンロード | クロスデバイス対応の WAV Blob 生成および iOS Safari / Firefox 向け遅延クリーンアップ付き `<a download>` DOM 接続処理 | M3 | Survey 3 | **検証完了 (VERIFIED)** |
| F12 | 自動 CI/CD ワークフロー | 型検査（`tsc --noEmit`）、全テスト実行（650件合格）、本番ビルド、および成果物検証を行う GitHub Actions（`.github/workflows/deploy.yml`） | M4 | Survey 1 | **検証完了 (VERIFIED)** |
| F13 | ローカルプレビュー & ビルド検証 | `vite preview` および静的配信による `dist/` 本番成果物の完全性・動作検証 | M4 | Survey 1 | **検証完了 (VERIFIED)** |
| F14 | 総合デプロイ適合性監査報告書 | 包括的な日本語本番運用・デプロイマニュアル（[`docs/DEPLOYMENT_AUDIT.md`](./DEPLOYMENT_AUDIT.md)）の作成 | M5 | Survey 1, 2, 3 | **検証完了 (VERIFIED)** |
| F15 | 敵対的侵入シミュレーション & セキュリティ硬化 | 自動敵対的セキュリティテスト（`tests/security/` 61テスト）および日本語セキュリティ監査報告書（[`docs/SECURITY_HARDENING_AUDIT.md`](./SECURITY_HARDENING_AUDIT.md)） | M6 | Sec Survey | **検証完了 (VERIFIED)** |

---

## マイルストーン (Milestones)
| # | マイルストーン名 | スコープ | 依存関係 | ステータス |
|---|------|-------|:---:|:---:|
| M1 | **本番ビルド & SPA 可搬性** | `vite.config.ts` ベースパス、チャンク分割、アセット最適化、SPA 404 フォールバック | なし | **完了 (DONE)** |
| M2 | **セキュリティヘッダー、PWA & メタデータ** | `public/_headers`、`_redirects`、`vercel.json`、`netlify.toml`、`manifest.webmanifest`、`robots.txt`、PNG アイコン群、`index.html` メタデータ | M1 | **完了 (DONE)** |
| M3 | **クロスプラットフォーム音響互換性** | Web Audio ライフサイクル、自動再生アンロック、タブ可視性連動サスペンド、WAV Blob ダウンロード堅牢化 | M1 | **完了 (DONE)** |
| M4 | **CI/CD 自動化 & ビルド検証** | GitHub Actions ワークフロー（`.github/workflows/deploy.yml`）、ローカルプレビュー検証、全テスト合格検証 | M1, M2, M3 | **完了 (DONE)** |
| M5 | **デプロイ監査報告書 & 総合受入** | 包括的日本語公式マニュアル（[`docs/DEPLOYMENT_AUDIT.md`](./DEPLOYMENT_AUDIT.md)）、レビューア & 独立勝利監査官による承認 | M1, M2, M3, M4 | **完了 (DONE)** |
| M6 | **セキュリティ硬化 & 敵対的侵入監査** | 自動敵対的セキュリティテスト（`tests/security/` 61テスト）、多層防御ガードレール実装、日本語セキュリティ報告書（[`docs/SECURITY_HARDENING_AUDIT.md`](./SECURITY_HARDENING_AUDIT.md)）、Victory Auditor による承認 | M1〜M5 | **完了 (DONE)** |

---

## ドキュメント体系 (Documentation Index)
- 日本語セキュリティ侵入耐性監査報告書: [`docs/SECURITY_HARDENING_AUDIT.md`](./SECURITY_HARDENING_AUDIT.md)
- 日本語 Web デプロイ適合性マニュアル: [`docs/DEPLOYMENT_AUDIT.md`](./DEPLOYMENT_AUDIT.md)
- 日本語プロジェクト仕様書: [`docs/PROJECT_JA.md`](./PROJECT_JA.md)
- Phase 1 コードレビュー仕様書アーカイブ: [`docs/CODE_REVIEW_PROJECT_JA.md`](./CODE_REVIEW_PROJECT_JA.md)
- Phase 1 プロンプトドラフトアーカイブ: [`docs/PROMPT_DRAFT_JA.md`](./PROMPT_DRAFT_JA.md)

---

## コード構成 (Code Layout)
```
vocal-mirror/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 自動 CI/CD パイプライン
├── public/
│   ├── _headers                # Cloudflare Pages 用 HTTP セキュリティ & キャッシュヘッダー
│   ├── _redirects              # Cloudflare Pages / Netlify 用 SPA リライトルール
│   ├── 404.html                # GitHub Pages / 静的ホスト用 SPA フォールバック
│   ├── favicon.svg             # ベクターファビコン
│   ├── icon-192.png            # PWA 192x192 アイコン
│   ├── icon-512.png            # PWA 512x512 アイコン
│   ├── icon-maskable-512.png   # PWA 512x512 マスカブルアイコン
│   ├── apple-touch-icon.png    # iOS Safari 180x180 タッチアイコン
│   ├── og-image.png            # SNS 共有用 OGP バナー (1200x630)
│   ├── manifest.webmanifest    # W3C 準拠 Web App Manifest
│   └── robots.txt              # クローラー巡回設定
├── docs/
│   ├── SECURITY_HARDENING_AUDIT.md # セキュリティ侵入耐性・防御強化・フォレンジック監査報告書
│   ├── DEPLOYMENT_AUDIT.md     # Web デプロイ適合性総合監査報告書 & 本番運用マニュアル
│   ├── PROJECT_JA.md           # 本文書 (最新プロジェクト仕様書・日本語版)
│   ├── CODE_REVIEW_PROJECT_JA.md # Phase 1 コードレビュー仕様書アーカイブ
│   └── PROMPT_DRAFT_JA.md      # Phase 1 プロンプトドラフトアーカイブ
├── tests/
│   ├── security/               # 自動化敵対的セキュリティテストスイート (61テスト)
│   │   ├── client_injection_csp.test.ts
│   │   ├── binary_dsp_fuzz.test.ts
│   │   └── hardware_concurrency_abuse.test.ts
│   ├── stress/                 # 敵対的ストレス・並行性テストスイート
│   ├── unit/                   # 単体テスト (DSP, hooks, i18n, visualizer, components)
│   └── e2e/                    # E2E 統合テスト (Tier 1〜4)
├── src/
│   ├── audio/                  # Web Audio DSP エンジン、モデル、サンプル音源
│   ├── components/             # React UI コンポーネント (オシロスコープ、スペクトラム、スタジオ、モーダル)
│   ├── hooks/                  # 音響スタジオフック、AudioContext ライフサイクル
│   ├── utils/                  # WAV エンコーダ、周波数演算、音響ヘルパー
│   ├── App.tsx                 # メインアプリケーションシェル
│   └── main.tsx                # React DOM エントリーポイント
├── index.html                  # OGP, PWA, テーマ & ビューポート設定付き HTML エントリーポイント
├── vite.config.ts              # Vite 設定 (動的ベースパス, manualChunks 分割, セキュリティヘッダー)
├── vercel.json                 # Vercel デプロイ設定 (ヘッダー & リライト)
├── netlify.toml                # Netlify デプロイ設定 (ヘッダー & リダイレクト)
├── package.json
└── tsconfig.json
```
