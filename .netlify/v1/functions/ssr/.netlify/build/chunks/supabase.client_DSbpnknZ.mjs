import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = "https://jyoiswzrocbdigxaodxi.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5b2lzd3pyb2NiZGlneGFvZHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDQ0OTAsImV4cCI6MjA4MDUyMDQ5MH0.yd0qz-17J4WGQ_rx2V0rjU5K7S_BpcHkTXnisec64vk";
const isProd = true;
const supabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);
const cookieOptions = {
  name: "sb-auth-token",
  path: "/",
  secure: isProd,
  httpOnly: true,
  sameSite: "lax"
};
function parseCookieHeader(cookieHeader) {
  if (!cookieHeader) {
    return [];
  }
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}
const createSupabaseServerInstance = (context) => {
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => context.cookies.set(name, value, options)
          );
        }
      }
    }
  );
  return supabase;
};

export { createSupabaseServerInstance as c, supabaseClient as s };
