# プロジェクトルール

## 文字コード
- **すべてのファイルはUTF-8で保存すること**
- HTMLファイルには必ず `<meta charset="UTF-8">` を含める
- 絵文字はそのまま使用可能（UTF-8なら変換不要）

## ディレクトリ構成
```
docs/
├── css/
│   └── education-template.css  # 共通スタイル
├── education-template.html     # テンプレート
├── index.html                  # 目次ページ
└── *_教材.html                 # 各教材
```

## 教材作成
- `/create-material <テーマ名>` コマンドで新規教材を作成
- 作成後は `docs/index.html` に目次リンクを追加

## コーディング規約
- インデント: スペース4つ
- 数式: KaTeX使用（インライン `\(` `\)`、ディスプレイ `\[` `\]`）
- 図解: SVGを使用（Canvasは使わない）
- **SVG内のfont-sizeは必ず14以上**（13以下は禁止）
