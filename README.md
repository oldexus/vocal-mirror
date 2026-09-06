# 🎙️ VocalMirror (v0.2.0 Pro)
### Acoustic Perception Calibrator & Voice Confrontation Studio (Bilingual)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvocal-mirror%2Fvocal-mirror)
[![CI/CD Pipeline](https://github.com/vocal-mirror/vocal-mirror/actions/workflows/deploy.yml/badge.svg)](https://github.com/vocal-mirror/vocal-mirror/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-683%20passed-brightgreen.svg)](tests/)

> **「なぜ録音された自分の声は、自分が普段聞いている声と違って聞こえるのか？」**  
> その生理音響学的なメカニズム（Voice Confrontation）を解明し、「自分が聞いている声（骨伝導＋気導音）」と「他人に届く声（気導音のみ）」をゼロレイテンシでリアルタイムに相互シミュレート・可視化・補正する Web アプリケーションです。

---

## 🚀 One-Click Deploy on Vercel

VocalMirror は Vercel に最適化されており、サーバーレス・ゼロコストで世界中へ即座にデプロイ可能です。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvocal-mirror%2Fvocal-mirror)

### 環境変数設定（オプション）
Vercel ダッシュボードまたは `.env.local` で設定可能です（デフォルトで安全なテストリンクとオフライン認証が動作します）：
```env
VITE_STRIPE_MONTHLY_URL=https://buy.stripe.com/test_vocalmirror_monthly
VITE_STRIPE_LIFETIME_URL=https://buy.stripe.com/test_vocalmirror_lifetime
```

---

## 💎 マネタイズ & ライセンス設計 (Monetization & Licensing)

VocalMirror は **Freemium + Pro Tier** の収益モデルを内蔵しています。

| プラン | 価格 (JPY / USD) | 提供機能 |
| :--- | :--- | :--- |
| **Free (Standard)** | 無料 | 基本生体音響プリセット、骨伝導・気導音シミュレータ、60fps Canvas スペクトラム、標準 WAV エクスポート、音声対面ガイド |
| **Pro Monthly** | **¥980** /月 ($7.99/mo) | 16種詳細生体音響スライダーの完全アンロック、カスタムプリセット無制限保存、32-bit Float 96kHz スタジオWAVエクスポート、プリセット JSON インポート/エクスポート |
| **Pro Lifetime** | **¥4,980** 買い切り ($39.00) | Pro の全機能への永久アクセス権、将来のアップデート権限、オフラインライセンスキー発行 |

### 即時レビュアー・デモ機能
UI 右上の「Upgrade to Pro」ボタンから開くモーダル内で、「⚡ Instant Demo Unlock」をクリックするか、ライセンスキー `VOCALMIRROR-PRO-DEMO` を入力することで、決済不要で Pro 機能を瞬時に試用・検証できます。

---

## 🌟 主な機能 (Key Features)

1. **双方向音響 DSP エンジン (Bidirectional Acoustic DSP)**
   - **Mode A: 気導音 (Air Conduction)** — マイクで録音された客観的な「他人に届く声」。
   - **Mode B: 骨伝導シミュレーション (Internal Bone Conduction)** — 下顎骨・頭蓋骨・副鼻腔の低域共鳴（50〜300Hz）および軟部組織の高域吸収（4kHz以上）を付加した「自分が聞いている声」。
   - **Mode C: 逆補正音声 (Compensated Voice)** — 骨伝導で補われていた共鳴を気導音上で補正し、他人に豊かな響きを届けるための発声ターゲット音。
   - **25ms クロスフェード** によるクリックノイズのないシームレスなモード切替。
   - **動的ヘッドルーム自動プリ減衰** ＋ **ソフトニーリミッター** によるクリッピング完全防止。

2. **60fps ゼロアロケーション・スペクトラル・ギャップ・アナライザー**
   - Dual 2048 FFT Analyser による骨伝導・気導音の差分エネルギーリアルタイム可視化。
   - 20Hz〜20kHz 対数座標系 ＋ 連続 FFT ビン線形補間。
   - 3つの表示モード（重畳表示 / 差分曲線 / ギャップ強調）。
   - 周波数ホバーインスペクター ＋ VCI（Voice Confrontation Index: 音声対面指数）算出。
   - 高DPI Retina 対応、Canvas 2D バッジの動的幅クランプ。

3. **生体音響パラメータ & プリセット**
   - 16種の物理音響パラメータスライダー（胸声共鳴、下顎骨Q、副鼻腔ゲイン、組織吸収等）を 15ms スムージングでリアルタイム操作。
   - 4つの生理学的プリセット（自然標準、深胸部・下顎、高頭蓋・鼻腔、最大対面）。
   - Pro ユーザー向けカスタムプリセット保存 & JSON エクスポート/インポート。

4. **🌐 日英バイリンガル多言語対応 (Zero-Dependency i18n)**
   - ブラウザ言語自動判定（日本語環境 ➔ 日本語、その他 ➔ 英語）。
   - ヘッダーの `[JP / EN]` ボタンで一瞬で言語切替（`localStorage` 永続化）。
   - UI、16種スライダー解説、ガイダンス、Canvas バッジ、エラーメッセージの全面フルローカライズ。

5. **WAV バイナリエンコーダ & エクスポート**
   - ゼロ依存 44 バイト正規 RIFF/WAVE エンコーダ（16-bit PCM / 32-bit Float）。
   - オフラインバッチ DSP レンダリングによる高品質 WAV ダウンロード。
   - 4GB+ WAV チャンクオーバーフロー保護ガード内蔵。

6. **包括的セキュリティ防壁 (Adversarial Hardening)**
   - DOM XSS 防止サニタイズ。
   - Prototype Pollution 防御。
   - ハードウェア並行アクセス（マイクの連続切替やバックグラウンド移行）に対する安全なクリーンアップステートマシン。
   - CSP (Content Security Policy) および Permissions-Policy で Stripe / Web Audio のみ許可し情報漏洩を遮断。

---

## 🛠️ 技術スタック (Tech Stack)

| レイヤー | 技術 |
| :--- | :--- |
| **フロントエンド** | React 18, TypeScript, Tailwind CSS, Lucide React, Vite |
| **音響 DSP** | Web Audio API (`AudioContext`, `BiquadFilterNode`, `DynamicsCompressorNode`, `AnalyserNode`) |
| **ビジュライザー** | HTML5 Canvas 2D (Zero-Allocation TypedArray Buffers, 60fps `requestAnimationFrame`) |
| **多言語化** | カスタム型安全 React Context (`useTranslation`, 外部依存ゼロ) |
| **決済・ライセンス** | Stripe Checkout (Embedded/Redirect), HMAC オフラインライセンスマネージャー |
| **テスト & 品質** | Vitest 1.6, JSDOM (全 33 テストファイル・683 テスト 100% PASS) |
| **インフラ** | Vercel (`vercel.json`), Cloudflare Pages (`public/_headers`), GitHub Actions CI/CD |

---

## 🚀 ローカル開発 (Local Development)

### 動作環境
- Node.js >= 18.0.0
- モダンブラウザ（Chrome, Edge, Safari, Firefox: Web Audio API & MediaRecorder 対応環境）

### インストール & 起動

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:5173/` を開いてください。

### ビルド & テスト

```bash
# 型チェック
npm run typecheck

# 全自動テストスイートの実行 (683 tests)
npm test

# プロダクションビルド
npm run build

# ビルド成果物のプレビュー
npm run preview
```

---

## ⌨️ キーボードショートカット (Shortcuts)

| キー | 動作 |
| :---: | :--- |
| `Space` | 音声の再生 / 一時停止 |
| `R` | マイク録音の開始 / 停止 |
| `L` | ループ再生の ON / OFF |
| `1` | Mode A (他人が聞く声: 気導音) に切替 |
| `2` | Mode B (自分が聞いている声: 骨伝導) に切替 |
| `3` | Mode C (他人に届けるための声: 逆補正) に切替 |
| `E` | WAV エクスポートダイアログを開く |
| `Escape` | モーダルを閉じる |

---

## 📜 ライセンス (License)

MIT License — Copyright (c) VocalMirror Core Team
