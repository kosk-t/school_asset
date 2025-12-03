# Knowledge Index System セットアップ

教材のRAG検索システムをセットアップする手順。

## 1. Supabase プロジェクト作成

1. [Supabase](https://supabase.com/) にログイン
2. 「New project」をクリック
3. プロジェクト名とパスワードを設定
4. リージョンは「Northeast Asia (Tokyo)」を選択
5. 作成完了まで数分待つ

## 2. データベースセットアップ

1. Supabase ダッシュボードの左メニュー → **SQL Editor**
2. 「New query」をクリック
3. [setup.sql](./setup.sql) の内容を全てコピー＆ペースト
4. **Run** ボタンをクリック
5. "Success. No rows returned" と表示されれば成功

### 確認方法
- **Table Editor** → `knowledge_chunks` テーブルが表示される
- **Database → Functions** → `search_knowledge`, `get_chunk_by_id`, `list_concepts` がある

## 3. API キーの取得

1. Supabase ダッシュボード → **Settings** → **API**
2. 以下の値をメモ：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
     - ⚠️ `anon` キーではなく `service_role` を使う（書き込み権限が必要）

## 4. OpenAI API キーの取得

1. [OpenAI Platform](https://platform.openai.com/api-keys) にログイン
2. 「Create new secret key」でキーを作成
3. `sk-proj-...` の形式のキーをメモ

## 5. ローカル環境の設定

```bash
# scripts ディレクトリに移動
cd scripts

# 依存関係インストール
npm install

# 環境変数ファイル作成
cp .env.example .env
```

`.env` を編集：
```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI (for embeddings)
# Model: text-embedding-3-small (1536 dimensions)
# Note: AI家庭教師の検索側も同じモデルを使うこと
OPENAI_API_KEY=sk-proj-...
```

## 6. データ投入

### VS Code タスクから実行
1. `Ctrl+Shift+P` → `Tasks: Run Task`
2. `Knowledge: Extract & Upload` を選択

### コマンドラインから実行
```bash
cd scripts
npm run extract:upload
```

### 実行結果
```
Knowledge Chunk Extraction Script
========================================
Mode: Upload

Uploading 87 chunks to Supabase...
[1/87] Processing: 二次方程式の解き方_教材#rule-quadratic-formula
  Generating embedding for 1234 chars...
  Uploaded successfully
...
Upload complete!
```

## 7. 動作確認

Supabase ダッシュボード → **Table Editor** → `knowledge_chunks` で：
- データが登録されていること
- `embedding` カラムにベクトルが入っていること

## トラブルシューティング

### `SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required`
→ `.env` ファイルが存在しない、または値が設定されていない

### `Error uploading: ...`
→ `setup.sql` が実行されていない、またはテーブルが存在しない

### `OpenAI API error: ...`
→ `OPENAI_API_KEY` が正しくない、または API クレジットが不足

## 関連ファイル

| ファイル | 説明 |
|---------|------|
| `supabase/setup.sql` | DB スキーマ・関数定義 |
| `scripts/extract-chunks.ts` | チャンク抽出・アップロードスクリプト |
| `scripts/.env` | 環境変数（gitignore済み） |
| `scripts/.env.example` | 環境変数テンプレート |
| `docs/_data/knowledge_chunks.json` | 静的エクスポート（フォールバック用） |
| `docs/_data/learns.yml` | learns データ（オプション） |
