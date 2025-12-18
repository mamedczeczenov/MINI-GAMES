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
const POST = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers
    });
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Supabase auth error during logout:", error);
      const errorBody = {
        code: "INTERNAL_ERROR",
        message: "Nie udało się wylogować. Spróbuj ponownie."
      };
      return jsonResponse(errorBody, { status: 500 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("Unexpected error in /api/auth/logout:", err);
    const errorBody = {
      code: "INTERNAL_ERROR",
      message: "Nie udało się wylogować. Spróbuj ponownie."
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
