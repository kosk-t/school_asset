# Tasks: add-knowledge-index

> **注意**: タスク1〜3はschool_asset、タスク4はAI家庭教師プロジェクトで実施

---

## school_asset プロジェクト

### 1. HTML ID追加

- [ ] 1.1 ID命名規則を確定（rule-, method-, def-, tip-）
- [ ] 1.2 二次方程式の解き方_教材.htmlにIDを追加（パイロット）
  - [ ] 1.2.1 零積の法則 → `id="rule-zero-product"`
  - [ ] 1.2.2 因数分解パターン → `id="method-factoring-patterns"`
  - [ ] 1.2.3 和と積 → `id="method-sum-product"`
  - [ ] 1.2.4 たすき掛け → `id="method-tasukigake"`
  - [ ] 1.2.5 平方完成 → `id="rule-completing-square"`
  - [ ] 1.2.6 解の公式 → `id="rule-quadratic-formula"`
  - [ ] 1.2.7 判別式 → `id="rule-discriminant"`
- [ ] 1.3 一次方程式_教材.htmlにIDを追加
  - [ ] 1.3.1 等式の性質 → `id="rule-equality-properties"`
  - [ ] 1.3.2 移項のルール → `id="rule-transposition"`
  - [ ] 1.3.3 基本ステップ → `id="method-linear-eq-steps"`
  - [ ] 1.3.4 分数・小数処理 → `id="method-fraction-decimal"`
- [ ] 1.4 残りの教材にIDを追加（12ファイル）

### 2. Supabase基盤構築

- [ ] 2.1 Supabaseプロジェクト作成
- [ ] 2.2 pgvector拡張を有効化
- [ ] 2.3 knowledge_chunksテーブル作成
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
- [ ] 2.4 類似度検索RPC関数作成
  ```sql
  CREATE FUNCTION search_knowledge(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
  ) RETURNS TABLE (...) AS $$
  ```
- [ ] 2.5 Row Level Security設定（読み取り専用公開）

### 3. チャンク抽出スクリプト

- [ ] 3.1 `scripts/extract-chunks.ts`の基本構造を作成
- [ ] 3.2 HTMLパーサー実装（cheerio使用）
  - [ ] 3.2.1 ID付き要素の抽出
  - [ ] 3.2.2 テキストコンテンツ取得（タグ除去）
  - [ ] 3.2.3 数式（KaTeX）のテキスト化
- [ ] 3.3 learns自動生成（OpenAI API）
  - [ ] 3.3.1 プロンプト設計
  - [ ] 3.3.2 バッチ処理実装
- [ ] 3.4 埋め込み生成（text-embedding-3-small）
- [ ] 3.5 Supabaseへのアップロード
- [ ] 3.6 `knowledge_chunks.json`静的エクスポート（フォールバック用）
- [ ] 3.7 GitHub Actions workflow作成（教材更新時に自動実行）

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
1.2 (パイロットHTML)
        │
        ▼
2.1-2.5 (Supabase) ──▶ 3.1-3.7 (抽出スクリプト)
                              │
                              │ DBにデータ投入完了
                              ▼
                       ════════════════════
                              │
                              ▼
                       4.1-4.5 (MCPサーバー)
```

- タスク1（HTML ID追加）とタスク2（Supabase構築）は並行作業可能
- タスク3はタスク1,2の完了後に開始
- タスク4はタスク3でDBにデータが入った後にAI家庭教師側で開始
