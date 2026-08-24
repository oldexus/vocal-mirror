# チームワーク プロジェクト プロンプト [Phase 1: アーカイブ]

> [!NOTE]
> **文書の位置付け (Document Status)**:  
> 本文書は **Phase 1 (コードレビュー・セキュリティ監査 & 是正)** 実行時に発行されたマルチエージェント指示プロンプトのアーカイブです。  
> 現在の最新本番デプロイ・最適化仕様書については、[`PROJECT.md`](../PROJECT.md) および [`docs/PROJECT_JA.md`](./PROJECT_JA.md) をご参照ください。

- **ステータス**: 実行完了 (VICTORY CONFIRMED)  
- **目標**: マルチエージェントによる自律的コードレビュー、セキュリティ監査、不具合是正、および多重独立検証の完遂  
- **実行チーム**: teamwork_preview（自律マルチエージェント監査・是正チーム）

---

## 概要

VocalMirror アプリケーション（TypeScript / React / Web Audio DSP / Canvas 2D / WAV バイナリエンコーダ）に対する厳格なコードレビューおよびセキュリティ監査を実施し、是正パッチ（Code Diffs）と検証テストを含む包括的な評価報告書を作成・提示してください。

- **作業ディレクトリ**: `/Users/ash/Documents/00_GoogleDriveShare/Lv11_Development/vocal-mirror`
- **完全性モード**: development

---

## 要件 (Requirements)

### R1. アーキテクチャ・DSP数理精度・コード品質監査
- Web Audio DSP パイプライン（`src/audio/AcousticEngine.ts`, `src/utils/AcousticMath.ts`, `src/audio/biquadMath.ts`）を監査し、RBJ EQ CookBook に対する数理的正当性、フィルタ安定性（NaN、Inf、ゼロ除算の防止）、動的プリ減衰、およびクリッピング防止を検証する。
- React アーキテクチャ（`src/components/`, `src/hooks/useAudioStudio.ts`）、ステートライフサイクル、およびゼロ依存の i18n 辞書キー整合性（`src/i18n/`）を評価する。
- 60fps Canvas 2D スペクトラム描画（`src/audio/SpectrumVisualizerRenderer.ts`）を検査し、ゼロアロケーション描画性能、ガベージコレクション（GC）による一時停止、無制限な RAF ループの有無を確認する。

### R2. セキュリティ・脆弱性・メモリライフサイクル監査
- ブラウザ側音声処理、マイク権限ライフサイクル、およびバイナリ WAV エンコード（`src/utils/audioBufferToWav.ts`）を精査し、バッファオーバーフロー、境界外アクセス、メモリ枯渇（OOM）を防止する。
- DOM 操作、XSS 攻撃ベクター、SVG/HTML インジェクションリスク、および安全な `localStorage` データハンドリングを確認する。
- サプライチェーン依存関係（`package.json`, `package-lock.json`）およびビルド設定（`vite.config.ts`, `tsconfig.json`）を監査する。

### R3. 実践的是正措置 & テスト検証
- 特定されたセキュリティリスク、パフォーマンスのボトルネック、またはコードスメルに対して、具体的な是正パッチ（コード差分）と推奨テストケースを提示・適用する。
- 既存の全テストケースがリグレッションなく正常にパスすること（`npm test`）、および本番ビルドの検証（`npm run build`）を完了させる。

---

## 受入基準 (Acceptance Criteria)

### セキュリティ & 堅牢性
- [x] XSS、プロトタイプ汚染、安全でない DOM 注入、安全でない localStorage アクセスパターンの不在。
- [x] バイナリ WAV エンコーダが境界エッジケース（長さゼロ、極端なサンプリングレート、マルチチャンネル、極端な振幅）を捕捉されない例外やメモリ破損なく処理できること。
- [x] DSP 演算において NaN の伝播、ゼロ除算、または無制御な信号クリッピングが発生しないことが証明されていること。
- [x] Web Audio ノードおよびアニメーションフレームがコンポーネントのアンマウント時に適切に切断・キャンセルされること（メモリリークの不在）。

### 検証 & 成果物
- [x] テストスイートが 100% 合格すること（`npm test`：430/430 テスト全パス）。
- [x] 本番ビルドが TypeScript またはバンドルエラー 0 件で完了すること（`npm run build`）。
- [x] コード差分と推奨事項を含む、優先度別（Critical、High、Medium、Low、Info）に構造化された日本語のマークダウンレビューレポートが生成されること。
