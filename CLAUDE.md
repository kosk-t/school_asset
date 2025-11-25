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
