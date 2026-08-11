import fs from 'node:fs/promises';
import { createServerSupabase, hasSupabaseConfig } from './supabase.js';

const TABLE = 'adra_recovery_state';

export function persistenceStatus() {
  return {
    provider: hasSupabaseConfig() ? 'supabase' : 'unconfigured',
    supabaseConfigured: hasSupabaseConfig(),
    supabaseRequired: true,
    localMirror: false,
    browserPersistence: false,
    table: TABLE,
  };
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

// Local JSON files are used only as read-only bootstrap/default data. Runtime writes never
// go to browser storage or local JSON; all mutable Assurance Regent state is persisted in Supabase.
async function readBootstrap(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return clone(fallback); }
}

function requireSupabase() {
  if (!hasSupabaseConfig()) {
    throw new Error('Assurance Regent requires Supabase. Set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) on the server.');
  }
  return createServerSupabase();
}

export async function readState(scope, file, fallback) {
  const db = requireSupabase();
  const { data, error } = await db.from(TABLE).select('payload').eq('scope', scope).maybeSingle();
  if (error) throw error;
  if (data?.payload !== undefined && data?.payload !== null) return clone(data.payload);

  const seeded = await readBootstrap(file, fallback);
  const { error: seedError } = await db
    .from(TABLE)
    .upsert({ scope, payload: seeded, updated_at: new Date().toISOString() }, { onConflict: 'scope' });
  if (seedError) throw seedError;
  return seeded;
}

export async function writeState(scope, _file, value) {
  const db = requireSupabase();
  const { error } = await db
    .from(TABLE)
    .upsert({ scope, payload: value, updated_at: new Date().toISOString() }, { onConflict: 'scope' });
  if (error) throw error;
  return value;
}
