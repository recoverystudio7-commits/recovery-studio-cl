# Supabase Integration for Recovery Studio

## Authentication (Auth)
- **Method**: Email + password sign-up/login
- **Provider**: Supabase Auth
- **Use case**: Patients register/log in to view their session agenda and plans

## Database Tables

### 1. `patient_profiles` - Existing users with keys and usernames
```sql
create table public.patient_profiles (
  id uuid not null default gen_random_uuid() primary key,
  rut text not null,              -- Existing user key (RUT)
  nombre text not null,           -- User name
  username text not null unique,  -- Username for login
  telefono text,                  -- Contact phone
  created_at timestamp with time zone default timezone('utc' now()),
  updated_at timestamp with time zone default timezone('utc' now())
);

-- Enable RLS
alter table public.patient_profiles enable row level security;

-- Policy: Users can view their own profile
create policy "Users can view own profile"
  on public.patient_profiles for select
  using (auth.uid()::text = auth.jwt()->>'sub');

-- Policy: Admins can manage all profiles
create policy "Admins can manage profiles"
  on public.patient_profiles for all
  with check (auth.role() = 'service_role');
```

### 2. `agenda_sessions` - Sessions the admin will manage
```sql
create table public.agenda_sessions (
  id uuid not null default gen_random_uuid() primary key,
  patient_profile_id uuid not null references public.patient_profiles(id) on delete cascade,
  fecha date not null,            -- Session date
  hora text not null,             -- Session time (e.g., "10:00")
  tipo_sesion text not null,      -- Type: "evaluacion", "sesion_tratamiento", "plan"
  duracion_minutos integer default 60,
  status text default 'confirmado', -- confirmado, completado, cancelado
  notas text,                     -- Additional notes
  creado_en timestamp with time zone default timezone('utc' now()),
  updated_en timestamp with time zone default timezone('utc' now())
);

alter table public.agenda_sessions enable row level security;

-- Policy: Patients can view their own sessions
create policy "Patients view own sessions"
  on public.agenda_sessions for select
  using (patient_profile_id = (select id from public.patient_profiles where rut = current_setting('app.rut'))::uuid);

-- Policy: Admins can manage all sessions
create policy "Admins manage sessions"
  on public.agenda_sessions for all
  using (auth.role() = 'service_role');
```

### 3. `treatment_plans` - Plans the admin tracks
```sql
create table public.treatment_plans (
  id uuid not null default gen_random_uuid() primary key,
  patient_profile_id uuid not null references public.patient_profiles(id) on delete cascade,
  plan_tipo text not null,        -- e.g., "Plan Inicio", "Plan Progreso", "Performance"
  sesiones_totales integer not null, -- Total sessions in plan
  sesiones_realizadas integer default 0,
  fecha_inicio date not null,
  fecha_fin date,
  activo boolean default true,
  creado_en timestamp with time zone default timezone('utc' now()),
  updated_en timestamp with time zone default timezone('utc' now())
);

alter table public.treatment_plans enable row level security;

-- Policy: Patients view their own plans
create policy "Patients view own plans"
  on public.treatment_plans for select
  using (patient_profile_id = (select id from public.patient_profiles where rut = current_setting('app.rut'))::uuid);

-- Policy: Admins manage all plans
create policy "Admins manage plans"
  on public.treatment_plans for all
  using (auth.role() = 'service_role');
```

## Frontend Integration

Add this to your HTML pages (e.g., `recovery_studio_inicio_m_vil/code.html`):

```html
<!-- Supabase Client -->
<script type="importmap">
{
  "imports": {
    "vue": "https://cdn.jsdelivr.net/npm/vue@3/dist/vue.esm-browser.js",
    "supabase": "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
  }
}
</script>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script>
  // Initialize Supabase
  const supabase = supabase.createClient(
    'https://YOUR_PROJECT_REF.supabase.co',
    'YOUR_PUBLIC_ANON_KEY'
  );

  // Set current user's RUT for RLS policies
  function setUserRut(rut) {
    // This would be set after login
    localStorage.setItem('app Rut', rut);
  }

  // Login function
  async function login(username, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${username}@recoverystudio.cl`,  // or use username directly
      password: password
    });
    return { data, error };
  }

  // Register function
  async function register(rut, nombre, username, password) {
    const { data, error } = await supabase.auth.signUp({
      email: `${username}@recoverystudio.cl`,
      password: password,
      options: {
        data: {
          rut: rut,
          nombre: nombre,
          username: username
        }
      }
    });
    return { data, error };
  }
</script>
```

## Edge Functions (Optional)

For admin agenda management, you can create edge functions:

- `get-patient-sessions` - Get sessions for a patient
- `create-session` - Create a new session (admin only)
- `update-plan` - Update treatment plan status

## DNS Configuration for .nic.cl

After pushing to GitHub Pages:

1. **A Records** (4 IPs):
   - 185.199.108.153
   - 185.199.109.153
   - 185.199.110.153
   - 185.199.111.153

2. **CNAME**:
   - `recoverystudio-cl.github.io` or your custom domain

3. **In nic.cl panel**:
   - Add domain: `recoverystudio.cl`
   - Add domain: `www.recoverystudio.cl`
   - Configure DNS as above

## Push Command (when GitHub remote is set)

```bash
git remote add origin https://github.com/barru/recovery-studio-cl.git
git push -u origin master
# Then in GitHub: Settings → Pages → Source: master branch
# Configure custom domain: recoverystudio.cl
```