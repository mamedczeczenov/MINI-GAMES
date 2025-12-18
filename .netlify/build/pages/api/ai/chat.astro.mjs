import { g as getOpenRouterService, O as OpenRouterError } from '../../../chunks/openrouter.config_B58yPM7B.mjs';
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
const POST = async ({ request }) => {
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
  const userPrompt = typeof body.userPrompt === "string" ? body.userPrompt.trim() : "";
  const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : void 0;
  const history = Array.isArray(body.history) ? body.history : [];
  if (!userPrompt) {
    const errorBody = {
      code: "VALIDATION_ERROR",
      message: "Pole userPrompt jest wymagane."
    };
    return jsonResponse(errorBody, { status: 400 });
  }
  try {
    const openRouterService = getOpenRouterService();
    const messages = openRouterService.buildSystemAndUserMessages({
      systemPrompt,
      userPrompt,
      history
    });
    const result = await openRouterService.generateChatCompletion({
      messages
    });
    const successBody = {
      text: result.text,
      parsedJson: result.parsedJson,
      model: result.model
    };
    return jsonResponse(successBody, { status: 200 });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      let status = 500;
      let code = "INTERNAL_ERROR";
      let message = "Usługa AI jest chwilowo niedostępna. Spróbuj ponownie za chwilę.";
      if (error.code === "MISSING_API_KEY" || error.code === "INVALID_CONFIG") {
        status = 500;
        code = "OPENROUTER_CONFIG_ERROR";
        message = "Konfiguracja usługi AI jest nieprawidłowa. Skontaktuj się z administratorem.";
      } else if (error.code === "INVALID_INPUT") {
        status = 400;
        code = "VALIDATION_ERROR";
        message = "Nieprawidłowe dane wejściowe do usługi AI.";
      } else if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") {
        status = 503;
        code = "OPENROUTER_NETWORK_ERROR";
      } else if (error.code === "API_ERROR" || error.code === "INVALID_JSON") {
        status = 502;
        code = "OPENROUTER_API_ERROR";
      }
      const errorBody2 = {
        code,
        message
      };
      return jsonResponse(errorBody2, { status });
    }
    console.error("Unexpected error in /api/ai/chat:", error);
    const errorBody = {
      code: "INTERNAL_ERROR",
      message: "Wystąpił nieoczekiwany błąd podczas wywołania usługi AI. Spróbuj ponownie."
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
