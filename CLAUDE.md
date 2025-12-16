<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

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
├── index.html               # トップページ（タブ切り替え付き）
├── junior/                  # 中学数学教材
│   └── *_教材.html
├── senior/                  # 高校数学教材
│   └── *_教材.html
└── Gemfile
assets/
└── education-template.html  # 教材テンプレート（Front Matter付き）
```

### 教材作成フロー
1. `/create-material <テーマ名> [junior|senior]` コマンドで新規教材を作成
   - 中学: `/create-material 一次方程式` または `/create-material 一次方程式 junior`
   - 高校: `/create-material 二次関数の最大最小 senior`
2. `docs/_data/materials.yml` に教材メタデータを追加（`school_level` と `slug` プレフィックスに注意）
3. 目次ページ（index.html）はタブ切り替えで中学・高校を自動表示

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
school_level: junior  # または senior
order: 1
keywords: [...]
cover_image: /images/noimage.jpg
---
```
