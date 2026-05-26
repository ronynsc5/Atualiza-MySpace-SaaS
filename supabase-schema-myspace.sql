-- MySpace SaaS schema
-- Rode este SQL no Supabase SQL Editor.
-- Segurança: usuário comum NÃO consegue ativar assinatura manualmente.
-- Pagamento aprovado é aplicado só pelo backend com SUPABASE_SERVICE_ROLE_KEY.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  subscription_status text not null default 'inactive', -- inactive, active, trialing, canceled, past_due, expired_data_deleted
  mercado_pago_payment_id text,
  mercado_pago_preference_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Meu Espaço',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
for select to authenticated using (auth.uid() = id);

drop policy if exists "Users can insert own inactive profile" on public.profiles;
create policy "Users can insert own inactive profile" on public.profiles
for insert to authenticated
with check (auth.uid() = id and subscription_status = 'inactive' and current_period_end is null);

drop policy if exists "Users can update own profile basics" on public.profiles;
-- Não criamos policy de update para profiles. Assim ninguém ativa assinatura pelo frontend.
-- O backend com service_role atualiza profiles após webhook/pagamento.

drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects" on public.projects
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects" on public.projects
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects" on public.projects
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects" on public.projects
for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, subscription_status)
  values (new.id, new.email, 'inactive')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_myspace_profile on auth.users;
create trigger on_auth_user_created_myspace_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();
