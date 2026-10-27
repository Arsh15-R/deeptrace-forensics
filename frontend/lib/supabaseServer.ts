import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kqllmwzftudlxswtnqtg.supabase.co";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: (url, options = {}) =>
      fetch(url, {
        ...options,
        cache: "no-store",
      }),
  },
  realtime: {
    transport: typeof WebSocket !== "undefined" ? WebSocket : (class DummyWS {} as any),
  },
});
