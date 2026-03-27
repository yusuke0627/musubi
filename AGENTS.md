# Musubi (結び) - AI Coding Agent Guide

このドキュメントは、AIコーディングエージェントがMusubiプロジェクトを効率的に開発・保守するためのガイドです。

---

## プロジェクト概要

**Musubi（結び）** は、広告主（Advertiser）、媒体社（Publisher）、およびプラットフォーマー（管理者）を技術で結びつける、プログラマティック広告プラットフォームです。

### 主要機能
- **DSP機能（広告主向け）**: eCPMオークション、ターゲティング（デバイス/OS）、審査フロー
- **SSP機能（媒体社向け）**: `<iframe>`タグによる簡単統合、収益管理、データ可視化
- **Ad Exchange機能（管理者向け）**: クリック検証（IVT）、アド審査、報酬率設定

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16.2.1 (App Router) |
| 言語 | TypeScript 5.x |
| スタイリング | Tailwind CSS v4.2.2 |
| データベース | SQLite (better-sqlite3 + Prisma) |
| 認証 | NextAuth.js v5 (Beta) |
| グラフ | Chart.js + react-chartjs-2 |
| テーブル | @tanstack/react-table |
| バリデーション | Zod |
| テスト | Vitest + @testing-library/react + jsdom |
| コンパイラ | babel-plugin-react-compiler |

---

## プロジェクト構造

```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── ads.txt/       # ads.txt自動生成
│   │   │   ├── auth/          # NextAuth認証エンドポイント
│   │   │   ├── click/         # クリック計測
│   │   │   ├── impression/    # インプレッション計測
│   │   │   ├── inspect/       # コンバージョントラッキング
│   │   │   ├── serve/         # 広告配信API
│   │   │   └── track/         # トラッキングピクセル
│   │   ├── admin/             # 管理者ダッシュボード
│   │   ├── advertiser/[id]/   # 広告主ダッシュボード
│   │   ├── publisher/[id]/    # 媒体社ダッシュボード
│   │   ├── login/             # ログインページ
│   │   ├── 403/               # アクセス拒否ページ
│   │   ├── layout.tsx         # ルートレイアウト
│   │   ├── page.tsx           # トップページ
│   │   └── globals.css        # グローバルスタイル
│   ├── components/            # Reactコンポーネント
│   ├── lib/                   # 共通ライブラリ
│   │   ├── db.ts              # Prismaクライアント
│   │   ├── test-utils.ts      # テストユーティリティ
│   │   └── userAgent.ts       # UA解析ユーティリティ
│   ├── services/              # ビジネスロジック
│   │   ├── billing.ts         # 課金・報酬計算
│   │   ├── ivt.ts             # 不正クリック検知
│   │   ├── stats.ts           # 統計データ集計
│   │   └── insights.ts        # インサイト分析
│   ├── scripts/               # スクリプト
│   │   └── seed.ts            # データベース初期化
│   ├── test/                  # テスト設定
│   │   └── setup.ts           # Vitestセットアップ
│   ├── auth.ts                # NextAuth設定
│   ├── auth.config.ts         # NextAuthミドルウェア設定
│   └── middleware.ts          # Next.jsミドルウェア
├── prisma/
│   ├── schema.prisma          # Prismaスキーマ
│   ├── migrations/            # マイグレーション
│   └── *.db                   # SQLiteデータベース
├── public/                    # 静的ファイル
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── eslint.config.mjs
└── postcss.config.mjs
```

---

## データベーススキーマ（Prisma）

主要なエンティティ:

- **Advertiser** (広告主): キャンペーン、残高管理
- **Publisher** (媒体社): アプリ管理、収益管理
- **App**: 媒体社のWebサイト/モバイルアプリ
- **AdUnit**: アプリ内の広告枠
- **Campaign** (キャンペーン): 予算・期間管理
- **AdGroup** (広告グループ): 入札単位、ターゲティング設定
- **Ad** (広告クリエイティブ): タイトル、画像、リンク先
- **Impression** (インプレッション): 広告表示ログ
- **Click** (クリック): クリックログ、IVT判定結果
- **Conversion** (コンバージョン): 成果計測
- **ConversionRule**: CV計測ルール
- **User**: 認証ユーザー（admin/advertiser/publisher）
- **Payout**: 支払い申請

---

## 開発コマンド

```bash
# 開発サーバー起動 (localhost:3000)
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# リント
npm run lint

# データベースシード（サンプルデータ投入）
npm run db:seed
# または
npx tsx src/scripts/seed.ts

# テスト
npm test                    # 単発実行
npm run test:watch          # ウォッチモード
npm run test:coverage       # カバレッジ付き

# TypeScriptコンパイルチェック
npx tsc --noEmit
```

---

## コードスタイルガイドライン

### 命名規則
- **コンポーネント**: PascalCase (例: `AdCreative.tsx`)
- **関数/変数**: camelCase (例: `getDailyStats`)
- **データベース**: スネークケース (Prismaで自動マッピング)
- **API Routes**: 関数名はHTTPメソッド (例: `GET`, `POST`)

### インポート順序
1. 組み込みモジュール
2. サードパーティライブラリ
3. 内部モジュール（`@/`エイリアス）
4. 相対パス

### TypeScript
- `strict: true` で厳格な型チェック
- 型推論を活用し、過度な型注釈は避ける
- `any` の使用は最小限に

### コメント
- 日本語または英語で記述（プロジェクト内では混在）
- 複雑なビジネスロジックには説明コメントを追加
- 絵文字を使用したコメントも歓迎 💰✨

---

## テストガイドライン

### テストフレームワーク
- **Vitest**: テストランナー
- **@testing-library/react**: Reactコンポーネントテスト
- **jsdom**: ブラウザ環境シミュレーション

### テストファイル配置
- 対象ファイルと同じディレクトリに `.test.ts` または `.test.tsx` を配置
- 例: `route.ts` → `route.test.ts`

### テストパターン
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '@/lib/db';
import { clearDatabase } from '@/lib/test-utils';

describe('Feature Name', () => {
  beforeEach(async () => {
    await clearDatabase();
    // テストデータセットアップ
  });

  it('should do something', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### テストユーティリティ
- `clearDatabase()`: 各テスト前にデータベースをクリーンアップ
- Prismaクライアントは `src/lib/db.ts` からインポート

---

## 主要機能の実装詳細

### 1. 広告配信フロー (`/api/serve`)
- eCPM（期待収益）に基づくRTB（Real-Time Bidding）
- スコア計算: `max_bid * (valid_clicks + 1) / (impressions + 100)`
- ターゲティング: OS、デバイス、カテゴリ、スケジュール

### 2. クリック検証（IVT）
実装: `src/services/ivt.ts`
- **Bot検知**: User-Agentパターンマッチング
- **レート制限**: 同一IPから1時間あたり50クリックまで
- **重複検知**: 同一ad_id + IPで10秒以内のクリックを無効化
- **早すぎるクリック**: インプレッションから1秒以内のクリックを無効化

### 3. 課金・報酬計算 (`src/services/billing.ts`)
- クリックごとに広告主残高を減算
- 媒体社に報酬を加算（rev_share比率に基づく）
- キャンペーン予算チェック（total + daily）

---

## 環境変数

```bash
# .env
DATABASE_URL="file:./adnetwork.db"
```

### ログイン用サンプルアカウント（シード後）
- 管理者: `admin@adnetwork.local` / `password123`
- 広告主: `adv1@example.com` ~ `adv3@example.com` / `password123`
- 媒体社: `pub1@example.com` ~ `pub3@example.com` / `password123`

---

## セキュリティ考慮事項

1. **XSS対策**: `renderToStaticMarkup` による自動エスケープ
2. **認証**: NextAuth.jsによるセッション管理
3. **認可**: ミドルウェアでのルート保護（role-based）
4. **SQLインjection**: Prisma ORMによるパラメータ化クエリ
5. **IVT対策**: 多層的な不正クリック検知システム

---

## 依存関係の管理

- Dependabot: 週一回（月曜日10:00 JST）にnpmパッケージ更新PRを作成
- 設定: `.github/dependabot.yml`
- open-pull-requests-limit: 5

---

## 開発Tips

### データベース確認
```bash
# SQLite CLIで直接確認
sqlite3 adnetwork.db "SELECT * FROM campaigns LIMIT 5;"
```

### デバッグ
- サーバーサイド: `console.log` で開発サーバーのターミナルに出力
- クライアントサイド: ブラウザのDevToolsで確認

### Prismaスキーマ変更時
```bash
# マイグレーション作成
npx prisma migrate dev --name <migration_name>

# Prisma Client再生成
npx prisma generate
```

---

## 参考リンク

- [プログラマティック広告の基礎概念](https://gist.github.com/yusuke0627/501039cbd62635c6f7d0a245a73fcdd6)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
