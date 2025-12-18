import { c as createSupabaseServerInstance } from '../../../chunks/supabase.client_DSbpnknZ.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fieldErrors = {};
  if (!email) {
    fieldErrors.email = "E‑mail jest wymagany.";
  } else if (!emailRegex.test(email)) {
    fieldErrors.email = "Adres e‑mail ma niepoprawny format.";
  }
  if (!password) {
    fieldErrors.password = "Hasło jest wymagane.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    const errorBody = {
      code: "VALIDATION_ERROR",
      message: "Nieprawidłowe dane logowania.",
      errors: fieldErrors
    };
    return jsonResponse(errorBody, { status: 400 });
  }
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error || !data?.user) {
      const status = error?.status ?? 401;
      if (status === 400 || status === 401) {
        const errorBody2 = {
          code: "INVALID_CREDENTIALS",
          message: "Nieprawidłowy e‑mail lub hasło."
        };
        return jsonResponse(errorBody2, { status: 401 });
      }
      console.error("Supabase auth error during login:", error);
      const errorBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się zalogować. Spróbuj ponownie."
      };
      return jsonResponse(errorBody, { status: 500 });
    }
    const userId = data.user.id;
    const {
      data: profile,
      error: profileError
    } = await supabase.from("profiles").select("nick, user_id").eq("user_id", userId).maybeSingle();
    if (profileError) {
      console.error(
        "Failed to fetch profile during login:",
        profileError
      );
    }
    const successBody = {
      userId,
      nick: profile?.nick ?? null
    };
    return jsonResponse(successBody, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/auth/login:", err);
    const errorBody = {
      code: "INTERNAL_ERROR",
      message: "Nie udało się zalogować. Spróbuj ponownie."
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
