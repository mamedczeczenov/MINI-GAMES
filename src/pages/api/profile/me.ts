import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import type { ProfileDto } from "../../../types";

// Endpoint profilu użytkownika musi działać po stronie serwera,
// aby mieć dostęp do sesji Supabase (cookie).
export const prerender = false;

// Ten sam wzorzec walidacji nicka, co w endpointzie rejestracji.
// Utrzymujemy go lokalnie, aby uniknąć zależności cyklicznych.
const nickRegex = /^[a-zA-Z0-9_]{3,20}$/;

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
      // spróbuj utworzyć go na podstawie metadanych użytkownika z Supabase
      // (ustawianych podczas rejestracji), a jeśli ich brak – użyj domyślnego nicka.
      const rawMetaNick =
        typeof (user.user_metadata as any)?.nick === "string"
          ? ((user.user_metadata as any).nick as string).trim()
          : "";

      const candidateNick =
        rawMetaNick && nickRegex.test(rawMetaNick) ? rawMetaNick : "gracz";

      let createdProfile: ProfileDto | null = null;

      try {
        const {
          data: insertedProfile,
          error: insertError,
        } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            nick: candidateNick,
          })
          .select("user_id, nick, created_at, updated_at")
          .maybeSingle();

        if (insertError) {
          // W przypadku konfliktu unikalności (kod 23505) logujemy błąd
          // i przechodzimy dalej, zwracając profil „w pamięci”, żeby UI
          // nadal działało. Można tu później dodać generowanie alternatywnego nicka.
          console.error(
            "Failed to auto-create profile in /api/profile/me:",
            insertError,
          );
        } else if (insertedProfile) {
          createdProfile = {
            user_id: insertedProfile.user_id,
            nick: insertedProfile.nick,
            created_at: insertedProfile.created_at,
            updated_at: insertedProfile.updated_at,
          };
        }
      } catch (insertUnexpectedError) {
        console.error(
          "Unexpected error while auto-creating profile in /api/profile/me:",
          insertUnexpectedError,
        );
      }

      const now = new Date().toISOString();
      const effectiveProfile: ProfileDto =
        createdProfile ?? ({
          user_id: user.id,
          nick: candidateNick,
          created_at: now,
          updated_at: now,
        } as ProfileDto);

      return jsonResponse<ProfileDto>(effectiveProfile, { status: 200 });
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


