# 🎙️ VocalMirror (v0.1.0)
### Acoustic Perception Calibrator & Voice Confrontation Studio (Bilingual)

> **「なぜ録音された自分の声は、自分が普段聞いている声と違って聞こえるのか？」**  
> その生理音響学的なメカニズムを解明し、「自分が聞いている声（骨伝導＋気導音）」と「他人に届く声（気導音のみ）」をリアルタイムに相互シミュレート・可視化・補正する Web アプリケーションです。

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

4. **🌐 日英バイリンガル多言語対応 (Zero-Dependency i18n)**
   - ブラウザ言語自動判定（日本語環境 ➔ 日本語、その他 ➔ 英語）。
   - ヘッダーの `[JP / EN]` ボタンで一瞬で言語切替（`localStorage` 永続化）。
   - UI、16種スライダー解説、ガイダンス、Canvas バッジ、エラーメッセージの全面フルローカライズ。

5. **WAV バイナリエンコーダ & エクスポート**
   - ゼロ依存 44 バイト正規 RIFF/WAVE エンコーダ（16-bit PCM / 32-bit Float）。
   - オフラインバッチ DSP レンダリングによる高品質 WAV ダウンロード。

6. **4つの実践ボーカルトレーニングカード**
   - 音声対面現象の物理メカニズム解説。
   - ハミング共鳴、マスク配置、シンガーズフォルマント（3kHz Ring）、マイク近接効果（Proximity Effect）の実践エクササイズ。

---

## 🛠️ 技術スタック (Tech Stack)

| レイヤー | 技術 |
| :--- | :--- |
| **フロントエンド** | React 18, TypeScript, Tailwind CSS, Lucide React, Vite |
| **音響 DSP** | Web Audio API (`AudioContext`, `BiquadFilterNode`, `DynamicsCompressorNode`, `AnalyserNode`) |
| **ビジュライザー** | HTML5 Canvas 2D (Zero-Allocation TypedArray Buffers, 60fps `requestAnimationFrame`) |
| **多言語化** | カスタム型安全 React Context (`useTranslation`, 外部依存ゼロ) |
| **テスト & 品質** | Vitest 1.6, JSDOM (全 20 テストスイート・414 テスト 100% PASS) |

---

## 🚀 クイックスタート (Quick Start)

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
# 全自動テストスイートの実行 (414 tests)
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

---

## 📁 ディレクトリ構造 (Folder Structure)

```
vocal-mirror/
├── docs/                        # プロジェクト仕様書・アーキテクチャ・引き継ぎ書
│   ├── ARCHITECTURE.md          # 音響DSP・Canvas・i18n詳細技術仕様書
│   └── HANDOVER.md              # Version 0.1 引き継ぎ書 & ロードマップ
├── src/
│   ├── audio/                   # Web Audio API DSP エンジン & 音響定数
│   │   ├── AcousticEngine.ts    # 6段直列骨伝導 & 逆補正 DSP コア
│   │   ├── biquadMath.ts        # RBJ Cookbook 準拠のフィルタ係数計算
│   │   ├── constants.ts         # 生体音響パラメータ定義 & プリセット
│   │   ├── sampleAudio.ts       # 28倍音・3フォルマント内蔵デモ音声
│   │   └── SpectrumVisualizerRenderer.ts # 60fps ゼロアロケーション Canvas レンダラー
│   ├── components/              # React UI コンポーネント群
│   │   ├── AudioControls.tsx    # 録音・再生トランスポート
│   │   ├── ExportModal.tsx      # WAV エクスポートモーダル
│   │   ├── GuidanceCards.tsx    # ボーカルトレーニングカード
│   │   ├── ModeSelector.tsx     # A/B/C モード切替
│   │   ├── ParameterSliders.tsx # 16種音響スライダー
│   │   ├── PresetSelector.tsx   # 4種生体プリセット
│   │   ├── SpectralGapAnalyzer.tsx # スペクトルアナライザーコンポーネント
│   │   └── StudioHeader.tsx     # ヘッダー & JP/EN 言語切替トグル
│   ├── constants/               # ガイダンスコンテンツデータ
│   │   └── guidanceContent.ts   # 音声対面現象の解剖生理学データ
│   ├── hooks/                   # カスタムフック
│   │   └── useAudioStudio.ts    # AudioContext & 録音再生ステートマシン
│   ├── i18n/                    # ゼロ依存型安全多言語化コア
│   │   ├── locales/
│   │   │   ├── en.ts            # 英語マスター辞書
│   │   │   └── ja.ts            # 日本語マスター辞書
│   │   ├── interpolate.ts       # テンプレート変数置換ロジック
│   │   ├── LanguageContext.tsx  # 言語プロバイダー & useTranslation フック
│   │   ├── types.ts             # 厳格な翻訳辞書型定義
│   │   └── index.ts             # バレルエクスポート
│   ├── types/                   # 共通 TypeScript 型定義
│   │   └── audio.ts             # 音響・モード・パラメータ型
│   ├── utils/                   # ユーティリティ
│   │   ├── audioBufferToWav.ts  # 44バイト RIFF/WAVE バイナリエンコーダ
│   │   └── frequencyMapping.ts  # 対数周波数マッピング & FFT ビン補間
│   ├── App.tsx                  # メインアプリケーション
│   ├── index.css                # Tailwind CSS & カスタムアニメーション
│   └── main.tsx                 # エントリーポイント
├── tests/                       # 包括的テストスイート (414 tests)
│   ├── unit/                    # 単体テスト (DSP, UI, i18n, Visualizer, Export)
│   └── e2e/                     # シナリオ・結合テスト (Tier 1〜4)
├── package.json                 # v0.1.0 設定
├── tsconfig.json                # TypeScript 設定
├── vite.config.ts               # Vite 設定
└── vitest.config.ts             # Vitest 設定
```

---

## 📜 ライセンス (License)

Private & Proprietary — Antigravity Jarvis System (`Lv11_Development`)
