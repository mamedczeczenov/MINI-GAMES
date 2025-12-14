import type { AstroCookies } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;
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

