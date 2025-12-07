# Generate Learns Data

教材HTMLにセマンティックIDを付与し、各チャンクの `learns`（学べること）を生成してSupabaseにアップロードする。

## 引数
- `$ARGUMENTS`: 教材ファイル名（例: `二次方程式の解き方_教材`）。省略時は全教材を処理。

## 手順

1. `docs/` ディレクトリから対象の `*_教材.html` ファイルを読み込む

2. **セマンティックIDの付与**（IDがない場合）
   - `class="rule-box"` の要素に `id="rule-{内容を表す英語}"` を付与
   - `class="tip-box"` の要素に `id="tip-{内容を表す英語}"` を付与
   - 定義セクションに `id="def-{概念名}"` を付与
   - 手順・方法セクションに `id="method-{手法名}"` を付与
   - ID名は kebab-case で、内容を端的に表す英語（例: `rule-quadratic-formula`, `method-factoring`）

3. `id="rule-*"`, `id="method-*"`, `id="def-*"`, `id="tip-*"` の要素を抽出

4. 各チャンクに対して `learns` を生成：
   - そのセクションで学べる具体的な知識・スキルを3〜5個
   - 「〜の方法」「〜の公式」「〜を理解する」のような実用的な表現
   - 抽象的すぎず、検索クエリにマッチしやすい表現

5. 結果を `docs/_data/learns.yml` に出力（既存エントリは保持、新規追加のみ）

6. `cd scripts && npm run extract:upload` を実行してSupabaseにアップロード

## セマンティックIDの命名規則

| プレフィックス | 用途 | 例 |
|---|---|---|
| `rule-` | 公式・定理・法則 | `rule-quadratic-formula`, `rule-pythagorean` |
| `method-` | 解法・手順・テクニック | `method-factoring`, `method-completing-square` |
| `def-` | 定義・概念説明 | `def-slope`, `def-quadratic-function` |
| `tip-` | コツ・ヒント・注意点 | `tip-sign-error`, `tip-check-solution` |

## 出力形式

```yaml
# docs/_data/learns.yml
# 自動生成: /generate-learns コマンド

二次方程式の解き方_教材:
  rule-quadratic-formula:
    - "二次方程式 ax²+bx+c=0 の解を公式で求める方法"
    - "係数a, b, cを解の公式に代入する手順"
    - "ルートの中の計算（判別式）の求め方"
    - "±の意味と2つの解が出る理由"

  method-factoring:
    - "因数分解を使って二次方程式を解く方法"
    - "積が0になる性質（零積の法則）の使い方"
    ...
```

## learns のガイドライン

各 `learns` は以下を満たすこと：
- **具体的**: 「方程式を解く」ではなく「移項を使って一次方程式を解く手順」
- **検索可能**: 生徒が検索しそうなキーワードを含む
- **実用的**: 「〜の方法」「〜の求め方」「〜のルール」など
- **重複なし**: 同じ教材内で似た表現を避ける

## 実行

1. 対象教材を読み込み、セマンティックIDがなければ付与してHTMLを更新
2. チャンクごとに learns を生成して `docs/_data/learns.yml` に追加
3. 以下を実行してSupabaseにアップロード：
   ```bash
   cd scripts && npm run extract:upload
   ```
