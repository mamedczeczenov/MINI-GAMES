import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import type { ProfileDto } from "../../../types";

// Endpoint profilu użytkownika musi działać po stronie serwera,
// aby mieć dostęp do sesji Supabase (cookie).
export const prerender = false;

type ProfileErrorCode = "UNAUTHORIZED" | "INTERNAL_ERROR";

interface ErrorResponseBody {
  code: ProfileErrorCode;
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

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Najpierw sprawdzamy, czy istnieje zalogowany użytkownik (sesja).
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      const errorBody: ErrorResponseBody = {
        code: "UNAUTHORIZED",
        message: "Użytkownik nie jest zalogowany.",
      };
      return jsonResponse(errorBody, { status: 401 });
    }

    // Następnie pobieramy profil prezentacyjny (nick itp.).
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("user_id, nick, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Failed to fetch profile in /api/profile/me:", profileError);
      const errorBody: ErrorResponseBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się pobrać profilu użytkownika.",
      };
      return jsonResponse(errorBody, { status: 500 });
    }

    if (!profile) {
      // Jeśli użytkownik ma sesję, ale nie ma jeszcze rekordu w `profiles`,
      // traktujemy go nadal jako zalogowanego, ale bez nicku.
      const now = new Date().toISOString();
      const fallbackProfile: ProfileDto = {
        user_id: user.id,
        nick: "gracz",
        created_at: now,
        updated_at: now,
      };

      return jsonResponse<ProfileDto>(fallbackProfile, { status: 200 });
    }

    const responseBody: ProfileDto = {
      user_id: profile.user_id,
      nick: profile.nick,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    return jsonResponse<ProfileDto>(responseBody, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/profile/me:", err);

    const errorBody: ErrorResponseBody = {
      code: "INTERNAL_ERROR",
      message: "Nie udało się pobrać profilu użytkownika.",
    };
    return jsonResponse(errorBody, { status: 500 });
  }
};


