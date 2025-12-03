-- Knowledge Index System: Supabase Setup
-- =============================================
--
-- 【セットアップ手順】
--
-- 1. Supabase ダッシュボード (https://supabase.com/dashboard) にログイン
--
-- 2. 左メニューの「SQL Editor」(</> アイコン) をクリック
--
-- 3. 「New query」をクリックして新しいクエリを作成
--
-- 4. このファイルの内容を全てコピー＆ペースト
--
-- 5. 右上の「Run」ボタン（または Ctrl+Enter）をクリック
--
-- 6. "Success. No rows returned" と表示されれば成功
--
-- 7. 左メニューの「Table Editor」に戻ると knowledge_chunks テーブルが表示される
--
-- 【確認方法】
-- - Table Editor → knowledge_chunks が存在すること
-- - Database → Functions に search_knowledge, get_chunk_by_id, list_concepts があること
--
-- =============================================

-- Step 1: Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Step 2: Create knowledge_chunks table
create table if not exists public.knowledge_chunks (
    -- Primary identification
    id text primary key,                    -- "二次方程式の解き方_教材#rule-quadratic-formula"
    material text not null,                 -- "二次方程式の解き方_教材"
    anchor text not null,                   -- "rule-quadratic-formula"

    -- Content
    title text not null,                    -- "解の公式"
    content text not null,                  -- Full text content (HTML tags removed)
    learns text[] not null default '{}',    -- ["解の公式の使い方", "a,b,cの代入方法"]

    -- Metadata
    type text not null check (type in ('rule', 'method', 'definition', 'example', 'tip')),
    category text not null,                 -- "equations", "functions", etc.
    level text not null check (level in ('基礎', '標準', '発展')),
    prerequisites text[] not null default '{}',

    -- Search (embedding dimension for text-embedding-3-small)
    embedding vector(1536),

    -- Timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Step 3: Create indexes for better performance
create index if not exists idx_knowledge_chunks_material on public.knowledge_chunks(material);
create index if not exists idx_knowledge_chunks_type on public.knowledge_chunks(type);
create index if not exists idx_knowledge_chunks_category on public.knowledge_chunks(category);
create index if not exists idx_knowledge_chunks_anchor on public.knowledge_chunks(anchor);

-- Embedding vector index for similarity search (HNSW algorithm for better performance)
create index if not exists idx_knowledge_chunks_embedding on public.knowledge_chunks
using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);

-- Step 4: Create RPC function for semantic search
create or replace function public.search_knowledge(
    query_embedding vector(1536),
    match_threshold float default 0.7,
    match_count int default 5,
    filter_category text default null,
    filter_type text default null
)
returns table (
    id text,
    material text,
    anchor text,
    title text,
    content text,
    learns text[],
    type text,
    category text,
    level text,
    similarity float
)
language sql stable
as $$
    select
        k.id,
        k.material,
        k.anchor,
        k.title,
        k.content,
        k.learns,
        k.type,
        k.category,
        k.level,
        1 - (k.embedding <=> query_embedding) as similarity
    from public.knowledge_chunks k
    where
        k.embedding is not null
        and 1 - (k.embedding <=> query_embedding) > match_threshold
        and (filter_category is null or k.category = filter_category)
        and (filter_type is null or k.type = filter_type)
    order by k.embedding <=> query_embedding
    limit match_count;
$$;

-- Step 5: Create function to get chunk by ID
create or replace function public.get_chunk_by_id(chunk_id text)
returns table (
    id text,
    material text,
    anchor text,
    title text,
    content text,
    learns text[],
    type text,
    category text,
    level text,
    prerequisites text[]
)
language sql stable
as $$
    select
        k.id,
        k.material,
        k.anchor,
        k.title,
        k.content,
        k.learns,
        k.type,
        k.category,
        k.level,
        k.prerequisites
    from public.knowledge_chunks k
    where k.id = chunk_id;
$$;

-- Step 6: Create function to list all concepts (for browsing)
create or replace function public.list_concepts(
    filter_category text default null,
    filter_type text default null
)
returns table (
    id text,
    material text,
    anchor text,
    title text,
    type text,
    category text,
    learns text[]
)
language sql stable
as $$
    select
        k.id,
        k.material,
        k.anchor,
        k.title,
        k.type,
        k.category,
        k.learns
    from public.knowledge_chunks k
    where
        (filter_category is null or k.category = filter_category)
        and (filter_type is null or k.type = filter_type)
    order by k.category, k.material, k.anchor;
$$;

-- Step 7: Create trigger to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists update_knowledge_chunks_updated_at on public.knowledge_chunks;
create trigger update_knowledge_chunks_updated_at
    before update on public.knowledge_chunks
    for each row
    execute function public.update_updated_at_column();

-- Step 8: Enable Row Level Security (optional, but recommended)
alter table public.knowledge_chunks enable row level security;

-- Allow public read access (for MCP server)
create policy "Allow public read access"
    on public.knowledge_chunks
    for select
    using (true);

-- Allow authenticated users to insert/update (for GitHub Actions)
create policy "Allow authenticated insert"
    on public.knowledge_chunks
    for insert
    with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

create policy "Allow authenticated update"
    on public.knowledge_chunks
    for update
    using (auth.role() = 'authenticated' or auth.role() = 'service_role');

create policy "Allow authenticated delete"
    on public.knowledge_chunks
    for delete
    using (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- Step 9: Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant select on public.knowledge_chunks to anon, authenticated;
grant insert, update, delete on public.knowledge_chunks to authenticated;
grant execute on function public.search_knowledge to anon, authenticated;
grant execute on function public.get_chunk_by_id to anon, authenticated;
grant execute on function public.list_concepts to anon, authenticated;

-- Done! The knowledge index system is now ready.
-- Next steps:
-- 1. Set up environment variables in GitHub Actions:
--    - SUPABASE_URL: Your Supabase project URL
--    - SUPABASE_SERVICE_KEY: Your Supabase service role key (for write access)
--    - OPENAI_API_KEY: For generating embeddings
-- 2. Run the extract-chunks.ts script to populate the table
