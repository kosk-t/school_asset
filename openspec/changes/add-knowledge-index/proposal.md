# Proposal: add-knowledge-index

## Why

現在、AIが教材内の特定の概念・公式・解法へリンクを生成する手段がない。「解の公式で解く方法」のような細かい粒度の情報へ直接ナビゲートできるメタデータ基盤が必要。

## What Changes

1. **HTML側のID追加**: 既存教材のrule-box、tip-box、概念説明にセマンティックなIDを付与
2. **知識インデックス作成**: `docs/_data/knowledge_index.yml`で概念→アンカーのマッピングを定義
3. **インデックス生成スクリプト**: 教材HTMLから概念を抽出しインデックスを生成する自動化ツール
4. **AI参照インターフェース**: MCPサーバーまたは静的JSONでAIがインデックスを検索可能にする

## Impact

- Affected specs: knowledge-index（新規）
- Affected code:
  - `docs/*_教材.html`（ID追加）
  - `docs/_data/knowledge_index.yml`（新規）
  - `scripts/generate-knowledge-index.js`（新規）
  - MCP設定または静的JSON出力
