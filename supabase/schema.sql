-- =========================================================
-- SCHEMA COMPLETO - Sistema de Aferições de Bombas de Combustível
-- Execute este arquivo inteiro no SQL Editor do Supabase
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------- PERFIS DE USUÁRIO ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  role text not null default 'operador', -- 'admin' | 'operador'
  created_at timestamptz not null default now()
);

-- ---------- POSTOS ----------
create table if not exists public.postos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  cnpj text,
  endereco text,
  status text not null default 'Ativo', -- 'Ativo' | 'Inativo'
  created_at timestamptz not null default now()
);

-- ---------- BOMBAS ----------
create table if not exists public.bombas (
  id uuid primary key default uuid_generate_v4(),
  posto_id uuid not null references public.postos(id) on delete cascade,
  numero text not null,
  created_at timestamptz not null default now()
);

-- ---------- BICOS ----------
create table if not exists public.bicos (
  id uuid primary key default uuid_generate_v4(),
  bomba_id uuid not null references public.bombas(id) on delete cascade,
  numero text not null,
  produto text not null, -- ex: 'Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel S10'
  created_at timestamptz not null default now()
);

-- ---------- CONFIGURAÇÕES (thresholds de situação) ----------
create table if not exists public.configuracoes (
  id int primary key default 1,
  alerta_min int not null default 100, -- |erro em mL| a partir do qual vira "Alerta"
  critico_min int not null default 150, -- |erro em mL| a partir do qual vira "Crítico"
  constraint singleton check (id = 1)
);
insert into public.configuracoes (id, alerta_min, critico_min)
values (1, 100, 150)
on conflict (id) do nothing;

-- ---------- AFERIÇÕES ----------
create table if not exists public.afericoes (
  id uuid primary key default uuid_generate_v4(),
  bico_id uuid not null references public.bicos(id) on delete cascade,
  litros_aferidos numeric, -- quantidade de litros usada na aferição (ex: 20)
  valor int, -- valor numérico em mL (pode ser null se interditado)
  valor_label text not null, -- rótulo exibido, ex: '+80', '-40', 'Maior que +200'
  situacao text not null, -- 'Regular' | 'Alerta' | 'Crítico' | 'Interditado'
  interditado boolean not null default false,
  observacao text,
  foto_afericao_path text,
  foto_comprovante_path text,
  data_afericao timestamptz not null default now(),
  criado_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_afericoes_data on public.afericoes (data_afericao desc);
create index if not exists idx_afericoes_bico on public.afericoes (bico_id);
create index if not exists idx_bombas_posto on public.bombas (posto_id);
create index if not exists idx_bicos_bomba on public.bicos (bomba_id);

-- =========================================================
-- ROW LEVEL SECURITY
-- Qualquer usuário autenticado pode ler/escrever (uso interno da equipe).
-- Ajuste as políticas conforme a necessidade de permissões da sua equipe.
-- =========================================================

alter table public.profiles enable row level security;
alter table public.postos enable row level security;
alter table public.bombas enable row level security;
alter table public.bicos enable row level security;
alter table public.configuracoes enable row level security;
alter table public.afericoes enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create policy "authenticated_all_postos" on public.postos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_bombas" on public.bombas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_bicos" on public.bicos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_configuracoes" on public.configuracoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_afericoes" on public.afericoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Cria automaticamente um profile ao registrar um novo usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- STORAGE: bucket privado para as fotos de aferição/comprovante
-- =========================================================
insert into storage.buckets (id, name, public)
values ('afericoes', 'afericoes', false)
on conflict (id) do nothing;

create policy "authenticated_read_afericoes_bucket"
  on storage.objects for select
  using (bucket_id = 'afericoes' and auth.role() = 'authenticated');

create policy "authenticated_upload_afericoes_bucket"
  on storage.objects for insert
  with check (bucket_id = 'afericoes' and auth.role() = 'authenticated');

create policy "authenticated_update_afericoes_bucket"
  on storage.objects for update
  using (bucket_id = 'afericoes' and auth.role() = 'authenticated');

create policy "authenticated_delete_afericoes_bucket"
  on storage.objects for delete
  using (bucket_id = 'afericoes' and auth.role() = 'authenticated');
