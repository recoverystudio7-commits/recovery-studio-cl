-- Supabase Database Setup for Recovery Studio
-- Run this in the Supabase SQL Editor after creating your project

-- 1. Create patient_profiles table (existing users with keys and usernames)
create table if not exists public.patient_profiles (
  id uuid not null default gen_random_uuid() primary key,
  rut text not null unique,              -- Existing user key (RUT, e.g., "17375282-2")
  nombre text not null,                  -- User name
  username text not null unique,         -- Username for login/identification
  telefono text,                         -- Contact phone
  created_at timestamp with time zone default timezone('utc' now()),
  updated_at timestamp with time zone default timezone('utc' now())
);

comment on table public.patient_profiles is 'Perfiles de pacientes/usuarios existentes con su RUT y username';

-- 2. Create agenda_sessions table (sessions admin will manage)
create table if not exists public.agenda_sessions (
  id uuid not null default gen_random_uuid() primary key,
  patient_profile_id uuid not null references public.patient_profiles(id) on delete cascade,
  fecha date not null,                   -- Session date
  hora text not null,                    -- Session time (e.g., "10:00", "14:30")
  tipo_sesion text not null,             -- Type: "evaluacion", "sesion_tratamiento", "plan_revision"
  duracion_minutos integer default 60,
  status text default 'confirmado',      -- confirmado, completado, cancelado, no_asistio
  notas text,                            -- Additional clinical notes
  creado_en timestamp with time zone default timezone('utc' now()),
  updated_en timestamp with time zone default timezone('utc' now())
);

comment on table public.agenda_sessions is 'Agenda de sesiones kinésicas - el admin gestiona esto';

-- 3. Create treatment_plans table (plans the admin tracks)
create table if not exists public.treatment_plans (
  id uuid not null default gen_random_uuid() primary key,
  patient_profile_id uuid not null references public.patient_profiles(id) on delete cascade,
  plan_tipo text not null,               -- e.g., "Plan Inicio 4 sesiones ($45.000)", "Plan Progreso 8 sesiones ($80.000)"
  sesiones_totales integer not null,     -- Total sessions in plan
  sesiones_realizadas integer default 0, -- Sessions already completed
  fecha_inicio date not null,            -- Plan start date
  fecha_fin date,                        -- Plan end date (nullable if ongoing)
  activo boolean default true,           -- Whether the plan is active
  creado_en timestamp with time zone default timezone('utc' now()),
  updated_en timestamp with time zone default timezone('utc' now())
);

comment on table public.treatment_plans is 'Planes de tratamiento - el admin ve sesiones restantes';

-- 4. Enable Row Level Security (RLS) on all tables
alter table public.patient_profiles enable row level security;
alter table public.agenda_sessions enable row level security;
alter table public.treatment_plans enable row level security;

-- 5. RLS Policies for patient_profiles

-- Users can view their own profile (by RUT match)
create or replace policy "Patients view own profile"
  on public.patient_profiles for select
  using ( Rut = current_setting('app.rut', true) );

-- Admins can do everything (service_role)
create or replace policy "Admins manage patient_profiles"
  on public.patient_profiles for all
  using ( auth.role() = 'service_role' );

-- 6. RLS Policies for agenda_sessions

-- Patients can view their own sessions
create or replace policy "Patients view own sessions"
  on public.agenda_sessions for select
  using ( patient_profile_id = ( select id from public.patient_profiles where Rut = current_setting('app.rut', true) )::uuid );

-- Admins can manage all sessions
create or replace policy "Admins manage agenda_sessions"
  on public.agenda_sessions for all
  using ( auth.role() = 'service_role' )
  with check ( auth.role() = 'service_role' );

-- 7. RLS Policies for treatment_plans

-- Patients can view their own plans
create or replace policy "Patients view own plans"
  on public.treatment_plans for select
  using ( patient_profile_id = ( select id from public.patient_profiles where Rut = current_setting('app.rut', true) )::uuid );

-- Admins can manage all plans
create or replace policy "Admins manage treatment_plans"
  on public.treatment_plans for all
  using ( auth.role() = 'service_role' )
  with check ( auth.role() = 'service_role' );

-- 8. Insert sample data (optional - uncomment and modify)
-- insert into public.patient_profiles (rut, nombre, username) values
-- ('17375282-2', 'Daniel Barrueto', 'daniel_barrueto'),
-- ('16482915K', 'Matías Silva', 'matas_silva');

-- grant all on all tables to anon, authenticated;
-- grant usage on schema public to anon, authenticated;