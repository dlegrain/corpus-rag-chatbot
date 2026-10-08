-- Base documentaire scientifique (namespace `sci_`) — projet Supabase "Diederick"
create extension if not exists vector;

create table if not exists public.sci_documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  filename    text not null,
  authors     text,
  year        int,
  journal     text,
  n_pages     int,
  n_chunks    int not null default 0,
  status      text not null default 'ready',
  created_at  timestamptz not null default now()
);

create table if not exists public.sci_chunks (
  id           bigserial primary key,
  document_id  uuid not null references public.sci_documents(id) on delete cascade,
  chunk_index  int not null,
  page         int,
  content      text not null,
  embedding    vector(768),
  created_at   timestamptz not null default now()
);

create index if not exists sci_chunks_document_id_idx on public.sci_chunks(document_id);
create index if not exists sci_chunks_embedding_idx
  on public.sci_chunks using hnsw (embedding vector_cosine_ops);

-- Recherche sémantique
create or replace function public.match_sci_chunks(
  query_embedding vector(768),
  match_count     int default 10,
  filter_doc      uuid default null
)
returns table (
  id          bigint,
  document_id uuid,
  content     text,
  page        int,
  similarity  float,
  title       text,
  authors     text,
  year        int,
  journal     text,
  filename    text
)
language sql stable
set search_path = public
as $$
  select c.id,
         c.document_id,
         c.content,
         c.page,
         1 - (c.embedding <=> query_embedding) as similarity,
         d.title,
         d.authors,
         d.year,
         d.journal,
         d.filename
  from public.sci_chunks c
  join public.sci_documents d on d.id = c.document_id
  where filter_doc is null or c.document_id = filter_doc
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Rappel des passages déjà cités aux tours précédents (par identifiant)
create or replace function public.sci_chunks_by_ids(ids bigint[], query_embedding vector(768))
returns table (id bigint, document_id uuid, content text, page int, similarity float,
               title text, authors text, year int, journal text, filename text)
language sql stable
set search_path = public
as $$
  select c.id, c.document_id, c.content, c.page, 1 - (c.embedding <=> query_embedding),
         d.title, d.authors, d.year, d.journal, d.filename
  from public.sci_chunks c join public.sci_documents d on d.id = c.document_id
  where c.id = any(ids);
$$;

-- RLS : tout passe par les Netlify Functions (service_role), rien n'est exposé à l'anon key.
alter table public.sci_documents enable row level security;
alter table public.sci_chunks    enable row level security;
revoke all on function public.match_sci_chunks(vector, int, uuid) from anon, authenticated;
revoke all on function public.sci_chunks_by_ids(bigint[], vector) from anon, authenticated;
