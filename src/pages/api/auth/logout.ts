import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

// Endpoint wylogowania musi działać po stronie serwera,
// aby poprawnie zarządzać sesją i ciasteczkami Supabase.
export const prerender = false;

interface ErrorResponseBody {
  code: "INTERNAL_ERROR";
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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Supabase auth error during logout:", error);
      const errorBody: ErrorResponseBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się wylogować. Spróbuj ponownie.",
      };
      return jsonResponse(errorBody, { status: 500 });
    }

    // 204 – sukces bez treści; sesja i cookie zostały wyczyszczone.
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("Unexpected error in /api/auth/logout:", err);

    const errorBody: ErrorResponseBody = {
      code: "INTERNAL_ERROR",
      message: "Nie udało się wylogować. Spróbuj ponownie.",
    };
    return jsonResponse(errorBody, { status: 500 });
  }
};


