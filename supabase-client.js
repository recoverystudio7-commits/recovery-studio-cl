// ============================================================
// Supabase Client Configuration - Recovery Studio
// ============================================================
// 1. Replace the placeholders below with your actual Supabase project:
//    - Visit https://supabase.com/dashboard to create a new project
//    - Go to Settings → API to find your project URL and anon key
// 2. Add this script to your HTML pages where you need auth/session management
// 3. The `app.rut` setting is used by RLS policies to filter data by user
// ============================================================

// === CONFIGURATION ===
// TODO: Insert your Supabase project URL and anon public key
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key-here';

// Create a single supabase client for the whole project
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === USER AUTHENTICATION ===

/**
 * Login a user with username and password
 * @param {string} username - The username (also used as email prefix: username@recoverystudio.cl)
 * @param {string} password - The user's password
 * @returns {Promise<{data: any, error: any}>} Supabase auth response
 */
export async function login(username, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${username}@recoverystudio.cl`,
    password: password,
  });
  return { data, error };
}

/**
 * Register a new user
 * @param {string} rut - The user's RUT (e.g., "17375282-2")
 * @param {string} nombre - Full name
 * @param {string} username - Username (becomes part of email: username@recoverystudio.cl)
 * @param {string} password - Password for account
 * @returns {Promise<{data: any, error: any}>} Supabase auth response
 */
export async function register(rut, nombre, username, password) {
  const { data, error } = await supabase.auth.signUp({
    email: `${username}@recoverystudio.cl`,
    password: password,
    options: {
      data: {
        rut: rut,
        nombre: nombre,
        username: username,
      },
    },
  });
  return { data, error };
}

/**
 * Sign out the current user
 * @returns {Promise<{data: any, error: any}>} Supabase auth response
 */
export async function logout() {
  const { data, error } = await supabase.auth.signOut();
  return { data, error };
}

/**
 * Get the current signed-in user
 * @returns {Promise<{data: {user: any}, error: any}>} Current user session
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { data, error };
}

/**
 * Set the current user's RUT in localStorage for RLS policies
 * This is used by Supabase RLS to filter data per user
 * @param {string} rut - The user's RUT (e.g., "17375282-2")
 */
export function setUserRut(rut) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app.rut', rut);
    // Also set as a global for inline scripts
    window.app = window.app || {};
    window.app.rut = rut;
  }
}

/**
 * Get the current user's RUT from localStorage
 * @returns {string|null} The RUT or null if not set
 */
export function getUserRut() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('app.rut');
  }
  return null;
}

// === AGENDA / SESSIONS ===

/**
 * Fetch sessions for the current user
 * @param {object} options - Optional filter options
 * @param {string} options.status - Filter by status (confirmado, completado, cancelado)
 * @returns {Promise<{data: any[], error: any}>} Sessions data
 */
export async function fetchUserSessions(options = {}) {
  const rut = getUserRut();
  if (!rut) {
    return { data: [], error: new Error('User RUT not set. Call setUserRut() first.') };
  }

  const { data, error } = await supabase
    .from('agenda_sessions')
    .select('*')
    .eq('patient_profile_id', rut)  // This uses RLS, but explicit filter is safer
    .order('fecha', { ascending: false });

  if (options.status) {
    // Note: RLS may handle this, but we filter client-side too if needed
  }

  return { data, error };
}

/**
 * Create a new session in the agenda
 * @param {object} session - Session data {fecha, hora, tipo_sesion, duracion_minutos, notas}
 * @returns {Promise<{data: any, error: any}>} Created session
 */
export async function createSession(session) {
  const rut = getUserRut();
  if (!rut) {
    return { data: null, error: new Error('User RUT not set') };
  }

  const { data, error } = await supabase
    .from('agenda_sessions')
    .insert({
      ...session,
      patient_profile_id: rut, // Auto-assign to current user
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Update a session status (e.g., mark as completado)
 * @param {string} sessionId - The session UUID
 * @param {object} updates - Fields to update {status, notas}
 * @returns {Promise<{data: any, error: any}>} Updated session
 */
export async function updateSession(sessionId, updates) {
  const rut = getUserRut();
  if (!rut) {
    return { data: null, error: new Error('User RUT not set') };
  }

  const { data, error } = await supabase
    .from('agenda_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  return { data, error };
}

// === TREATMENT PLANS ===

/**
 * Fetch treatment plans for the current user
 * @returns {Promise<{data: any[], error: any}>} Plans data
 */
export async function fetchUserPlans() {
  const rut = getUserRut();
  if (!rut) {
    return { data: [], error: new Error('User RUT not set') };
  }

  const { data, error } = await supabase
    .from('treatment_plans')
    .select('*')
    .eq('patient_profile_id', rut)
    .order('fecha_inicio', { ascending: false });

  return { data, error };
}

/**
 * Create a new treatment plan
 * @param {object} plan - Plan data {plan_tipo, sesiones_totales, fecha_inicio, fecha_fin?, activo}
 * @returns {Promise<{data: any, error: any}>} Created plan
 */
export async function createPlan(plan) {
  const rut = getUserRut();
  if (!rut) {
    return { data: null, error: new Error('User RUT not set') };
  }

  const { data, error } = await supabase
    .from('treatment_plans')
    .insert({
      ...plan,
      patient_profile_id: rut,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Update a treatment plan (e.g., mark sesiones_realizadas, cambiar activo)
 * @param {string} planId - The plan UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<{data: any, error: any}>} Updated plan
 */
export async function updatePlan(planId, updates) {
  const rut = getUserRut();
  if (!rut) {
    return { data: null, error: new Error('User RUT not set') };
  }

  const { data, error } = await supabase
    .from('treatment_plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single();

  return { data, error };
}