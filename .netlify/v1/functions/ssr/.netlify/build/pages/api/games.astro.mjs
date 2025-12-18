import { l as listActiveGames } from '../../chunks/gameService_v6Wbwfkw.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
const GET = async () => {
  try {
    const games = await listActiveGames();
    const body = {
      items: games
    };
    return jsonResponse(body, 200);
  } catch (error) {
    console.error("Unhandled error in games list endpoint:", error);
    const body = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error while fetching games list."
      }
    };
    return jsonResponse(body, 500);
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
