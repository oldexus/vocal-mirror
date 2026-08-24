# プロジェクト仕様書 [Phase 1: アーカイブ]: VocalMirror コードレビュー・セキュリティ監査 & 是正

> [!NOTE]
> **文書の位置付け (Document Status)**:  
> 本文書は **Phase 1 (コードレビュー・セキュリティ監査 & 是正)** 完了時点の仕様書アーカイブです。  
> 現在の最新本番デプロイ・最適化仕様書については、[`PROJECT.md`](../PROJECT.md) および [`docs/PROJECT_JA.md`](./PROJECT_JA.md) をご参照ください。

---

## アーキテクチャ (Architecture)
VocalMirror は、React 18、TypeScript（Strict モード）、および Canvas 2D で構築された、高精度なクライアントサイド Web Audio DSP 音響シミュレータ、スペクトルギャップ視覚化、および 16-bit / 32-bit バイナリ WAV エクスポータです。

```
[マイク / 音声入力]
         │
         ▼
[AcousticEngine.ts] (Web Audio API DSP グラフ)
   ├── Mode A (RAW): パススルー（生音声）
   ├── Mode B (INTERNAL_SIM): 6段 前方向シミュレーション
   │     (PreGain → LowShelf → 下顎骨共鳴Peak → 副鼻腔共鳴Peak → 反共鳴Notch → 組織透過LP → HighShelf → Makeup)
   └── Mode C (COMPENSATED): 7段 逆方向骨導音補正
         (PreGain → HighPass → LowShelf Cut → 下顎骨Dip → 副鼻腔Dip → プレゼンスBoost → HighShelf Air → Makeup)
         │
         ▼
[DynamicsCompressorNode] (Brickwall リミッター, -3dBFS, 12:1 レシオ)
         │
         ├───► [SpectrumVisualizerRenderer.ts] (60fps Canvas 2D 対数FFT, ゼロアロケーション)
         ├───► [AudioDestinationNode] (スピーカー / ヘッドフォン)
         └───► [audioBufferToWav.ts] (RIFF/WAVE バイナリ PCM16/Float32 エクスポータ)
```

## 機能一覧 (Feature Inventory)
| # | 機能名 | 説明 | マイルストーン | ステータス | 要件元 |
|---|---------|-------------|:---:|:---:|:---:|
| 1 | RBJ Biquad 演算 | デジタル双2次フィルタおよび RBJ EQ Cookbook の実装 (`biquadMath.ts`) | M1 | **完了 (DONE)** | ORIGINAL_REQUEST §R1 |
| 2 | 動的プリ減衰 & リミッティング | 累積ブーストエネルギー計算およびコンプレッサーリミッティング | M1 | **完了 (DONE)** | ORIGINAL_REQUEST §R1 |
| 3 | AudioContext ライフサイクル | 適切な初期化、サスペンド、および破棄処理 (`ctx.close()`) | M1 | **完了 (DONE)** | ORIGINAL_REQUEST §R1, R2 |
| 4 | 多言語辞書 & キー同期 | 日英の対訳整合性、ゼロ依存翻訳、UIキーの完全同期 | M1 | **完了 (DONE)** | ORIGINAL_REQUEST §R1 |
| 5 | Canvas 2D スペクトラム視覚化 | 60fps 対数スケール FFT 描画、ゼロアロケーション RAF ループ | M1 | **完了 (DONE)** | ORIGINAL_REQUEST §R1 |
| 6 | バイナリ WAV エンコード & 境界防御 | 44バイト RIFF ヘッダー、PCM16/Float32 変換、32-bit 4GB チャンク上限防御 | M2 | **完了 (DONE)** | ORIGINAL_REQUEST §R2 |
| 7 | マイクストリームのライフサイクル | 初期化エラー時およびアンマウント時の MediaStreamTrack クリーンアップ | M2 | **完了 (DONE)** | ORIGINAL_REQUEST §R2 |
| 8 | DOM & XSS 防御 | dangerouslySetInnerHTML ゼロ、安全な localStorage 処理、プロトタイプ汚染防御 | M2 | **完了 (DONE)** | ORIGINAL_REQUEST §R2 |
| 9 | TypeScript 厳格型コンパイル | 176行の型エラー完全解消、`tsc --noEmit` のビルドパイプライン統合 | M2 | **完了 (DONE)** | ORIGINAL_REQUEST §R2, R3 |
| 10 | サプライチェーン & ビルド構成 | パッケージ監査、Vite/Vitest 設定、クリーンビルドの検証 | M2 | **完了 (DONE)** | ORIGINAL_REQUEST §R2, R3 |
| 11 | 全テストスイートの実行 | 414+ 件のテストケースがリグレッションゼロで 100% パス（430テスト全合格） | M3 | **完了 (DONE)** | ORIGINAL_REQUEST §R3 |
| 12 | 本番ビルドのエラーゼロ | TypeScript およびバンドルエラーなしで本番バンドル生成（0エラー） | M3 | **完了 (DONE)** | ORIGINAL_REQUEST §R3 |
| 13 | 包括的監査報告書 | Critical〜Info に分類・構造化された日本語マークダウン報告書 | M3 | **完了 (DONE)** | ORIGINAL_REQUEST §R3 |

## マイルストーン (Milestones)
| # | マイルストーン名 | スコープ | 依存関係 | ステータス |
|---|------|-------|:---:|:---:|
| 1 | **M1: DSP精度、音声ライフサイクル & UI/i18n 是正** | RBJ High-Shelf $b_2$ 符号反転の修正、`AcousticEngine.destroy()` での AudioContext クローズ、masterGain ステージングの分離、ヘルプモーダルの i18n キー同期、翻訳辞書型の同期、Canvas GC 最適化。 | なし | **完了 (DONE)** |
| 2 | **M2: セキュリティ、WAV バイナリ堅牢性、マイクライフサイクル & 型完全性** | `audioBufferToWav.ts` における 32-bit RIFF チャンクサイズ上限（4GB）ガード & AudioBuffer 検証の実装、`useAudioStudio.ts` でのエラー時マイク解放、全 TypeScript コンパイルエラーの解消、`package.json` ビルドスクリプトの更新。 | M1 | **完了 (DONE)** |
| 3 | **M3: 包括的検証（テスト & ビルド）& 最終マスター監査報告書** | 全 430 件のテストスイート実行（`npm test`）、`npm run build` および `tsc --noEmit` の検証、Challenger による敵対的ストレステストと Forensic Integrity 監査の実施、日本語マスター監査報告書の作成。 | M1, M2 | **完了 (DONE)** |

## インターフェース規約 (Interface Contracts)
### AcousticMath / biquadMath ↔ AcousticEngine
- `computeBiquadCoefficients(type, f0, Fs, Q, gainDb)` は $a_0$ で正規化された `{ b0, b1, b2, a0, a1, a2 }` を返却。
- High-Shelf 公式: $b_2 = A \cdot [(A+1) + (A-1)\cos(\omega_0) - 2\sqrt{A}\alpha]$
- 数理的保証: すべての係数が厳密に有限数であり、周波数は $< F_s/2$、Q値は $> 0.0001$ に安全クランプされる。

### audioBufferToWav ↔ ExportModal
- `audioBufferToWav(buffer: AudioBuffer, options?: WavExportOptions): ArrayBuffer`
- 入力検証: `numberOfChannels >= 1`, `sampleRate > 0`, `length >= 0`
- 範囲検証: `dataSize <= 0xFFFFFFFF - 36`（超過時は `RangeError` をスロー）

### TranslationDictionary ↔ UI コンポーネント
- `t(key: string, params?: Record<string, string | number>): string`
- `App.tsx` ヘルプモーダルのキーパス: `help.sections.transport`, `help.shortcuts.playPause`, `help.shortcuts.recordStop`, `help.shortcuts.toggleLoop`, `help.shortcuts.help`, `help.sections.listening`, `help.shortcuts.modeA`, `help.shortcuts.modeB`, `help.shortcuts.modeC`, `help.tip.text`

## コード構成 (Code Layout)
- `src/audio/`: Web Audio DSP グラフ、Biquad フィルタ数理、音響定数
- `src/utils/`: バイナリ WAV エンコーダ、対数周波数マッピング、VCI 計算
- `src/hooks/`: React 音声スタジオカスタムフック (`useAudioStudio.ts`)
- `src/components/`: モジュール化された React UI コンポーネント、視覚化、モーダル
- `src/i18n/`: ゼロ依存の翻訳コンテキスト、英語・日本語辞書マスター
- `tests/`: 高精度 Web Audio モック、単体テスト、多層 E2E テスト（Tier 1〜4）、高負荷ストレステスト
