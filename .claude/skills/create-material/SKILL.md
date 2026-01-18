---
name: create-material
description: |
  中学・高校数学の教材HTMLを作成。Jekyll構成のサイト用。
  Use when: (1) /create-material コマンド実行時, (2) 「教材を作成」「教材を作って」リクエスト時, (3) MATERIALS.mdの未着手教材を進める依頼時, (4) 数学教材のHTML作成が必要な時。
  各教材はTaskツールで別コンテキスト実行し、コンテキスト制限を回避。複数教材の並列作成可能。
---

# 教材作成スキル

## 引数形式

```
/create-material <テーマ名> [junior|senior]
```

- **テーマ名**: 必須（例：二次方程式の平方完成）
- **学校レベル**: 任意。`junior`（中学、デフォルト）または `senior`（高校）

複数の教材を作成する場合は、カンマ区切りまたは複数行で指定：
```
/create-material 一次方程式, 連立方程式, 二次方程式
```

## 作成フロー（Task ツール経由）

### 重要：各教材は Task ツールで別コンテキストで実行

各教材の作成は **Task ツール** を使って **別のコンテキスト** で実行します。
これにより、コンテキストの制限を気にせず、無限に教材を作成できます。

### 1. 事前準備（メインコンテキストで実行）

既存のストーリーを確認：

```bash
node .claude/skills/create-material/scripts/list-stories.js
```

重複しないテーマを選ぶ。`documents/MATERIALS.md` の未着手教材から選ぶか、新規追加。

### 2. 教材作成（Task ツールで実行）

**1つの教材ごとに Task ツールを呼び出し**。複数教材は並列実行可能。

```
Task(
  subagent_type="general-purpose",
  description="教材作成: <テーマ名>",
  prompt="""
    テーマ名: <テーマ名>
    学校レベル: junior/senior

    .claude/skills/create-material/agents/create-single-material.md の指示に従って教材を作成。
    完了後、作成したファイルパスを報告。
  """
)
```

**並列実行例**（`/create-material 一次関数, 二次関数, 三角比`）：
```
Task x 3 (同時呼び出し):
  - 教材作成: 一次関数 (junior)
  - 教材作成: 二次関数 (junior)
  - 教材作成: 三角比 (junior)
```

**順次実行例**（依存関係がある場合）：
```
Task 1: 教材作成: 一次方程式 → 完了後 → Task 2: 教材作成: 連立方程式
```

### 3. 結果確認（メインコンテキストで実行）

各 Task の完了後、結果を確認：
- 作成されたファイルの存在確認
- materials.yml の更新確認
- MATERIALS.md の進捗確認

## エージェント指示ファイル

詳細な作成手順は以下を参照：
- [agents/create-single-material.md](agents/create-single-material.md) - 単一教材作成の完全な指示

## ファイル構成

```
.claude/skills/create-material/
├── SKILL.md                           # このファイル
├── agents/
│   └── create-single-material.md      # Task エージェント用指示
├── assets/
│   └── education-template.html        # 教材テンプレート
├── references/
│   └── story-patterns.md              # ストーリーパターン集
└── scripts/
    └── list-stories.js                # 既存ストーリー一覧
```

## クイックリファレンス

### カテゴリID

| ID | 内容 |
|----|------|
| `numbers` | 数と式 |
| `equations` | 方程式 |
| `functions` | 関数 |
| `geometry` | 図形 |
| `data` | データの活用 |

### レベル

| level_num | level |
|-----------|-------|
| 1 | 基礎 |
| 2 | 標準 |
| 3 | 発展 |

### 出力先

- 中学: `docs/junior/<テーマ名>_教材.html`
- 高校: `docs/senior/<テーマ名>_教材.html`

### 更新ファイル

1. **`docs/_data/materials.yml`** - メタデータ追加
2. **`documents/MATERIALS.md`** - 状態を✅に、進捗率更新
