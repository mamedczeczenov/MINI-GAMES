import { c as createSupabaseServerInstance } from '../../../chunks/supabase.client_DSbpnknZ.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nickRegex = /^[a-zA-Z0-9_]{3,20}$/;
function jsonResponse(body, init) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    ...init
  });
}
const POST = async ({ request, cookies }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    const errorBody = {
      code: "INVALID_REQUEST",
      message: "Nieprawidłowe dane żądania."
    };
    return jsonResponse(errorBody, { status: 400 });
  }
  const rawNick = typeof body.nick === "string" ? body.nick.trim() : "";
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const email = rawEmail.toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const fieldErrors = {};
  if (!rawNick) {
    fieldErrors.nick = "Nick jest wymagany.";
  } else if (!nickRegex.test(rawNick)) {
    fieldErrors.nick = "Nick powinien mieć 3–20 znaków i może zawierać litery, cyfry oraz podkreślenie.";
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
    const errorBody = {
      code: "VALIDATION_ERROR",
      message: "Nieprawidłowe dane rejestracji.",
      errors: fieldErrors
    };
    return jsonResponse(errorBody, { status: 400 });
  }
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers
    });
    const {
      data: existingProfile,
      error: nickCheckError
    } = await supabase.from("profiles").select("user_id").eq("nick", rawNick).maybeSingle();
    if (nickCheckError) {
      console.error("Failed to check nick uniqueness:", nickCheckError);
      const errorBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się utworzyć konta. Spróbuj ponownie."
      };
      return jsonResponse(errorBody, { status: 500 });
    }
    if (existingProfile) {
      const errorBody = {
        code: "NICK_TAKEN",
        message: "Nick jest już zajęty.",
        errors: {
          nick: "Nick jest już zajęty."
        }
      };
      return jsonResponse(errorBody, { status: 409 });
    }
    const publicSiteUrl = undefined                                ?? new URL(request.url).origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: publicSiteUrl,
        // Zachowujemy nick w metadanych użytkownika, aby móc go
        // odtworzyć i utworzyć profil nawet wtedy, gdy Supabase
        // nie zwróci od razu aktywnej sesji (np. przy wymaganym
        // potwierdzeniu e‑maila).
        data: {
          nick: rawNick
        }
      }
    });
    if (error || !data?.user) {
      const status = error?.status ?? 400;
      const message = error?.message ?? "Nie udało się utworzyć konta.";
      const supabaseCode = error?.code;
      const normalizedMessage = String(message).toLowerCase();
      if (status === 400 && (normalizedMessage.includes("already registered") || normalizedMessage.includes("already exists"))) {
        const errorBody2 = {
          code: "EMAIL_TAKEN",
          message: "Konto z tym e‑mailem już istnieje.",
          errors: {
            email: "Konto z tym e‑mailem już istnieje."
          }
        };
        return jsonResponse(errorBody2, { status: 409 });
      }
      if (status === 400 && (supabaseCode === "email_address_invalid" || normalizedMessage.includes("email address") && normalizedMessage.includes("invalid"))) {
        const errorBody2 = {
          code: "VALIDATION_ERROR",
          message: "Adres e‑mail jest nieprawidłowy.",
          errors: {
            email: "Adres e‑mail jest nieprawidłowy."
          }
        };
        return jsonResponse(errorBody2, { status: 400 });
      }
      console.error("Supabase auth error during register:", error);
      const errorBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się utworzyć konta. Spróbuj ponownie."
      };
      return jsonResponse(errorBody, { status: 500 });
    }
    const userId = data.user.id;
    const userEmail = data.user.email ?? email;
    let profileNick = rawNick;
    if (data.session) {
      const {
        data: profile,
        error: profileError
      } = await supabase.from("profiles").insert({
        user_id: userId,
        nick: rawNick
      }).select("nick, user_id").maybeSingle();
      if (profileError) {
        const code = profileError?.code;
        if (code === "23505") {
          const errorBody2 = {
            code: "NICK_TAKEN",
            message: "Nick jest już zajęty.",
            errors: {
              nick: "Nick jest już zajęty."
            }
          };
          return jsonResponse(errorBody2, { status: 409 });
        }
        console.error("Failed to create profile during register:", profileError);
        const errorBody = {
          code: "INTERNAL_ERROR",
          message: "Nie udało się utworzyć konta. Spróbuj ponownie."
        };
        return jsonResponse(errorBody, { status: 500 });
      }
      profileNick = profile?.nick ?? rawNick;
    } else {
      console.warn(
        "Skipping profile creation during register – no active session returned by Supabase."
      );
    }
    const successBody = {
      userId,
      nick: profileNick,
      email: userEmail
    };
    return jsonResponse(successBody, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in /api/auth/register:", err);
    const errorBody = {
      code: "INTERNAL_ERROR",
      message: "Nie udało się utworzyć konta. Spróbuj ponownie."
    };
    return jsonResponse(errorBody, { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
