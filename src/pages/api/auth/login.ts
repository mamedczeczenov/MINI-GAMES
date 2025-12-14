import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

// Ten endpoint musi być renderowany po stronie serwera,
// aby obsługiwać żądania POST w trybie Astro.
export const prerender = false;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginRequestBody {
  email?: string;
  password?: string;
}

type LoginErrorCode =
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "INTERNAL_ERROR";

interface ErrorResponseBody {
  code: LoginErrorCode;
  message: string;
  errors?: Record<string, string>;
}

interface LoginSuccessBody {
  userId: string;
  nick: string | null;
}

function jsonResponse<T>(
  body: T,
  init?: ResponseInit,
): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    ...init,
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: LoginRequestBody;

  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    const errorBody: ErrorResponseBody = {
      code: "INVALID_REQUEST",
      message: "Nieprawidłowe dane żądania.",
    };
    return jsonResponse(errorBody, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const fieldErrors: Record<string, string> = {};

  if (!email) {
    fieldErrors.email = "E‑mail jest wymagany.";
  } else if (!emailRegex.test(email)) {
    fieldErrors.email = "Adres e‑mail ma niepoprawny format.";
  }

  if (!password) {
    fieldErrors.password = "Hasło jest wymagane.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    const errorBody: ErrorResponseBody = {
      code: "VALIDATION_ERROR",
      message: "Nieprawidłowe dane logowania.",
      errors: fieldErrors,
    };
    return jsonResponse(errorBody, { status: 400 });
  }

  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      const status = (error as any)?.status ?? 401;

      if (status === 400 || status === 401) {
        const errorBody: ErrorResponseBody = {
          code: "INVALID_CREDENTIALS",
          message: "Nieprawidłowy e‑mail lub hasło.",
        };
        return jsonResponse(errorBody, { status: 401 });
      }

      console.error("Supabase auth error during login:", error);

      const errorBody: ErrorResponseBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się zalogować. Spróbuj ponownie.",
      };
      return jsonResponse(errorBody, { status: 500 });
    }

    const userId = data.user.id;

    // Pobierz nick z tabeli profiles (jeśli istnieje).
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("nick, user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Failed to fetch profile during login:",
        profileError,
      );
    }

    const successBody: LoginSuccessBody = {
      userId,
      nick: profile?.nick ?? null,
    };

    return jsonResponse<LoginSuccessBody>(successBody, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/auth/login:", err);

    const errorBody: ErrorResponseBody = {
      code: "INTERNAL_ERROR",
      message: "Nie udało się zalogować. Spróbuj ponownie.",
    };
    return jsonResponse(errorBody, { status: 500 });
  }
};


