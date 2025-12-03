# Design: Knowledge Index System

## Context

教育教材サイトにおいて、AIアシスタントが「移項について説明しているところ」「解の公式の使い方」など、セクションより細かい粒度で教材内容を参照し、直接リンクを生成する必要がある。

現状:
- `materials.yml`: 教材単位のメタデータ（タイトル、説明、カテゴリ）
- Front Matterの`toc`: セクション単位の目次
- HTML内の例題ID: `#ex-1`, `#ex-formula`など

不足:
- ルールボックス、公式説明、手法解説へのID
- 概念→アンカーの逆引きインデックス
- セマンティック検索（表記揺れ・類似概念への対応）
- リンク先で何が学べるかの情報

## Goals / Non-Goals

### Goals
- 自然言語クエリで該当箇所を検索可能にする（ベクトル検索）
- リンク先で「何が学べるか」をAIが把握できる
- 1つの概念が複数箇所で説明されている場合、すべてのlocationを取得可能
- 教材追加時にインデックスを容易に更新できる

### Non-Goals
- リアルタイムインデックス更新（ビルド時生成で十分）
- 画像・SVG内容の検索

## Decisions

### ID命名規則

| 要素タイプ | ID形式 | 例 |
|-----------|--------|-----|
| ルール/公式 | `rule-{概念名}` | `rule-quadratic-formula` |
| 手法/テクニック | `method-{手法名}` | `method-tasukigake` |
| 定義 | `def-{用語}` | `def-discriminant` |
| 例題 | `ex-{識別子}` | `ex-formula`（既存維持） |
| コツ | `tip-{番号or名前}` | `tip-common-factor` |

### アーキテクチャ: プロジェクト責任分界

```
┌─────────────────────────────────────────────────────────────┐
│                 school_asset（教材プロジェクト）              │
│                       責任: データ投入                        │
├─────────────────────────────────────────────────────────────┤
│  教材HTML  ──▶  チャンク抽出  ──▶  埋め込み生成  ──▶  DB登録   │
│     │               │                   │                    │
│     │               ▼                   ▼                    │
│     │        scripts/extract-chunks.ts                       │
│     │        knowledge_chunks.json（バックアップ）            │
│     ▼                                                        │
│  GitHub Pages で教材公開                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Supabase（共有インフラ）                  │
│                       責任: データ保管                        │
├─────────────────────────────────────────────────────────────┤
│  knowledge_chunks テーブル                                    │
│  ・id, material, anchor, title, content, learns              │
│  ・embedding (vector 1536)                                   │
│  ・search_knowledge() RPC関数                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                AI家庭教師（別プロジェクト）                    │
│                       責任: データ取得                        │
├─────────────────────────────────────────────────────────────┤
│  MCPサーバー                                                  │
│  ├─ search_knowledge: セマンティック検索                     │
│  ├─ get_chunk_by_id: ID指定取得                              │
│  └─ list_concepts: 概念一覧                                  │
│                                                              │
│  Claude Code / その他AI からアクセス                          │
└─────────────────────────────────────────────────────────────┘
```

### 責任分界表

| 責任 | プロジェクト | 成果物 |
|------|-------------|--------|
| 教材コンテンツ | school_asset | `docs/*_教材.html` |
| セマンティックID付与 | school_asset | HTMLに`id="rule-*"`追加 |
| チャンク抽出スクリプト | school_asset | `scripts/extract-chunks.ts` |
| 埋め込み生成・DB登録 | school_asset | GitHub Actions workflow |
| DBスキーマ・RPC | Supabase | `knowledge_chunks`テーブル |
| MCPサーバー | AI家庭教師 | `mcp-servers/knowledge-search/` |
| Claude Code統合 | AI家庭教師 | `.claude/settings.json` |

### チャンクデータ構造

```typescript
interface KnowledgeChunk {
  // 識別
  id: string;                    // "二次方程式の解き方_教材#rule-quadratic-formula"
  material: string;              // "二次方程式の解き方_教材"
  anchor: string;                // "rule-quadratic-formula"

  // 内容
  title: string;                 // "解の公式"
  content: string;               // 本文テキスト（HTMLタグ除去）
  learns: string[];              // ["解の公式の使い方", "a,b,cの代入方法", "ルートの計算"]

  // メタデータ
  type: "rule" | "method" | "definition" | "example" | "tip";
  category: string;              // "equations"
  level: "基礎" | "標準" | "発展";
  prerequisites: string[];       // ["平方根", "二次式の展開"]

  // 検索用
  embedding: number[];           // 1536次元ベクトル（text-embedding-3-small）
}
```

### `learns` フィールドの設計

リンク先で何が学べるかをAIが把握するための配列：

```yaml
# 例：解の公式のチャンク
learns:
  - "二次方程式 ax²+bx+c=0 の解を求める公式"
  - "係数a,b,cを公式に代入する方法"
  - "判別式が負のときは実数解なし"

# 例：移項のチャンク
learns:
  - "項を=の反対側に移動させる方法"
  - "移項すると符号が逆になるルール"
  - "+3を移項すると-3になる"
```

### ベクトルDB選定: Supabase pgvector

| 選択肢 | コスト | 特徴 |
|--------|--------|------|
| **Supabase pgvector** | 無料枠あり | PostgreSQL互換、REST API、GitHub Pages相性◎ |
| Pinecone | 有料 | 高性能だがコスト高 |
| Chroma | 無料 | ローカル向け、デプロイ複雑 |
| Weaviate | 無料枠あり | 機能豊富だが学習コスト高 |

→ **Supabase**を採用。理由：
- 無料枠で十分（500MB、50万行）
- JavaScript SDKでMCPサーバーから簡単にアクセス
- pgvectorでコサイン類似度検索が高速

### 埋め込みモデル選定

| モデル | 次元数 | コスト | 精度 |
|--------|--------|--------|------|
| **text-embedding-3-small** | 1536 | $0.02/1M tokens | 十分 |
| text-embedding-3-large | 3072 | $0.13/1M tokens | 高精度 |
| text-embedding-ada-002 | 1536 | $0.10/1M tokens | 旧モデル |

→ **text-embedding-3-small**を採用。教材数100程度なら月額数セント。

## Risks / Trade-offs

| リスク | 緩和策 |
|--------|--------|
| ID追加の手作業負担 | 生成スクリプトで既存構造から推測 |
| インデックスと実際のHTMLの乖離 | ビルド時にバリデーション実行 |
| 概念の網羅性 | 主要概念から段階的に追加 |
| OpenAI API依存 | 埋め込みはビルド時のみ、検索時はSupabase RPC |
| Supabase障害時 | 静的フォールバック（knowledge_chunks.json）を用意 |
| learnsの品質 | 初期はLLMで自動生成、後で人間がレビュー |

## Migration Plan

### Phase 1: 基盤構築
1. Supabaseプロジェクト作成、pgvector拡張有効化
2. knowledge_chunksテーブル作成
3. 類似度検索用のRPC関数作成

### Phase 2: データ投入
1. パイロット教材2つでチャンク抽出・登録
2. learns自動生成の品質確認
3. 残り教材のバッチ処理

### Phase 3: 検索API
1. MCPサーバー実装
2. Claude Code統合テスト
3. 本番デプロイ

## Open Questions

- [x] ベクトル検索を使うか？ → 採用
- [ ] learnsは人間が書くか、LLMで自動生成か？ → 初期はLLM、後でレビュー
- [ ] 複数教材にまたがる概念のランキング方法は？
- [ ] 検索結果の最大件数は？（3〜5件が妥当か）
