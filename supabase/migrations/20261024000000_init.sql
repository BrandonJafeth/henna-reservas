-- =====================================================================
-- Henna Reservas · Fase 0 · Esquema inicial
-- Ejecutar completo en Supabase → SQL Editor (o como primera migración).
-- Zona horaria del negocio: America/Costa_Rica
-- =====================================================================

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
create type public.user_role          as enum ('admin', 'tatuadora');
create type public.booking_status     as enum ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_show');
create type public.payment_type       as enum ('anticipo', 'saldo');
create type public.payment_method     as enum ('sinpe', 'efectivo', 'transferencia');
create type public.cash_movement_type as enum ('ingreso', 'egreso');

-- ---------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------

-- Perfiles: 1 a 1 con auth.users. Se crean inactivos; la admin los activa.
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text not null default '',
  phone            text,
  role             public.user_role not null default 'tatuadora',
  commission_rate  numeric(5,2) not null default 50 check (commission_rate between 0 and 100),
  is_active        boolean not null default false,
  created_at       timestamptz not null default now()
);

create table public.locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  address    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Configuración global (una sola fila)
create table public.settings (
  id                   boolean primary key default true check (id),
  booking_window_days  int  not null default 28 check (booking_window_days between 1 and 180),
  min_notice_hours     int  not null default 24 check (min_notice_hours between 0 and 168),
  buffer_minutes       int  not null default 15 check (buffer_minutes between 0 and 120),
  slot_step_minutes    int  not null default 30 check (slot_step_minutes in (15, 30, 60)),
  deposit_amount       numeric(10,2) not null default 0 check (deposit_amount >= 0),
  max_pending_per_phone int not null default 3 check (max_pending_per_phone >= 1),
  -- Secado del gel de jagua: solo informativo, NO bloquea la agenda
  drying_min_minutes   int  not null default 120 check (drying_min_minutes between 0 and 600),
  drying_max_minutes   int  not null default 180,
  updated_at           timestamptz not null default now(),
  constraint settings_drying_range check (drying_max_minutes >= drying_min_minutes)
);

-- Tamaños: definen precio de referencia y duración.
-- Opciones por cm (slider): min_cm con max_cm, o max_cm null = "más de".
-- Opciones especiales (ej. "Mano completa"): min_cm y max_cm null.
-- El precio es solo referencia; el final lo fija el estudio en bookings.final_price.
create table public.size_options (
  id               uuid primary key default gen_random_uuid(),
  label            text not null,
  min_cm           int  check (min_cm > 0),
  max_cm           int,
  price_min        numeric(10,2) not null check (price_min >= 0),
  price_max        numeric(10,2) not null,
  duration_minutes int  not null check (duration_minutes between 15 and 480),
  sort_order       int  not null default 0,
  is_active        boolean not null default true,
  check (min_cm is not null or max_cm is null),
  check (max_cm is null or max_cm >= min_cm),
  check (price_max >= price_min)
);

-- Plantilla semanal (0 = domingo … 6 = sábado)
create table public.weekly_availability (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.locations (id),
  weekday     smallint not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  check (end_time > start_time),
  -- Una tatuadora no puede tener bloques que se traslapen el mismo día
  constraint weekly_no_overlap exclude using gist (
    artist_id with =,
    weekday   with =,
    int4range(extract(epoch from start_time)::int, extract(epoch from end_time)::int) with &&
  )
);

-- Excepciones por fecha: si existe al menos una fila para (tatuadora, fecha),
-- reemplaza la plantilla de ese día. is_day_off = día libre completo.
create table public.availability_overrides (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references public.profiles (id) on delete cascade,
  date        date not null,
  is_day_off  boolean not null default false,
  location_id uuid references public.locations (id),
  start_time  time,
  end_time    time,
  note        text,
  created_at  timestamptz not null default now(),
  check (
    (is_day_off and location_id is null and start_time is null and end_time is null)
    or (not is_day_off and location_id is not null and start_time is not null
        and end_time is not null and end_time > start_time)
  ),
  constraint override_no_overlap exclude using gist (
    artist_id with =,
    date      with =,
    int4range(extract(epoch from coalesce(start_time, '00:00'))::int,
              extract(epoch from coalesce(end_time,   '23:59:59'))::int) with &&
  )
);

create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  first_name text not null check (length(first_name) between 1 and 80),
  last_name  text not null check (length(last_name)  between 1 and 80),
  phone      text not null unique check (phone ~ '^\+?[0-9]{8,15}$'),
  email      text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);

create table public.bookings (
  id                         uuid primary key default gen_random_uuid(),
  client_id                  uuid not null references public.clients (id),
  artist_id                  uuid not null references public.profiles (id),
  location_id                uuid not null references public.locations (id),
  size_option_id             uuid not null references public.size_options (id),
  starts_at                  timestamptz not null,
  ends_at                    timestamptz not null,
  status                     public.booking_status not null default 'pendiente',
  estimated_price_min        numeric(10,2) not null,
  estimated_price_max        numeric(10,2) not null,
  final_price                numeric(10,2) check (final_price >= 0),
  artist_commission_rate     numeric(5,2)  not null,       -- snapshot al crear
  reference_image_public_id  text,                          -- public_id de Cloudinary, no la URL
  notes                      text check (length(notes) <= 1000),
  allergies                  text check (length(allergies) <= 500),
  consent_privacy            boolean not null check (consent_privacy),
  consent_health             boolean not null check (consent_health),
  cancel_token               uuid not null default gen_random_uuid() unique,
  cancel_token_expires_at    timestamptz not null,
  google_event_id            text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Protección real contra doble reserva (también ante condiciones de carrera)
  constraint bookings_no_overlap exclude using gist (
    artist_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pendiente', 'confirmada'))
);

create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null references public.bookings (id) on delete cascade,
  type               public.payment_type   not null,
  method             public.payment_method not null,
  amount             numeric(10,2) not null check (amount > 0),
  receipt_public_id  text,                                  -- comprobante SINPE en Cloudinary
  paid_at            timestamptz not null default now(),
  recorded_by        uuid references public.profiles (id) default auth.uid(),
  created_at         timestamptz not null default now()
);

-- Caja chica: ingresos y egresos (materiales, etc.)
create table public.cash_movements (
  id           uuid primary key default gen_random_uuid(),
  type         public.cash_movement_type not null,
  amount       numeric(10,2) not null check (amount > 0),
  concept      text not null check (length(concept) between 1 and 200),
  booking_id   uuid references public.bookings (id) on delete set null,
  artist_id    uuid references public.profiles (id),
  location_id  uuid references public.locations (id),
  occurred_at  timestamptz not null default now(),
  recorded_by  uuid references public.profiles (id) default auth.uid(),
  created_at   timestamptz not null default now()
);

-- Auditoría (OWASP A09)
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   uuid,
  action      text not null,
  old_data    jsonb,
  new_data    jsonb,
  actor       uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Índices
-- ---------------------------------------------------------------------
create index on public.weekly_availability (artist_id, weekday);
create index on public.availability_overrides (artist_id, date);
create index on public.bookings (artist_id, starts_at);
create index on public.bookings (status, starts_at);
create index on public.bookings (client_id);
create index on public.payments (booking_id);
create index on public.cash_movements (occurred_at);
create index on public.audit_log (table_name, record_id);

-- ---------------------------------------------------------------------
-- 4. Funciones auxiliares de rol (security definer para evitar recursión en RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function public.is_active_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;

-- ---------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------

-- Crear perfil al invitar usuaria (rol siempre 'tatuadora' e inactiva;
-- nunca se toma el rol del metadata porque el usuario lo controla)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Solo la admin puede cambiar rol, comisión o estado activo
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() and auth.uid() is not null and (
       new.role is distinct from old.role
    or new.commission_rate is distinct from old.commission_rate
    or new.is_active is distinct from old.is_active) then
    raise exception 'FORBIDDEN_FIELD_CHANGE' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Una tatuadora no puede reasignar la cita ni cambiar la comisión
create or replace function public.protect_booking_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() and auth.uid() is not null and (
       new.artist_id is distinct from old.artist_id
    or new.artist_commission_rate is distinct from old.artist_commission_rate
    or new.client_id is distinct from old.client_id) then
    raise exception 'FORBIDDEN_FIELD_CHANGE' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger bookings_protect_fields
  before update on public.bookings
  for each row execute function public.protect_booking_fields();

-- Auditoría genérica
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (table_name, record_id, action, old_data, new_data)
  values (
    tg_table_name,
    coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id'))::uuid,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_bookings       after insert or update or delete on public.bookings       for each row execute function public.audit_trigger();
create trigger audit_payments       after insert or update or delete on public.payments       for each row execute function public.audit_trigger();
create trigger audit_cash_movements after insert or update or delete on public.cash_movements for each row execute function public.audit_trigger();
create trigger audit_profiles       after update                     on public.profiles       for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------
-- 6. Funciones públicas de negocio
-- ---------------------------------------------------------------------

-- Tatuadoras activas que trabajan en un lugar (para el formulario público)
create or replace function public.get_public_artists(p_location_id uuid)
returns table (id uuid, full_name text)
language sql stable security definer set search_path = '' as $$
  select distinct p.id, p.full_name
  from public.profiles p
  where p.is_active and p.role = 'tatuadora'
    and (
      exists (select 1 from public.weekly_availability w
              where w.artist_id = p.id and w.location_id = p_location_id)
      or exists (select 1 from public.availability_overrides o
                 where o.artist_id = p.id and o.location_id = p_location_id
                   and o.date >= (now() at time zone 'America/Costa_Rica')::date)
    )
  order by p.full_name;
$$;

-- Espacios libres para una tatuadora, lugar, fecha y tamaño.
-- (Los bloqueos de Google Calendar se restan en la app, fase 4.)
create or replace function public.get_available_slots(
  p_artist_id      uuid,
  p_location_id    uuid,
  p_date           date,
  p_size_option_id uuid
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_tz        constant text := 'America/Costa_Rica';
  v_settings  public.settings;
  v_duration  interval;
  v_buffer    interval;
  v_step      interval;
  v_today     date := (now() at time zone v_tz)::date;
begin
  select * into v_settings from public.settings where id;

  select make_interval(mins => s.duration_minutes) into v_duration
  from public.size_options s
  where s.id = p_size_option_id and s.is_active;

  if v_duration is null
     or p_date < v_today
     or p_date > v_today + v_settings.booking_window_days
     or not exists (select 1 from public.profiles
                    where id = p_artist_id and is_active and role = 'tatuadora')
     or not exists (select 1 from public.locations
                    where id = p_location_id and is_active) then
    return;
  end if;

  v_buffer := make_interval(mins => v_settings.buffer_minutes);
  v_step   := make_interval(mins => v_settings.slot_step_minutes);

  return query
  with blocks as (
    -- Si hay excepción ese día, manda la excepción; si no, la plantilla
    select o.start_time, o.end_time
    from public.availability_overrides o
    where o.artist_id = p_artist_id and o.date = p_date
      and not o.is_day_off and o.location_id = p_location_id
    union all
    select w.start_time, w.end_time
    from public.weekly_availability w
    where w.artist_id = p_artist_id
      and w.location_id = p_location_id
      and w.weekday = extract(dow from p_date)
      and not exists (select 1 from public.availability_overrides o2
                      where o2.artist_id = p_artist_id and o2.date = p_date)
  ),
  candidates as (
    select ((p_date + gs::time) at time zone v_tz) as s_start
    from blocks b,
         generate_series(p_date + b.start_time,
                         p_date + b.end_time - v_duration,
                         v_step) as gs
  )
  select c.s_start, c.s_start + v_duration
  from candidates c
  where c.s_start >= now() + make_interval(hours => v_settings.min_notice_hours)
    and not exists (
      select 1 from public.bookings bk
      where bk.artist_id = p_artist_id
        and bk.status in ('pendiente', 'confirmada')
        and tstzrange(bk.starts_at - v_buffer, bk.ends_at + v_buffer, '[)')
            && tstzrange(c.s_start, c.s_start + v_duration, '[)')
    )
  order by c.s_start;
end;
$$;

-- Crear reserva. SOLO la llama el servidor de Next (service_role)
-- después de validar Turnstile. El precio y la duración se calculan aquí,
-- nunca se aceptan del formulario (OWASP A08).
create or replace function public.create_booking(
  p_first_name               text,
  p_last_name                text,
  p_phone                    text,
  p_email                    text,
  p_artist_id                uuid,
  p_location_id              uuid,
  p_size_option_id           uuid,
  p_starts_at                timestamptz,
  p_reference_image_public_id text,
  p_notes                    text,
  p_allergies                text,
  p_consent_privacy          boolean,
  p_consent_health           boolean
)
returns table (booking_id uuid, cancel_token uuid)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_tz         constant text := 'America/Costa_Rica';
  v_phone      text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_settings   public.settings;
  v_size       public.size_options;
  v_commission numeric(5,2);
  v_client_id  uuid;
  v_booking    public.bookings;
begin
  if not coalesce(p_consent_privacy, false) or not coalesce(p_consent_health, false) then
    raise exception 'CONSENT_REQUIRED' using errcode = 'P0001';
  end if;

  if v_phone !~ '^\+?[0-9]{8,15}$' then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;

  select * into v_settings from public.settings where id;

  -- Límite de reservas pendientes por teléfono (OWASP A06)
  if (select count(*) from public.bookings b
      join public.clients c on c.id = b.client_id
      where c.phone = v_phone and b.status = 'pendiente') >= v_settings.max_pending_per_phone then
    raise exception 'TOO_MANY_PENDING' using errcode = 'P0001';
  end if;

  -- El horario debe ser uno de los espacios calculados
  if not exists (
    select 1 from public.get_available_slots(
      p_artist_id, p_location_id, (p_starts_at at time zone v_tz)::date, p_size_option_id) s
    where s.slot_start = p_starts_at
  ) then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end if;

  select * into v_size from public.size_options where id = p_size_option_id;
  select commission_rate into v_commission from public.profiles where id = p_artist_id;

  insert into public.clients (first_name, last_name, phone, email)
  values (trim(p_first_name), trim(p_last_name), v_phone, nullif(trim(p_email), ''))
  on conflict (phone) do update
    set first_name = excluded.first_name,
        last_name  = excluded.last_name,
        email      = coalesce(excluded.email, public.clients.email)
  returning id into v_client_id;

  begin
    insert into public.bookings (
      client_id, artist_id, location_id, size_option_id,
      starts_at, ends_at,
      estimated_price_min, estimated_price_max, artist_commission_rate,
      reference_image_public_id, notes, allergies,
      consent_privacy, consent_health, cancel_token_expires_at
    ) values (
      v_client_id, p_artist_id, p_location_id, p_size_option_id,
      p_starts_at, p_starts_at + make_interval(mins => v_size.duration_minutes),
      v_size.price_min, v_size.price_max, v_commission,
      p_reference_image_public_id, nullif(trim(p_notes), ''), nullif(trim(p_allergies), ''),
      true, true, p_starts_at
    )
    returning * into v_booking;
  exception when exclusion_violation then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end;

  return query select v_booking.id, v_booking.cancel_token;
end;
$$;

-- Cancelación por el cliente con el token del enlace (sin login)
create or replace function public.cancel_booking_by_token(p_token uuid)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  update public.bookings
     set status = 'cancelada'
   where cancel_token = p_token
     and status in ('pendiente', 'confirmada')
     and now() < cancel_token_expires_at
  returning id into v_id;
  return v_id is not null;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Vista de ganancias (respeta RLS del que consulta)
-- ---------------------------------------------------------------------
create or replace view public.v_booking_earnings
with (security_invoker = true) as
select
  b.id                                       as booking_id,
  b.artist_id,
  p.full_name                                as artist_name,
  b.location_id,
  b.starts_at,
  b.status,
  b.final_price,
  b.artist_commission_rate,
  round(coalesce(b.final_price, 0) * b.artist_commission_rate / 100, 2)       as artist_earnings,
  round(coalesce(b.final_price, 0) * (100 - b.artist_commission_rate) / 100, 2) as studio_earnings,
  coalesce((select sum(pm.amount) from public.payments pm where pm.booking_id = b.id), 0) as paid_total
from public.bookings b
join public.profiles p on p.id = b.artist_id;

-- ---------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.locations              enable row level security;
alter table public.settings               enable row level security;
alter table public.size_options           enable row level security;
alter table public.weekly_availability    enable row level security;
alter table public.availability_overrides enable row level security;
alter table public.clients                enable row level security;
alter table public.bookings               enable row level security;
alter table public.payments               enable row level security;
alter table public.cash_movements         enable row level security;
alter table public.audit_log              enable row level security;

-- profiles
create policy "profiles: ver propio o admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: editar propio o admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- catálogos públicos: lectura de activos; escritura solo admin
create policy "locations: lectura pública" on public.locations
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "locations: admin" on public.locations
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "size_options: lectura pública" on public.size_options
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "size_options: admin" on public.size_options
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "settings: lectura pública" on public.settings
  for select to anon, authenticated using (true);
create policy "settings: admin" on public.settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- disponibilidad: cada tatuadora gestiona la suya; admin todo
create policy "weekly: propia o admin" on public.weekly_availability
  for all to authenticated
  using ((artist_id = (select auth.uid()) and (select public.is_active_staff())) or (select public.is_admin()))
  with check ((artist_id = (select auth.uid()) and (select public.is_active_staff())) or (select public.is_admin()));

create policy "overrides: propia o admin" on public.availability_overrides
  for all to authenticated
  using ((artist_id = (select auth.uid()) and (select public.is_active_staff())) or (select public.is_admin()))
  with check ((artist_id = (select auth.uid()) and (select public.is_active_staff())) or (select public.is_admin()));

-- clientes: admin todo; tatuadora solo los que tienen cita con ella
create policy "clients: admin" on public.clients
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "clients: tatuadora ve las suyas" on public.clients
  for select to authenticated using (
    exists (select 1 from public.bookings b
            where b.client_id = clients.id and b.artist_id = (select auth.uid()))
    and (select public.is_active_staff())
  );

-- citas: el público NO inserta directo (usa create_booking vía servidor)
create policy "bookings: admin" on public.bookings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "bookings: tatuadora ve las suyas" on public.bookings
  for select to authenticated using (artist_id = (select auth.uid()) and (select public.is_active_staff()));
create policy "bookings: tatuadora edita las suyas" on public.bookings
  for update to authenticated
  using (artist_id = (select auth.uid()) and (select public.is_active_staff()))
  with check (artist_id = (select auth.uid()));

-- pagos
create policy "payments: admin" on public.payments
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "payments: tatuadora ve y registra de sus citas" on public.payments
  for select to authenticated using (
    exists (select 1 from public.bookings b where b.id = payments.booking_id and b.artist_id = (select auth.uid()))
    and (select public.is_active_staff())
  );
create policy "payments: tatuadora registra en sus citas" on public.payments
  for insert to authenticated with check (
    exists (select 1 from public.bookings b where b.id = payments.booking_id and b.artist_id = (select auth.uid()))
    and (select public.is_active_staff())
  );

-- caja chica: admin todo; tatuadora solo ve sus movimientos
create policy "cash: admin" on public.cash_movements
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "cash: tatuadora ve los suyos" on public.cash_movements
  for select to authenticated using (artist_id = (select auth.uid()) and (select public.is_active_staff()));

-- auditoría: solo lectura admin (se escribe por trigger)
create policy "audit: admin lee" on public.audit_log
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 9. Permisos de funciones
-- ---------------------------------------------------------------------
revoke execute on function public.create_booking(text, text, text, text, uuid, uuid, uuid, timestamptz, text, text, text, boolean, boolean) from public, anon, authenticated;
grant  execute on function public.create_booking(text, text, text, text, uuid, uuid, uuid, timestamptz, text, text, text, boolean, boolean) to service_role;

revoke execute on function public.cancel_booking_by_token(uuid) from public, anon, authenticated;
grant  execute on function public.cancel_booking_by_token(uuid) to service_role;

revoke execute on function public.get_available_slots(uuid, uuid, date, uuid) from public;
grant  execute on function public.get_available_slots(uuid, uuid, date, uuid) to anon, authenticated, service_role;

revoke execute on function public.get_public_artists(uuid) from public;
grant  execute on function public.get_public_artists(uuid) to anon, authenticated, service_role;

revoke execute on function public.handle_new_user()        from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
revoke execute on function public.protect_booking_fields() from public, anon, authenticated;
revoke execute on function public.audit_trigger()          from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 10. Datos iniciales (ajustá precios y tamaños con el estudio)
-- ---------------------------------------------------------------------
insert into public.settings (id) values (true);

insert into public.locations (name) values ('Nicoya'), ('Hojancha');

-- Lista de precios de K&K Henna Artistry (referencia).
-- Las duraciones son estimadas: confirmalas con las tatuadoras.
insert into public.size_options (label, min_cm, max_cm, price_min, price_max, duration_minutes, sort_order) values
  ('Menos de 5 cm',  1,    4,    1500, 2500, 20, 1),
  ('5 a 7 cm',       5,    7,    3500, 4500, 30, 2),
  ('7 a 10 cm',      8,    10,   6500, 7500, 45, 3),
  ('Más de 10 cm',   11,   null, 8500, 9500, 60, 4),
  ('Mano completa',  null, null, 4000, 5000, 60, 5);

-- =====================================================================
-- Después de ejecutar:
-- 1. Authentication → Sign In / Providers: desactivá "Allow new users to sign up".
-- 2. Invitá a la admin y a las tatuadoras desde Authentication → Users.
-- 3. Convertí tu cuenta en admin (reemplazá el correo):
--      update public.profiles set role = 'admin', is_active = true
--      where id = (select id from auth.users where email = 'tu@correo.com');
-- 4. Activá a cada tatuadora: update public.profiles set is_active = true where id = '...';
-- =====================================================================
