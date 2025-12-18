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
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fieldErrors = {};
  if (!email) {
    fieldErrors.email = "E‑mail jest wymagany.";
  } else if (!emailRegex.test(email)) {
    fieldErrors.email = "Adres e‑mail ma niepoprawny format.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    const errorBody = {
      code: "VALIDATION_ERROR",
      message: "Nieprawidłowe dane formularza.",
      errors: fieldErrors
    };
    return jsonResponse(errorBody, { status: 400 });
  }
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers
    });
    const publicSiteUrl = undefined                                ?? new URL(request.url).origin;
    const redirectTo = `${publicSiteUrl}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    if (error) {
      console.error("Supabase error during resetPasswordForEmail:", error);
    }
    const successBody = {
      message: "Jeśli podany e‑mail istnieje w systemie, wysłaliśmy instrukcję resetu hasła."
    };
    return jsonResponse(successBody, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/auth/forgot-password:", err);
    const successBody = {
      message: "Jeśli podany e‑mail istnieje w systemie, wysłaliśmy instrukcję resetu hasła."
    };
    return jsonResponse(successBody, { status: 200 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
