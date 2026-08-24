# 🎯 VocalMirror Project Constitution & Dev Guide (v0.1.0)

本ドキュメントは、VocalMirror プロジェクトにおける開発規律、コード品質基準、テスト方針、およびコマンド運用ルールを規定するプロジェクト憲法（Single Source of Truth）です。

---

## 1. プロジェクト基本情報

- **名称**: `vocal-mirror`
- **バージョン**: `0.1.0`
- **リポジトリ配置**: `Lv11_Development/vocal-mirror` (Polyrepo アーキテクチャ準拠)
- **目的**: 骨伝導・気導音の相互シミュレーションおよび音声対面現象の解消を支援する日英バイリンガル Web Audio スタジオ

---

## 2. 開発規律と品質原則 (Engineering Principles)

### 2.1 ゼロ外部依存の厳守 (Zero-Dependency i18n & DSP)
- コアな音響信号処理および多言語化（i18n）には外部巨大ライブラリ（`i18next` 等）を追加せず、標準 Web API (`Web Audio API`, `Canvas 2D`) および軽量型安全な React Context で実装すること。
- 新規 npm パッケージの追加は最小限に留め、バンドルサイズの軽量性を維持すること。

### 2.2 ゼロアロケーション描画の死守 (Zero-Allocation Rendering)
- `requestAnimationFrame` やオーディオループ内部で `new` による配列・オブジェクトの動的確保を行わないこと。すべてのバッファは初期化時に事前確保（Pre-allocation）し、ガベージコレクション（GC）による Jank を徹底排除すること。

### 2.3 辞書キー完全対称性の義務 (100% i18n Key Symmetry)
- UIテキストの追加・変更時は、必ず `src/i18n/locales/en.ts` と `src/i18n/locales/ja.ts` の両方に同一キーを追加すること。
- `npm test` 実行時に `i18nKeySync.test.ts` が自動でキーの欠落・孤立を検出し、不一致がある場合はコミットを拒否すること。

### 2.4 テスト駆動開発 (FDD+ / TDD)
- 機能追加・不具合修正時は、必ずテストコード（`tests/unit/` または `tests/e2e/`）を先行作成または同時作成し、全テスト 100% PASS を確認すること。

---

## 3. 開発コマンドリファレンス (Command Reference)

| コマンド | 説明 |
| :--- | :--- |
| `npm run dev` | 開発サーバーを起動 (`http://localhost:5173`) |
| `npm test` | 全自動テストスイートを実行 (Vitest) |
| `npm run test:watch` | テスト監視モードで起動 |
| `npm run build` | プロダクションビルドを実行 (`dist/` 出力) |
| `npm run preview` | ビルド成果物のローカルプレビュー |

---

## 4. Git 運用規律

- **コミットメッセージ**: Conventional Commits 形式に従うこと。
  - `feat: ...` (新規機能追加)
  - `fix: ...` (不具合修正)
  - `docs: ...` (ドキュメント更新)
  - `test: ...` (テストコード追加・修正)
  - `refactor: ...` (リファクタリング)
- **タグ**: リリース時はセマンティックバージョニングに基づくアノテーション付きタグを付与すること（例: `v0.1.0`）。
