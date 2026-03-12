# Musubi (結び) - Programmatic Ad Platform

**Musubi** は、広告主、媒体社（パブリッシャー）、およびプラットフォーマー（管理者）を技術で結びつける、広告プラットフォームです。

---

## 🚀 クイックスタート (Developer)

### 技術スタック
- **Frontend/Backend**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: SQLite (`better-sqlite3`)
- **Charts**: Chart.js (react-chartjs-2)

### セットアップ
```bash
# 依存関係のインストール
npm install

# サンプルデータの投入 (Onboarding)
npx tsx src/scripts/seed.ts

# テストの実行
npm test

# 開発サーバーの起動 (localhost:3000)
npm run dev
```

### アーキテクチャ
- `src/app/`: App Router による画面と API (`/api`)
- `src/lib/`: DB接続などの共通ライブラリ
- `src/services/`: 報酬計算や統計集計のビジネスロジック
- `src/scripts/`: データベースの初期化・シードスクリプト

---

## 📈 広告主 / DSP (Demand-Side Platform) 機能

- **eCPM オークション**: 入札価格 × 予測CTR に基づく動的な配信優先度決定ロジック。
- **ターゲティング**: デバイス（PC/Mobile）および特定ドメインへの配信制御。
- **審査フロー**: 管理者承認後に配信が開始される安全な入稿サイクル。

---

## 💰 媒体社 / SSP (Supply-Side Platform) 機能

- **簡単統合**: 専用の `<iframe>` タグを設置するだけで即座に収益化を開始。
- **収益管理**: 透明性の高い報酬率（Revenue Share）と、最低支払い金額からの申請システム。
- **データ可視化**: サイトごとのインプレッション・クリック実績を視覚的なグラフで表示。

---

## 🛡️ プラットフォーム / Ad Exchange 機能

- **Click Validation (クリック検証)**: 重複クリックや不正トラフィックを排除し、健全なエコシステムを維持。
- **アド審査**: ネットワーク全体の品質を保つためのクリエイティブ・リンク先審査。
- **マージン最適化**: 媒体社ごとの報酬率設定機能。

---

## 🛠 今後の展望 (Roadmap)

### 短期タスク（1年以内）
- [ ] **高度な不正検知 (IVT対策)**: ボット検知ロジックの実装とIPブラックリスト管理。
- [ ] **ads.txt 自動生成**: パブリッシャー向けの認定販売者情報の提供。
- [ ] **配信先別レポート (Placement Report)**: 広告主向けのドメイン別成果分析。
- [ ] **オーバーデリバリー対策**: 広告主の残高枯渇時のロジック改善 ([Issue #27](https://github.com/yusuke0627/adnetwork/issues/27))。

### 中長期タスク
- [ ] **DMP 連携**: オーディエンスターゲティングの強化。
- [ ] **ヘッダービディング (Header Bidding)**: 複数チャネル間の並列競りロジック。

---

## 📖 参考資料
- [プログラマティック広告の基礎概念](https://gist.github.com/yusuke0627/501039cbd62635c6f7d0a245a73fcdd6)
- [戦略ロードマップ 2026](https://gemini.google.com/share/7e8b19c2956d)
