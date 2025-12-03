# Tasks: add-knowledge-index

> **注意**: タスク1〜3はschool_asset、タスク4はAI家庭教師プロジェクトで実施

---

## school_asset プロジェクト

### 1. HTML ID追加

- [x] 1.1 ID命名規則を確定（rule-, method-, def-, tip-）
- [x] 1.2 二次方程式の解き方_教材.htmlにIDを追加（パイロット）
  - [x] 1.2.1 零積の法則 → `id="rule-zero-product"`
  - [x] 1.2.2 因数分解パターン → `id="method-factoring-patterns"`
  - [x] 1.2.3 和と積 → `id="method-sum-product"`
  - [x] 1.2.4 たすき掛け → `id="method-tasukigake"`
  - [x] 1.2.5 平方完成 → `id="rule-completing-square"`
  - [x] 1.2.6 解の公式 → `id="rule-quadratic-formula"`
  - [x] 1.2.7 判別式 → `id="rule-discriminant"`
- [x] 1.3 一次方程式_教材.htmlにIDを追加
  - [x] 1.3.1 等式の性質 → `id="rule-equality-properties"`
  - [x] 1.3.2 移項のルール → `id="rule-transposition"`
  - [x] 1.3.3 基本ステップ → `id="method-linear-eq-steps"`
  - [x] 1.3.4 分数・小数処理 → `id="method-fraction-decimal"`
- [x] 1.4 残りの教材にIDを追加（12ファイル）

### 2. Supabase基盤構築

- [x] 2.1 Supabaseセットアップスクリプト作成 (`supabase/setup.sql`)
- [x] 2.2 pgvector拡張を有効化（スクリプトに含む）
- [x] 2.3 knowledge_chunksテーブル作成（スクリプトに含む）
  ```sql
  CREATE TABLE knowledge_chunks (
    id TEXT PRIMARY KEY,
    material TEXT NOT NULL,
    anchor TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    learns TEXT[] NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    level TEXT,
    prerequisites TEXT[],
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [x] 2.4 類似度検索RPC関数作成（`search_knowledge`）
- [x] 2.5 Row Level Security設定（読み取り専用公開）

> **Note**: Supabaseプロジェクト自体の作成は手動で行う必要があります。
> `supabase/setup.sql`をSQL Editorで実行してください。

### 3. チャンク抽出スクリプト

- [x] 3.1 `scripts/extract-chunks.ts`の基本構造を作成
- [x] 3.2 HTMLパーサー実装（jsdom使用）
  - [x] 3.2.1 ID付き要素の抽出
  - [x] 3.2.2 テキストコンテンツ取得（タグ除去）
  - [x] 3.2.3 SVG・details要素の除外
- [x] 3.3 learns自動生成（ヒューリスティック + OpenAI API対応準備）
- [x] 3.4 埋め込み生成（text-embedding-3-small）
- [x] 3.5 Supabaseへのアップロード（`--upload`オプション）
- [x] 3.6 `knowledge_chunks.json`静的エクスポート（フォールバック用）
- [x] 3.7 GitHub Actions workflow作成（`.github/workflows/update-knowledge-index.yml`）

### 成果物一覧

| ファイル | 説明 |
|---------|------|
| `supabase/setup.sql` | Supabaseセットアップ用SQLスクリプト |
| `scripts/extract-chunks.ts` | チャンク抽出・アップロードスクリプト |
| `scripts/package.json` | スクリプト用依存関係定義 |
| `.github/workflows/update-knowledge-index.yml` | 自動更新ワークフロー |
| `docs/_data/knowledge_chunks.json` | 静的エクスポート（スクリプト実行後に生成） |

### 使用方法

```bash
# 依存関係インストール
cd scripts
npm install

# チャンク抽出（JSONのみ）
npm run extract

# Supabaseにアップロード（環境変数必要）
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_KEY="xxx"
export OPENAI_API_KEY="sk-xxx"
npm run extract:upload

# ドライラン（実際にはアップロードしない）
npm run extract:dry-run
```

---

## AI家庭教師プロジェクト（別リポジトリ）

### 4. MCPサーバー実装

- [ ] 4.1 MCPサーバー雛形作成
- [ ] 4.2 ツール定義
  - [ ] 4.2.1 `search_knowledge`: セマンティック検索
  - [ ] 4.2.2 `get_chunk_by_id`: ID指定取得
  - [ ] 4.2.3 `list_concepts`: 概念一覧
- [ ] 4.3 検索結果フォーマット
  ```json
  {
    "url": "/二次方程式の解き方_教材.html#rule-quadratic-formula",
    "title": "解の公式",
    "learns": ["二次方程式の解を求める公式", "..."],
    "excerpt": "x = (-b ± √(b²-4ac)) / 2a ...",
    "similarity": 0.92
  }
  ```
- [ ] 4.4 Claude Code設定追加
- [ ] 4.5 統合テスト

---

## 依存関係

```
school_asset                          AI家庭教師
───────────────────────────────────   ─────────────────
1.2 (パイロットHTML) ✅
        │
        ▼
2.1-2.5 (Supabase) ✅ ──▶ 3.1-3.7 (抽出スクリプト) ✅
                              │
                              │ DBにデータ投入完了
                              ▼
                       ════════════════════
                              │
                              ▼
                       4.1-4.5 (MCPサーバー) 🔜
```

- ✅ タスク1（HTML ID追加）完了
- ✅ タスク2（Supabase構築）完了
- ✅ タスク3（抽出スクリプト）完了
- 🔜 タスク4はAI家庭教師プロジェクトで実施
