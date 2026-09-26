create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nombre text not null,
  creado_en timestamptz default now()
);

create table if not exists public.autos (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  modelo text not null,
  anio int,
  placas text,
  creado_por uuid references public.perfiles(id),
  creado_en timestamptz default now()
);

create table if not exists public.piezas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  sku text,
  precio numeric(12,2) default 0,
  stock int default 0,
  auto_id uuid references public.autos(id) on delete set null,
  creado_por uuid references public.perfiles(id),
  creado_en timestamptz default now()
);

alter table public.perfiles enable row level security;
alter table public.autos enable row level security;
alter table public.piezas enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
