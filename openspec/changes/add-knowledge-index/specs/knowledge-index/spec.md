# Spec: Knowledge Index

教材内の概念・公式・解法をベクトル検索し、直接リンクと学習内容を取得するためのRAGシステム。

## ADDED Requirements

### Requirement: Semantic HTML IDs

教材HTML内のルールボックス、公式説明、手法解説には、検索可能なセマンティックIDが付与されていなければならない（SHALL）。

#### Scenario: ルールボックスにIDが付与されている
- **WHEN** 教材HTMLに公式説明のrule-boxがある
- **THEN** そのrule-boxには`id="rule-{概念名}"`形式のIDが付与されている

#### Scenario: 複数の要素タイプに対応
- **WHEN** 教材に手法説明（method）、定義（def）、コツ（tip）がある
- **THEN** それぞれ`method-*`、`def-*`、`tip-*`形式のIDが付与されている

---

### Requirement: Knowledge Chunks Storage

Supabase pgvectorにチャンクデータが保存されていなければならない（SHALL）。

#### Scenario: チャンクの必須フィールド
- **WHEN** チャンクがDBに保存される
- **THEN** 以下のフィールドを持つ:
  - `id`: 一意識別子（material#anchor形式）
  - `material`: 教材スラッグ
  - `anchor`: HTMLアンカーID
  - `title`: 概念名
  - `content`: 本文テキスト
  - `learns`: 学べる内容の配列
  - `type`: rule | method | definition | example | tip
  - `embedding`: 1536次元ベクトル

#### Scenario: 学べる内容（learns）の記述
- **WHEN** チャンクにlearnsフィールドがある
- **THEN** 3〜5個の具体的な学習項目が含まれる
- **AND** 各項目は「〜する方法」「〜のルール」「〜の計算」など行動指向の記述

---

### Requirement: Vector Search

AIは自然言語クエリでチャンクをセマンティック検索できなければならない（SHALL）。

#### Scenario: 類似概念の検索
- **WHEN** AIが「二次方程式を公式で解きたい」と検索する
- **THEN** 「解の公式」のチャンクが高い類似度で返される
- **AND** 類似度スコアが含まれる

#### Scenario: 表記揺れへの対応
- **WHEN** AIが「たすきがけ」（ひらがな）で検索する
- **THEN** 「たすき掛け」のチャンクがヒットする

#### Scenario: 複数結果のランキング
- **WHEN** 検索クエリに複数のチャンクがマッチする
- **THEN** 類似度順にソートされて返される
- **AND** デフォルトで上位5件が返される

---

### Requirement: Learning Content Retrieval

検索結果にはリンク先で学べる内容が含まれなければならない（SHALL）。

#### Scenario: 検索結果のフォーマット
- **WHEN** 検索結果が返される
- **THEN** 以下の情報が含まれる:
  - `url`: 完全なリンクURL（アンカー付き）
  - `title`: 概念名
  - `learns`: 学べる内容の配列
  - `excerpt`: 本文の抜粋（100文字程度）
  - `similarity`: 類似度スコア（0-1）

#### Scenario: AIが学習内容を説明できる
- **WHEN** AIが検索結果を受け取る
- **THEN** 「このリンクでは〜が学べます」と説明できる

---

### Requirement: Link Generation

検索結果から完全なURLリンクを生成できなければならない（SHALL）。

#### Scenario: アンカー付きリンク生成
- **WHEN** チャンク `{material: "二次方程式の解き方_教材", anchor: "rule-quadratic-formula"}` がある
- **THEN** `/二次方程式の解き方_教材.html#rule-quadratic-formula` 形式のリンクが生成される

#### Scenario: baseURL対応
- **WHEN** GitHub Pages環境（baseurl: /school_asset）で動作する
- **THEN** `/school_asset/二次方程式の解き方_教材.html#rule-quadratic-formula` 形式になる

---

### Requirement: MCP Server Integration

Claude CodeからMCPサーバー経由で検索できなければならない（SHALL）。

#### Scenario: search_knowledgeツール
- **WHEN** AIが`search_knowledge`ツールを呼び出す
- **THEN** クエリ文字列でベクトル検索が実行される
- **AND** 上位N件の結果が返される

#### Scenario: get_chunk_by_idツール
- **WHEN** AIが特定のチャンクIDを指定して`get_chunk_by_id`を呼び出す
- **THEN** そのチャンクの詳細情報が返される

---

### Requirement: Index Validation

HTMLのIDとDBの整合性を検証できなければならない（SHALL）。

#### Scenario: 存在しないアンカーの検出
- **WHEN** DBに登録されたアンカーがHTMLに存在しない
- **THEN** バリデーションエラーが報告される

#### Scenario: 未登録IDの警告
- **WHEN** HTMLにrule-*, method-*形式のIDがあるがDBに未登録
- **THEN** 警告が出力される
