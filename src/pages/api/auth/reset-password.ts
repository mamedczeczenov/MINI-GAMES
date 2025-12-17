import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const prerender = false;

interface ResetPasswordRequestBody {
  newPassword?: string;
  accessToken?: string;
  refreshToken?: string;
}

type ResetPasswordErrorCode =
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

interface ErrorResponseBody {
  code: ResetPasswordErrorCode;
  message: string;
  errors?: Record<string, string>;
}

interface SuccessResponseBody {
  message: string;
}

function jsonResponse<T>(body: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    ...init,
  });
}

const MIN_PASSWORD_LENGTH = 8;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: ResetPasswordRequestBody;

  try {
    body = (await request.json()) as ResetPasswordRequestBody;
  } catch {
    const errorBody: ErrorResponseBody = {
      code: "INVALID_REQUEST",
      message: "Nieprawidłowe dane żądania.",
    };
    return jsonResponse(errorBody, { status: 400 });
  }

  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";
  const accessToken =
    typeof body.accessToken === "string" ? body.accessToken : "";
  const refreshToken =
    typeof body.refreshToken === "string" ? body.refreshToken : "";

  const fieldErrors: Record<string, string> = {};

  if (!newPassword) {
    fieldErrors.newPassword = "Hasło jest wymagane.";
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.newPassword = "Hasło powinno mieć co najmniej 8 znaków.";
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

    // Jeśli przekazano tokeny z linku resetującego, najpierw próbujemy
    // wymienić je na sesję po stronie Supabase (ustawi to ciasteczka).
    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

      if (sessionError || !sessionData?.session) {
        const errorBody: ErrorResponseBody = {
          code: "UNAUTHORIZED",
          message:
            "Link do resetu hasła jest nieaktywny lub wygasł. Poproś o nową instrukcję.",
        };
        return jsonResponse(errorBody, { status: 401 });
      }
    }

    // Upewniamy się, że po wymianie tokenów mamy zalogowanego użytkownika
    // w aktualnej sesji (recovery).
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      const errorBody: ErrorResponseBody = {
        code: "UNAUTHORIZED",
        message:
          "Link do resetu hasła jest nieaktywny lub wygasł. Poproś o nową instrukcję.",
      };
      return jsonResponse(errorBody, { status: 401 });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error("Supabase error during password update:", updateError);

      const errorBody: ErrorResponseBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się zmienić hasła. Spróbuj ponownie.",
      };
      return jsonResponse(errorBody, { status: 500 });
    }

    const successBody: SuccessResponseBody = {
      message: "Hasło zostało zmienione. Możesz teraz się zalogować.",
    };
    return jsonResponse(successBody, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/auth/reset-password:", err);

    const errorBody: ErrorResponseBody = {
      code: "INTERNAL_ERROR",
      message: "Nie udało się zmienić hasła. Spróbuj ponownie.",
    };
    return jsonResponse(errorBody, { status: 500 });
  }
};


