import type { AstroCookies } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Prefer explicit SUPABASE_* keys; keep PUBLIC_* as secondary fallback.
// Also allow reading from process.env when running in Node.
const metaEnv =
  typeof import.meta !== 'undefined' && (import.meta as any)?.env
    ? (import.meta as any).env
    : {};
const nodeEnv = typeof process !== 'undefined' ? process.env : {};
const env = { ...metaEnv, ...nodeEnv };

const supabaseUrl = env.SUPABASE_URL || env.SUPABASE_URL;
const supabaseAnonKey = env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[supabase] Missing SUPABASE_URL and SUPABASE_KEY (anon key for browser)",
  );
}
const isProd = import.meta.env.PROD;

/**
 * Klient Supabase używany po stronie przeglądarki / bez sesji użytkownika.
 * Wykorzystywany m.in. do publicznych zapytań (lista gier, leaderboard).
 */
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);

/**
 * Domyślne opcje ciasteczek dla sesji Supabase Auth.
 * Zgodne z zaleceniami: httpOnly, sameSite=lax, secure w produkcji.
 */
export const cookieOptions = {
  name: "sb-auth-token",
  path: "/",
  secure: isProd,
  httpOnly: true,
  sameSite: "lax",
};

function parseCookieHeader(cookieHeader: string): {
  name: string;
  value: string;
}[] {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Tworzy instancję Supabase powiązaną z aktualnym żądaniem HTTP (SSR),
 * używaną w routach API Astro do logowania, rejestracji itd.
 */
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
}) => {
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  return supabase;
};

