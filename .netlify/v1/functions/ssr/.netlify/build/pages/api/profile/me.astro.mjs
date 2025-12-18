import { c as createSupabaseServerInstance } from '../../../chunks/supabase.client_DSbpnknZ.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const nickRegex = /^[a-zA-Z0-9_]{3,20}$/;
function jsonResponse(body, init) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    ...init
  });
}
const GET = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers
    });
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError || !user) {
      const errorBody = {
        code: "UNAUTHORIZED",
        message: "Użytkownik nie jest zalogowany."
      };
      return jsonResponse(errorBody, { status: 401 });
    }
    const {
      data: profile,
      error: profileError
    } = await supabase.from("profiles").select("user_id, nick, created_at, updated_at").eq("user_id", user.id).maybeSingle();
    if (profileError) {
      console.error("Failed to fetch profile in /api/profile/me:", profileError);
      const errorBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się pobrać profilu użytkownika."
      };
      return jsonResponse(errorBody, { status: 500 });
    }
    if (!profile) {
      const rawMetaNick = typeof user.user_metadata?.nick === "string" ? user.user_metadata.nick.trim() : "";
      const candidateNick = rawMetaNick && nickRegex.test(rawMetaNick) ? rawMetaNick : "gracz";
      let createdProfile = null;
      try {
        const {
          data: insertedProfile,
          error: insertError
        } = await supabase.from("profiles").insert({
          user_id: user.id,
          nick: candidateNick
        }).select("user_id, nick, created_at, updated_at").maybeSingle();
        if (insertError) {
          console.error(
            "Failed to auto-create profile in /api/profile/me:",
            insertError
          );
        } else if (insertedProfile) {
          createdProfile = {
            user_id: insertedProfile.user_id,
            nick: insertedProfile.nick,
            created_at: insertedProfile.created_at,
            updated_at: insertedProfile.updated_at
          };
        }
      } catch (insertUnexpectedError) {
        console.error(
          "Unexpected error while auto-creating profile in /api/profile/me:",
          insertUnexpectedError
        );
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const effectiveProfile = createdProfile ?? {
        user_id: user.id,
        nick: candidateNick,
        created_at: now,
        updated_at: now
      };
      return jsonResponse(effectiveProfile, { status: 200 });
    }
    const responseBody = {
      user_id: profile.user_id,
      nick: profile.nick,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
    return jsonResponse(responseBody, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/profile/me:", err);
    const errorBody = {
      code: "INTERNAL_ERROR",
      message: "Nie udało się pobrać profilu użytkownika."
    };
    return jsonResponse(errorBody, { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
