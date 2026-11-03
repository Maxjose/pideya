import { createClient } from '@supabase/supabase-js';

// La clave publicable es segura en el cliente: el acceso real lo controlan las reglas RLS de la base de datos.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://jmjnittawsjtpwhxgdsg.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_-larIspAXo1xKcDIw3sJdg_pN2huCsO';

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
