# 数学教材ライブラリ

中学生向けの数学教材を作成・管理するプロジェクトです。

---

## ManabiNote AI - 宿題フィードバックシステム

数学の宿題をAIがチェックして、優しく指導してくれるシステムです。

### 機能

- **画像アップロード**: 宿題の写真を撮ってアップロード
- **AI分析**: OpenRouterを通じてAIが数式を解析
- **段階的ヒント**: 答えを直接教えるのではなく、ステップバイステップで導く
- **間違い履歴**: ユーザーごとの間違いパターンを記録し、苦手分野を把握
- **対話型学習**: AIとチャットしながら理解を深める

### セットアップ

```bash
# バックエンドのセットアップ
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 環境変数を設定
cp .env.example .env
# .env ファイルを編集して OPENROUTER_API_KEY を設定

# サーバー起動
python main.py
# または: uvicorn main:app --reload
```

ブラウザで http://localhost:8000 にアクセス

### 環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `OPENROUTER_API_KEY` | OpenRouter APIキー | `sk-or-v1-xxx` |
| `AI_MODEL` | 使用するAIモデル | `anthropic/claude-sonnet-4` |

### データベース

SQLiteを使用。データは `backend/data/manabi.db` に保存されます。

- **users**: ユーザー情報
- **sessions**: 宿題チェックセッション
- **messages**: チャット履歴
- **mistakes**: 間違い履歴（苦手分野の記録）

### 使い方

1. 宿題の写真を撮影（黒字=自分で解いた、赤字=修正した部分）
2. 「宿題チェック」から画像をアップロード
3. 必要に応じてコメントを添える（「ここがわからない」など）
4. AIからのフィードバックを受け取り、対話しながら理解を深める

---

## セットアップ

### 必要なもの
- Ruby 3.0以上
- Bundler

### インストール
```bash
cd docs
bundle install
```

### 開発サーバー起動
```bash
cd docs
bundle exec jekyll serve
```
ブラウザで http://localhost:4000 にアクセス

### ビルド（本番用）
```bash
cd docs
bundle exec jekyll build
```
`docs/_site/` に静的ファイルが生成されます。

## ディレクトリ構成

```
docs/
├── _config.yml              # Jekyll設定
├── _data/
│   ├── categories.yml       # カテゴリ定義
│   ├── materials.yml        # 教材メタデータ（目次自動生成用）
│   └── coming_soon.yml      # 準備中教材
├── _includes/               # 再利用可能なパーシャル
├── _layouts/
│   ├── default.html
│   ├── home.html
│   └── material-raw.html    # 教材用レイアウト
├── css/
│   └── education-template.css
├── images/                  # 表紙画像など
├── index.html               # トップページ（Liquid自動生成）
├── *_教材.html              # 各教材
└── Gemfile
assets/
├── education-template.html  # 教材テンプレート
└── curriculum.json          # カリキュラムマップ
scripts/
├── list-stories.js          # 既存ストーリー一覧
└── check-coverage.js        # カリキュラム網羅性チェック
```

## 教材の作成

### 1. 教材HTMLを作成
```
/create-material <テーマ名>
```
`assets/education-template.html` をベースに `docs/<テーマ名>_教材.html` が作成されます。

### 2. メタデータを追加
`docs/_data/materials.yml` に教材情報を追加：

```yaml
- slug: テーマ名_教材
  title: テーマ名
  icon: "絵文字"
  description: 簡潔な説明
  level: 標準
  level_num: 2
  category: equations  # numbers/equations/functions/geometry/data
  order: 1
  cover_image: images/noimage.jpg
```

### 3. カリキュラムマップを更新
`assets/curriculum.json` の `materials` セクションに追加（任意）

## 表紙画像（4コマ漫画）

各教材の表紙として3コマ漫画を使用。画像生成AIで作成する。

### 推奨サイズ
- **幅**: 900px
- **高さ**: 400〜500px（推奨比率 16:9 または 2:1）
- **形式**: PNG または JPG
- **保存先**: `docs/images/`

### 推奨プロンプト（テンプレート）

```
3コマ漫画を画像で出力してください。

【テーマ】:
    [ここに入れてください]
【スタイル】: カラー画像。シンプルでかわいいイラスト、コメディ、教育、日本の漫画風
【ストーリー】: 面白いオチを入れる

【レイアウト】:
    - ページ全体のアスペクト比は 1:1.4（幅:高さ）を絶対に厳守する。
    - 読み順は 上から順に縦に3コマを並べる。
    - 文字は横書き
    - 同一コマ内で会話があるときは 先に読ませたいセリフのキャラクターほど左側に置く

【キャラクター】:
- 中学生の男の子または女の子
- 先生または友達（任意）
```

## 便利なスクリプト

### 既存ストーリー一覧の確認
```bash
node scripts/list-stories.js
```
既存の教材で使用されているストーリーを一覧表示します。新しい教材を作成する際に、重複を避けるために使用してください。

### カリキュラム網羅性チェック
```bash
node scripts/check-coverage.js
```
各学習項目がどの教材でカバーされているかを確認できます。

## 技術仕様

- **静的サイトジェネレーター**: Jekyll
- **文字コード**: UTF-8
- **数式**: KaTeX（インライン `\(` `\)`、ディスプレイ `\[` `\]`）
- **図解**: SVG（Canvas不可）
- **SVG内font-size**: 14以上必須

## GitHub Pages デプロイ

このプロジェクトは GitHub Pages でホスティング可能です。

1. リポジトリ設定 → Pages → Source: `Deploy from a branch`
2. Branch: `main` / Folder: `/docs`
3. または GitHub Actions で Jekyll ビルドを実行
