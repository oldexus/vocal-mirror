# 📋 VocalMirror Project Handover Document (Version 0.1.0)

**作成日時**: 2026-08-24 09:30 JST  
**対象バージョン**: `v0.1.0` (Initial Release: Bilingual Acoustic Perception Studio)  
**プロジェクト拠点**: `Lv11_Development/media/studio/vocal-mirror`

---

## 1. エグゼクティブサマリ (Executive Summary)

VocalMirror は、「自分の声はなぜ録音と違って聞こえるのか？」という生理音響学（音声対面現象 / Voice Confrontation）のメカニズムを解明し、**「自分が聞いている声（骨伝導＋気導音）」** と **「他人に届く声（気導音のみ）」** をリアルタイムに相互シミュレート・可視化・補正する独立 Web アプリケーションです。

Version 0.1.0 では、コア DSP パイプライン、60fps Canvas 2D スペクトル差分ビジュライザー、ゼロ依存型安全 i18n（日英バイリンガル対応）、WAV バイナリエンコーダ、4つのボーカルトレーニングカードの実装と全件テスト検証が完了しています。

---

## 2. 達成済み機能一覧 (Delivered Features in v0.1.0)

| 機能エリア | 実装内容 | 主要ファイル | テスト数 |
| :--- | :--- | :--- | :---: |
| **双方向音響 DSP** | ・6段直列骨伝導フィルタカスケード (Mode B)<br>・6段直列逆位相補正カスケード (Mode C)<br>・25ms ゼロポップクロスフェード<br>・動的ヘッドルーム自動プリ減衰 (最大 -12dB)<br>・ソフトニーリミッター (Attack 2ms, Ratio 12:1)<br>・28倍音・3フォルマント合成デモ音源 | `AcousticEngine.ts`<br>`biquadMath.ts`<br>`constants.ts`<br>`sampleAudio.ts` | 84 tests |
| **Canvas 2D ビジュライザー** | ・Dual 2048 FFT Analyser 差分エネルギーリアルタイム描画<br>・20Hz〜20kHz 対数座標系 ＋ 連続 FFT ビン線形補間<br>・事前確保バッファによる 60fps ゼロアロケーション描画<br>・Retina 高DPI対応 & 動的バッジ幅クランピング<br>・周波数ホバーインスペクター ＋ VCI 指数算出 | `SpectrumVisualizerRenderer.ts`<br>`frequencyMapping.ts`<br>`SpectralGapAnalyzer.tsx` | 45 tests |
| **日英バイリンガル (i18n)** | ・ゼロ依存型安全カスタム React Context (`LanguageProvider`)<br>・`navigator.language` によるブラウザ言語自動判定<br>・ヘッダーの `[JP / EN]` 切替トグル & `localStorage` 永続化<br>・100% キー対称な完全日英マスター辞書 (`en.ts`, `ja.ts`)<br>・Canvas レンダラーへの動的 `labelFormatter` 注入 | `src/i18n/*`<br>`StudioHeader.tsx` | 51 tests |
| **UI & トランスポート** | ・MediaRecorder マイク録音 & ハードウェアストリーム確実破棄<br>・再生、一時停止、ループ、デモ音声、クリア<br>・16種物理パラメータスライダー (15ms Smoothing)<br>・4種生理学的音響プリセット<br>・キーボードショートカット (Space, R, L, E, 1, 2, 3) | `useAudioStudio.ts`<br>`AudioControls.tsx`<br>`ModeSelector.tsx`<br>`ParameterSliders.tsx`<br>`PresetSelector.tsx` | 74 tests |
| **WAV エクスポート & ガイダンス** | ・44バイト正規 RIFF/WAVE バイナリエンコーダ (16-bit / 32-bit)<br>・オフラインバッチ DSP レンダリング & メモリ自動解放<br>・音声対面現象の物理メカニズム解説<br>・4つの実践ボーカルトレーニングカード | `audioBufferToWav.ts`<br>`ExportModal.tsx`<br>`GuidanceCards.tsx`<br>`guidanceContent.ts` | 60 tests |
| **E2E & 統合テスト** | ・Tier 1: 機能テスト (60 tests)<br>・Tier 2: 境界値・耐障害テスト (51 tests)<br>・Tier 3: 組み合わせテスト (16 tests)<br>・Tier 4: シナリオテスト (5 tests) | `tests/e2e/*` | 132 tests |

---

## 3. テスト実績 & 品質指標 (Test & Quality Evidence)

```
Test Files:  20 passed (20 suites)
Tests:       414 passed (100% PASS)
Duration:    5.18s
Build:       Vite production build 0 errors, 1.11s (dist output: JS 318KB, CSS 38KB)
TypeScript:  0 compilation errors (strict mode)
```

---

## 4. 既知の注意点 & 技術的制約事項 (Known Constraints)

1. **AudioContext のユーザー操作制約**:
   - Web Audio API の仕様上、ユーザーが画面上で何らかのインタラクション（クリック、タップ、キー押下）を行うまで `AudioContext` は `suspended` 状態となります。ヘッダーのステータスバッジに「STANDBY (CLICK TO ACTIVATE)」が表示されている場合は、マイク録音やデモ音声ボタンをクリックすることで即座に `running` に遷移します。
2. **マイク権限と HTTPS**:
   - `navigator.mediaDevices.getUserMedia` は `localhost` または HTTPS 環境でのみ動作します。本番デプロイ時は HTTPS が必須です。
3. **低レイテンシ推奨環境**:
   - 最適なリアルタイム知覚フィードバックを得るため、有線ヘッドホンまたは低遅延イヤホンの使用を推奨します（Bluetooth イヤホンでは伝送遅延が 100〜200ms 付加されるため）。

---

## 5. 次期バージョン拡張ロードマップ (Roadmap for v0.2.0+)

次期開発で検討されている機能拡張の候補リストです：

- [ ] **リアルタイム・マイクスルー（Pass-Through）モード**:
  - 録音後再生だけでなく、マイク入力音をゼロレイテンシでリアルタイムに Mode B / Mode C 変換してヘッドホンに返す「リアルタイム・モニター機能」。
- [ ] **ピッチ検出 & フォルマント・トラッカー (Pitch & Formant Tracker)**:
  - 自律的な基本周波数（F0）および第1・第2フォルマント（F1, F2）の自動トラッキングと画面オーバーレイ表示。
- [ ] **ユーザーカスタム・プリセットの保存機能**:
  - 16種のスライダー設定をブラウザの `IndexedDB` または `localStorage` に名前付きで保存・共有する機能。
- [ ] **WASM 音声処理（AudioWorklet）への移行検討**:
  - より極限の低レイテンシと高度な非線形共鳴モデルを実現するための Rust/C++ WASM 統合。
- [ ] **PWA (Progressive Web App) 対応**:
  - オフライン動作およびモバイル端末へのホーム画面追加対応。
