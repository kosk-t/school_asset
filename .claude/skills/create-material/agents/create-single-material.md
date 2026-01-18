# 単一教材作成エージェント

Task ツール経由で呼び出され、**1つの教材のみを作成**するエージェントの指示。

## 入力パラメータ

呼び出し時に渡される情報：
- テーマ名（例：平方根の計算）
- 学校レベル（junior/senior）

---

## 基本設定

- **対象**:
  - junior: 中学生・基礎〜標準レベル
  - senior: 高校生・基礎〜標準レベル
- **文体**: やさしく、手順は箇条書き、数式はLaTeX
- **禁止**: 個別の長い問題解説に偏らない（"考え方の道具箱"が主）

---

## 実行手順

### Step 1: 事前確認

既存のストーリーを確認：

```bash
node .claude/skills/create-material/scripts/list-stories.js
```

- 重複がないことを確認
- `documents/MATERIALS.md` で教材の一覧を確認

### Step 2: テンプレート読み込み

`.claude/skills/create-material/assets/education-template.html` を読み込む。

### Step 3: 教材HTML作成

#### 出力先
- 中学: `docs/junior/<テーマ名>_教材.html`
- 高校: `docs/senior/<テーマ名>_教材.html`

#### 必須構成（10セクション）

1. **テーマの定義**（導入 → 学ぶ内容の箇条書き）
   - まず「なぜ学ぶか」を身近な例で動機づけ（1〜2文）
   - 次に「何を学ぶか」を箇条書きで簡潔に

2. **覚えるルール**（最重要ルール + 図解 + その他ルール）
   - 最重要ルールを `important-rule` で強調 + SVG図解
   - その他ルールを `rule-box` で
   - **公式だけでなく「だから結果がこうなる」まで書く**
   - 必要に応じて**メリット**も追加OK：
     `<p><strong>✅ メリット：</strong> 説明文</p>`
   - **考え方を折りたたみで**：
     ```html
     <details><summary><strong>💡 考え方を見る</strong></summary>
     <p>説明文...</p>
     </details>
     ```

3. **例題と解き方**（h3でカテゴリ分類 → 番号付き手順）
   ```html
   <h3 style="color: #1976d2; margin: 15px 0 10px 0;">▶ カテゴリ名</h3>
   <div class="example-box" id="ex-1">
       <div class="example-title">
           <span class="number-badge">例1</span>例題タイトル
       </div>
       <p>問題文</p>
       <p><strong>解き方：</strong></p>
       <ol>
           <li>手順1</li>
           <li>手順2</li>
       </ol>
       <div class="formula">\[ 計算式 \]</div>
   </div>
   ```

   **手順の書き方のコツ**:
   - 「〜する」「〜を探す」など動詞で終わる
   - 条件分岐は「→」で示す（例：「定数項がない → 共通因数をくくる」）
   - 重要な結果は **太字** で強調

   **ルールと計算例のリンク**:
   ```html
   <!-- 計算例にidを付ける -->
   <div class="example-box" id="ex-factoring">...</div>

   <!-- ルールからリンクする -->
   <div class="rule-box">
       <strong>📌 因数分解のパターン</strong> <a href="#ex-factoring" class="example-link">→ 例1</a>
   </div>
   ```

4. **簡単にするコツ** - `tip-box` で実践的アドバイス

5. **よくあるつまづき** - `caution-box` で注意点と対策

6. **仕上げチェックリスト** - 5項目

7. **練習問題** - 2問程度
   ```html
   <details><summary>答えを見る</summary>
   <p>解答</p>
   </details>
   ```

8. **まとめ一言** - ワンフレーズで要点

9. **関連教材** - Front Matterの`related`で指定（本文には書かない）

10. **おまけストーリー** - 数学雑学/歴史/応用ストーリー

---

### Step 4: Front Matter

```yaml
---
layout: material-raw
title: テーマ名
icon: "絵文字"
description: 2〜3文の説明
level: 基礎/標準/発展
level_num: 1/2/3
category: numbers/equations/functions/geometry/data
school_level: junior/senior
order: カテゴリ内の表示順
keywords: [キーワード1, キーワード2, キーワード3]
cover_image: /images/noimage.jpg
cover_description: 表紙画像に含めたいビジュアル要素の説明
battle_game: false
toc:
  - id: section1
    title: "テーマの定義"
  - id: section2
    title: "覚えるルール"
  - id: section3
    title: "例題と解き方"
  - id: section4
    title: "簡単にするコツ"
  - id: section5
    title: "よくあるつまづき"
  - id: section6
    title: "仕上げチェックリスト"
  - id: section7
    title: "練習問題"
  - id: section8
    title: "まとめ一言"
  - id: section9
    title: "おまけ：XXX「タイトル」"
related:  # 任意、存在する教材のみ
  - url: /junior/前提教材_教材.html
    title: 前提教材名
    note: 関連理由（15字程度）
    type: prerequisite
---
```

#### カテゴリID
- `numbers`: 数と式
- `equations`: 方程式
- `functions`: 関数
- `geometry`: 図形
- `data`: データの活用

---

### Step 5: メタデータ更新

**`docs/_data/materials.yml`** に追加：

```yaml
- slug: junior/テーマ名_教材    # または senior/
  title: テーマ名
  icon: "絵文字"
  description: 簡潔な説明（キーワード3つ程度）
  level: 標準
  level_num: 2
  category: equations
  school_level: junior
  order: 1
  cover_image: images/noimage.jpg
```

**重要**: `slug` と `school_level` の整合性
- `school_level: junior` → `slug: junior/...`
- `school_level: senior` → `slug: senior/...`

---

### Step 6: 進捗更新

**`documents/MATERIALS.md`** を更新：
1. 教材の状態を ⬜ → ✅ に変更
2. 進捗サマリーの数字を更新（完成数、未着手数、進捗率）
3. 更新履歴に追記

---

## コーディング規約

### 数式
- インライン: `\(` `\)`
- ディスプレイ: `\[` `\]`

### SVG図解
- **`svg-caption` 必須**（図番号自動付与）
- **LaTeX不可** → Unicode使用: `²³⁴⁵√×÷±−`
- **font-size: 14以上**
- y座標が大きいほど下

```html
<div class="svg-container">
    <svg>...</svg>
    <div class="svg-caption">図の説明文</div>
</div>
```

#### 放物線の描き方
複数点を計算して`L`コマンドで繋ぐ（ベジェ曲線非推奨）：

```html
<!-- 座標変換: SVG_x = 70 + x*45, SVG_y = 250 - y*15 -->
<path d="M 70 130
         L 92.5 109.4 L 115 92.5 L 137.5 79.4 L 160 70
         L 182.5 64.4 L 205 62.5 L 227.5 64.4 L 250 70"
      stroke="#e53935" stroke-width="3" fill="none"/>
```

#### 矢印マーカー
```html
<defs>
    <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="#4caf50"/>
    </marker>
</defs>
<path d="M 100 50 L 200 50" marker-end="url(#arrow-green)"/>
```

### テーブル
```html
<table class="material-table">
    <tr><th>見出し</th><th>内容</th></tr>
    <tr><td>データ</td><td>値</td></tr>
</table>
```

---

## ストーリー作成

### 優先順位
1. **数学パラドックス・雑学** ★★★★★ - 直感に反する結果（最優先！）
2. **歴史エピソード** ★★★★☆ - 雑学度高いもの
3. **他分野応用** ★★★☆☆ - 科学・経済・芸術など
4. **フィクション** ★★☆☆☆ - 最終手段

### 鉄則
- **証明・複雑な計算は入れない**
- **数式は2〜3個、シンプルに**
- **ユーモア必須**
- **実話は出典明記**

### 見出し形式
- 数学雑学: `おまけ：数学雑学「タイトル」`
- 確率: `おまけ：確率パラドックス「タイトル」`
- 歴史: `おまけ：歴史ストーリー「タイトル」`
- 他分野: `おまけ：〇〇と数学「タイトル」`
- フィクション: `おまけ：実践ストーリー「タイトル」`

### 構成パターン
1. 問題の提示（直感的に「こうだろう」と思える質問）
2. 直感の答えと数学の答えの対比（「でも実は...」が見せ場）
3. 簡単な説明（表や図で、数式は1〜2個）
4. 実話・エピソード
5. オチ（ユーモア必須！）

詳細: `.claude/skills/create-material/references/story-patterns.md`

---

## 数学記号の読み方・意味の補足（必須）

初めて登場する数学記号には**読み方を括弧で補足**すること。

```html
<p>\(A \cap B\)（「AかつB」と読む。AとBの両方が起こること）</p>
<p>\(A \cup B\)（「AまたはB」と読む。AとBの少なくとも一方が起こること）</p>
<p>\(\overline{A}\)（「Aバー」と読む。Aが起こらないこと）</p>
<p>\(P(A|B)\)（「Bが起きたときのAの確率」と読む）</p>
```

| 記号 | 読み方 | 意味 |
|------|--------|------|
| ∩ | かつ、キャップ | 両方とも起こる |
| ∪ | または、カップ | 少なくとも一方が起こる |
| Ā（上に棒） | Aバー | Aが起こらない（余事象） |
| ⊂ | 含まれる | 部分集合 |
| ∈ | 属する | 要素である |
| ≠ | ノットイコール | 等しくない |
| ≤, ≥ | 以下、以上 | 〜より小さいか等しい |
| ± | プラスマイナス | 正または負 |
| √ | ルート | 平方根 |

---

## 抽象的な概念には具体例を必ず添える

「〜とは」だけで終わらず、**「たとえば〜」で具体的な状況を説明**。

**悪い例**：
```html
<p>排反事象とは、同時に起こらない事象のことです。</p>
```

**良い例**：
```html
<p><strong>排反事象</strong>とは、同時に起こらない事象のこと。</p>
<p>たとえば、サイコロを1回振るとき「1が出る」と「2が出る」は排反事象です。
1回のサイコロで1と2が同時に出ることはありえないからです。</p>
<p>一方、「偶数が出る」と「4が出る」は排反ではありません。
4が出れば「偶数も出た」ことになり、同時に成り立つからです。</p>
```

---

## 関連教材（Front Matterで指定）

**関連教材の決め方**:
1. `assets/curriculum.json` の `materials` セクションを参照
2. 既存の教材名から前提知識・関連教材を選ぶ
3. **存在しない教材へのリンクは絶対に作らない**
4. **関連理由を必ず書く**

```yaml
related:
  - url: /junior/前提教材_教材.html
    title: 前提教材名
    note: なぜこの教材が前提なのかを一言で
    type: prerequisite
  - url: /junior/関連教材_教材.html
    title: 関連教材名
    note: どう関連しているのかを一言で
    type: related
```

---

## カリキュラムマップへの追加

教材作成後、`assets/curriculum.json` の `materials` セクションに追加：

```json
"<テーマ名>": {
  "file": "<テーマ名>_教材.html",
  "category": "方程式",
  "level": "standard",
  "description": "簡潔な説明文",
  "covers": [
    "中1/方程式/一次方程式/等式の性質",
    "中1/方程式/一次方程式/一次方程式の解き方"
  ],
  "prerequisite": ["前提となる教材名"],
  "relatedTo": ["関連する教材名"]
}
```

**covers の決め方**:
1. `assets/curriculum.json` の `curriculum` セクションを参照
2. 教材の内容から該当する項目を選ぶ
3. パス形式で記載（例: `中3/数と式/平方根/分母の有理化`）
4. 主要な項目を5〜10個程度選ぶ

---

## 出力報告

完了後、以下を報告：

```
## 作成完了

- ファイル: docs/junior/平方根の計算_教材.html
- カテゴリ: numbers
- レベル: 標準
- メタデータ: docs/_data/materials.yml に追加済み
- 進捗: documents/MATERIALS.md 更新済み（進捗率: XX%）
```
