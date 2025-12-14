import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

// Endpoint rejestracji musi być obsługiwany po stronie serwera,
// aby poprawnie zarządzać sesją i ciasteczkami.
export const prerender = false;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nickRegex = /^[a-zA-Z0-9_]{3,20}$/;

interface RegisterRequestBody {
  nick?: string;
  email?: string;
  password?: string;
}

type RegisterErrorCode =
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "NICK_TAKEN"
  | "EMAIL_TAKEN"
  | "INTERNAL_ERROR";

interface ErrorResponseBody {
  code: RegisterErrorCode;
  message: string;
  errors?: Record<string, string>;
}

interface RegisterSuccessBody {
  userId: string;
  nick: string;
  email: string;
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
  let body: RegisterRequestBody;

  try {
    body = (await request.json()) as RegisterRequestBody;
  } catch {
    const errorBody: ErrorResponseBody = {
      code: "INVALID_REQUEST",
      message: "Nieprawidłowe dane żądania.",
    };
    return jsonResponse(errorBody, { status: 400 });
  }

  const rawNick = typeof body.nick === "string" ? body.nick.trim() : "";
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const email = rawEmail.toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  const fieldErrors: Record<string, string> = {};

  if (!rawNick) {
    fieldErrors.nick = "Nick jest wymagany.";
  } else if (!nickRegex.test(rawNick)) {
    fieldErrors.nick =
      "Nick powinien mieć 3–20 znaków i może zawierać litery, cyfry oraz podkreślenie.";
  }

  if (!email) {
    fieldErrors.email = "E‑mail jest wymagany.";
  } else if (!emailRegex.test(email)) {
    fieldErrors.email = "Adres e‑mail ma niepoprawny format.";
  }

  if (!password) {
    fieldErrors.password = "Hasło jest wymagane.";
  } else if (password.length < 8) {
    fieldErrors.password = "Hasło powinno mieć co najmniej 8 znaków.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    const errorBody: ErrorResponseBody = {
      code: "VALIDATION_ERROR",
      message: "Nieprawidłowe dane rejestracji.",
      errors: fieldErrors,
    };
    return jsonResponse(errorBody, { status: 400 });
  }

  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Sprawdź unikalność nicka zanim wywołasz rejestrację użytkownika.
    const {
      data: existingProfile,
      error: nickCheckError,
    } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("nick", rawNick)
      .maybeSingle();

    if (nickCheckError) {
      console.error("Failed to check nick uniqueness:", nickCheckError);
      const errorBody: ErrorResponseBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się utworzyć konta. Spróbuj ponownie.",
      };
      return jsonResponse(errorBody, { status: 500 });
    }

    if (existingProfile) {
      const errorBody: ErrorResponseBody = {
        code: "NICK_TAKEN",
        message: "Nick jest już zajęty.",
        errors: {
          nick: "Nick jest już zajęty.",
        },
      };
      return jsonResponse(errorBody, { status: 409 });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data?.user) {
      const status = (error as any)?.status ?? 400;
      const message = (error as any)?.message ?? "Nie udało się utworzyć konta.";
      const normalizedMessage = String(message).toLowerCase();

      if (
        status === 400 &&
        (normalizedMessage.includes("already registered") ||
          normalizedMessage.includes("already exists"))
      ) {
        const errorBody: ErrorResponseBody = {
          code: "EMAIL_TAKEN",
          message: "Konto z tym e‑mailem już istnieje.",
          errors: {
            email: "Konto z tym e‑mailem już istnieje.",
          },
        };
        return jsonResponse(errorBody, { status: 409 });
      }

      console.error("Supabase auth error during register:", error);

      const errorBody: ErrorResponseBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się utworzyć konta. Spróbuj ponownie.",
      };
      return jsonResponse(errorBody, { status: 500 });
    }

    const userId = data.user.id;
    const userEmail = data.user.email ?? email;

    // Utwórz profil prezentacyjny powiązany z użytkownikiem.
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        nick: rawNick,
      })
      .select("nick, user_id")
      .maybeSingle();

    if (profileError) {
      // Jeśli unikalność nicka została złamana równolegle – zmapuj na konflikt.
      const code = (profileError as any)?.code;
      if (code === "23505") {
        const errorBody: ErrorResponseBody = {
          code: "NICK_TAKEN",
          message: "Nick jest już zajęty.",
          errors: {
            nick: "Nick jest już zajęty.",
          },
        };
        return jsonResponse(errorBody, { status: 409 });
      }

      console.error("Failed to create profile during register:", profileError);

      const errorBody: ErrorResponseBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się utworzyć konta. Spróbuj ponownie.",
      };
      return jsonResponse(errorBody, { status: 500 });
    }

    const successBody: RegisterSuccessBody = {
      userId,
      nick: profile?.nick ?? rawNick,
      email: userEmail,
    };

    // Supabase ustawia sesję i cookie w ramach signUp, więc użytkownik jest
    // automatycznie zalogowany (US-003).
    return jsonResponse<RegisterSuccessBody>(successBody, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in /api/auth/register:", err);

    const errorBody: ErrorResponseBody = {
      code: "INTERNAL_ERROR",
      message: "Nie udało się utworzyć konta. Spróbuj ponownie.",
    };
    return jsonResponse(errorBody, { status: 500 });
  }
};


