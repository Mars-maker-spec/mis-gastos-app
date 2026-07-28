-- ═══════════════════════════════════════════════════════════════════════
-- BASE DE DATOS PARA "MIS GASTOS"
-- Copia TODO este archivo y pégalo en Supabase > SQL Editor > New query
-- Luego dale click en "Run". Solo se hace una vez.
-- ═══════════════════════════════════════════════════════════════════════

-- Tabla de gastos
create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  description text not null,
  category text not null,
  amount numeric not null,
  date date not null,
  created_at timestamptz default now()
);

alter table public.gastos enable row level security;

create policy "Cada quien ve sus propios gastos"
  on public.gastos for select using (auth.uid() = user_id);

create policy "Cada quien agrega sus propios gastos"
  on public.gastos for insert with check (auth.uid() = user_id);

create policy "Cada quien edita sus propios gastos"
  on public.gastos for update using (auth.uid() = user_id);

create policy "Cada quien borra sus propios gastos"
  on public.gastos for delete using (auth.uid() = user_id);

-- Tabla de perfil (nombre y límite mensual de cada usuario)
create table public.perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  limite_mensual numeric not null default 120000
);

alter table public.perfiles enable row level security;

create policy "Cada quien ve su propio perfil"
  on public.perfiles for select using (auth.uid() = user_id);

create policy "Cada quien edita su propio perfil"
  on public.perfiles for update using (auth.uid() = user_id);

create policy "Cada quien crea su propio perfil"
  on public.perfiles for insert with check (auth.uid() = user_id);

-- Cuando alguien se registra, esto crea su perfil automáticamente
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.perfiles (user_id, nombre, limite_mensual)
  values (new.id, new.raw_user_meta_data->>'name', 120000);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
