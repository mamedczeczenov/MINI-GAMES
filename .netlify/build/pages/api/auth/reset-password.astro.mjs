import { c as createSupabaseServerInstance } from '../../../chunks/supabase.client_DSbpnknZ.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
function jsonResponse(body, init) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    ...init
  });
}
const MIN_PASSWORD_LENGTH = 8;
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
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
  const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";
  const fieldErrors = {};
  if (!newPassword) {
    fieldErrors.newPassword = "Hasło jest wymagane.";
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.newPassword = "Hasło powinno mieć co najmniej 8 znaków.";
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
    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (sessionError || !sessionData?.session) {
        const errorBody = {
          code: "UNAUTHORIZED",
          message: "Link do resetu hasła jest nieaktywny lub wygasł. Poproś o nową instrukcję."
        };
        return jsonResponse(errorBody, { status: 401 });
      }
    }
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError || !user) {
      const errorBody = {
        code: "UNAUTHORIZED",
        message: "Link do resetu hasła jest nieaktywny lub wygasł. Poproś o nową instrukcję."
      };
      return jsonResponse(errorBody, { status: 401 });
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (updateError) {
      console.error("Supabase error during password update:", updateError);
      const errorBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się zmienić hasła. Spróbuj ponownie."
      };
      return jsonResponse(errorBody, { status: 500 });
    }
    const successBody = {
      message: "Hasło zostało zmienione. Możesz teraz się zalogować."
    };
    return jsonResponse(successBody, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/auth/reset-password:", err);
    const errorBody = {
      code: "INTERNAL_ERROR",
      message: "Nie udało się zmienić hasła. Spróbuj ponownie."
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
