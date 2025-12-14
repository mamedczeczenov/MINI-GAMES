import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const prerender = false;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ForgotPasswordRequestBody {
  email?: string;
}

type ForgotPasswordErrorCode =
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

interface ErrorResponseBody {
  code: ForgotPasswordErrorCode;
  message: string;
  errors?: Record<string, string>;
}

interface SuccessResponseBody {
  message: string;
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
  let body: ForgotPasswordRequestBody;

  try {
    body = (await request.json()) as ForgotPasswordRequestBody;
  } catch {
    const errorBody: ErrorResponseBody = {
      code: "INVALID_REQUEST",
      message: "Nieprawidłowe dane żądania.",
    };
    return jsonResponse(errorBody, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const fieldErrors: Record<string, string> = {};

  if (!email) {
    fieldErrors.email = "E‑mail jest wymagany.";
  } else if (!emailRegex.test(email)) {
    fieldErrors.email = "Adres e‑mail ma niepoprawny format.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    const errorBody: ErrorResponseBody = {
      code: "VALIDATION_ERROR",
      message: "Nieprawidłowe dane formularza.",
      errors: fieldErrors,
    };
    return jsonResponse(errorBody, { status: 400 });
  }

  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("Supabase error during resetPasswordForEmail:", error);
      // Nadal zwracamy 200, aby nie ujawniać, czy e‑mail istnieje w systemie.
    }

    const successBody: SuccessResponseBody = {
      message:
        "Jeśli podany e‑mail istnieje w systemie, wysłaliśmy instrukcję resetu hasła.",
    };
    return jsonResponse(successBody, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/auth/forgot-password:", err);

    const successBody: SuccessResponseBody = {
      message:
        "Jeśli podany e‑mail istnieje w systemie, wysłaliśmy instrukcję resetu hasła.",
    };
    // Nawet przy błędzie zwracamy 200 z komunikatem neutralnym.
    return jsonResponse(successBody, { status: 200 });
  }
};


