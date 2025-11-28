# プロジェクトルール

## 文字コード
- **すべてのファイルはUTF-8で保存すること**
- HTMLファイルには必ず `<meta charset="UTF-8">` を含める
- 絵文字はそのまま使用可能（UTF-8なら変換不要）

## Jekyll構成
このプロジェクトはJekyllを使用した静的サイトです。

### ディレクトリ構成
```
docs/
├── _config.yml              # Jekyll設定
├── _data/
│   ├── categories.yml       # カテゴリ定義
│   ├── materials.yml        # 教材メタデータ（目次生成用）
│   └── coming_soon.yml      # 準備中教材
├── _includes/               # 再利用可能なパーシャル
│   ├── head-css.html
│   ├── head-katex.html
│   ├── home-styles.html
│   └── ...
├── _layouts/
│   ├── default.html
│   ├── home.html
│   └── material-raw.html    # 教材用レイアウト
├── css/
│   └── education-template.css
├── images/
├── index.html               # トップページ（Liquid自動生成）
├── *_教材.html              # 各教材
└── Gemfile
assets/
└── education-template.html  # 教材テンプレート（Front Matter付き）
```

### 教材作成フロー
1. `/create-material <テーマ名>` コマンドで新規教材を作成
2. `docs/_data/materials.yml` に教材メタデータを追加
3. 目次ページ（index.html）は自動生成されるため編集不要

### Jekyllビルド
```bash
cd docs
bundle install                         # 初回のみ
bundle exec jekyll serve --baseurl ""  # ローカル開発（http://localhost:4000/）
```
※ GitHub Pages用に`baseurl: "/school_asset"`を設定しているため、ローカルでは`--baseurl ""`で上書きする

## コーディング規約
- インデント: スペース4つ
- 数式: KaTeX使用（インライン `\(` `\)`、ディスプレイ `\[` `\]`）
- 図解: SVGを使用（Canvasは使わない）
- **SVG内のfont-sizeは必ず14以上**（13以下は禁止）

## Front Matter
教材HTMLファイルには必ずFront Matterを含める：
```yaml
---
layout: material-raw
title: テーマ名
icon: "絵文字"
description: 説明
level: 標準
level_num: 2
category: numbers/equations/functions/geometry/data
order: 1
keywords: [...]
cover_image: /images/noimage.jpg
---
```

## 数学宿題フィードバックシステム（backend/）

### 技術スタック（厳守）
| レイヤー | 技術 | 注意事項 |
|---------|------|----------|
| バックエンド | **FastAPI** (Python) | Express.js/Node.js は使わない |
| データベース | **SQLite + SQLAlchemy** | aiosqlite で非同期対応 |
| AI API | **OpenRouter** | LangChain経由で呼び出し |
| メモリ管理 | **LangChain** | ConversationSummaryBufferMemory使用 |
| フロントエンド | **Vanilla HTML/JS** | フレームワーク不使用 |

### ディレクトリ構成
```
backend/
├── main.py              # FastAPIアプリケーション
├── models.py            # SQLAlchemyモデル
├── schemas.py           # Pydanticスキーマ
├── database.py          # DB接続設定
├── langchain_memory.py  # LangChainメモリ管理
├── requirements.txt     # Python依存関係
├── .env                 # 環境変数（gitignore対象）
├── .env.example         # 環境変数テンプレート
└── uploads/             # アップロード画像保存先

frontend/
└── index.html           # フロントエンドUI
```

### 環境変数
```bash
OPENROUTER_API_KEY=sk-or-...  # 必須
AI_MODEL=anthropic/claude-sonnet-4  # デフォルト
APP_URL=http://localhost:8000
```

### 起動方法
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### APIエンドポイント
- `POST /api/homework/upload` - 宿題画像アップロード
- `POST /api/homework/chat` - 会話を続ける
- `POST /api/homework/continue` - 続きの画像をアップロード
- `GET /api/session/{id}` - セッション情報取得
- `POST /api/mistakes/record` - 間違いを記録
- `GET /api/mistakes/{user_id}` - 間違い履歴取得
