-- DURAH Perfumes e Importados — estrutura no Supabase
-- Cole no Supabase: SQL Editor → New query → Run

-- 1) Tabela com o catálogo (produtos + configurações da loja) em uma única linha JSON
create table if not exists public.store_data (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Segurança: RLS ligado e sem políticas = ninguém acessa pela chave pública.
-- Só o servidor da loja (chave secreta / service_role) lê e grava.
alter table public.store_data enable row level security;

-- 2) Bucket público para as fotos dos produtos
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do update set public = true;
