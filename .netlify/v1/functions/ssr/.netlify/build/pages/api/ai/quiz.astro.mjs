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
const GET = async () => {
  try {
    const openRouterService = getOpenRouterService();
    const messages = openRouterService.buildSystemAndUserMessages({
      systemPrompt: "Jesteś generatorem quizów wielokrotnego wyboru po polsku. Zawsze zwracasz DOKŁADNIE 5 pytań, każde z odpowiedziami A, B, C, D i jedną poprawną odpowiedzią.",
      userPrompt: "Wygeneruj nowy quiz mieszany (5 pytań, A–D, dokładnie jedna poprawna odpowiedź w każdym pytaniu)."
    });
    const quizSchema = {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "number" },
              question: { type: "string" },
              answers: {
                type: "object",
                properties: {
                  A: { type: "string" },
                  B: { type: "string" },
                  C: { type: "string" },
                  D: { type: "string" }
                },
                required: ["A", "B", "C", "D"]
              },
              correctAnswer: {
                type: "string",
                enum: ["A", "B", "C", "D"]
              },
              explanation: { type: "string" }
            },
            required: ["id", "question", "answers", "correctAnswer"]
          },
          minItems: 5,
          maxItems: 5
        }
      },
      required: ["questions"]
    };
    const responseFormat = openRouterService.buildJsonSchemaResponseFormat(
      "quiz_response",
      quizSchema
    );
    const result = await openRouterService.generateChatCompletion({
      messages,
      responseFormat,
      params: {
        temperature: 0.5,
        maxTokens: 800
        // Zwiększone dla 5 pytań z wyjaśnieniami
      }
    });
    let parsed = result.parsedJson;
    if (!parsed && result.text) {
      try {
        parsed = JSON.parse(result.text);
      } catch {
      }
    }
    let questions = null;
    if (parsed && typeof parsed === "object") {
      const anyParsed = parsed;
      if (Array.isArray(anyParsed.questions)) {
        questions = anyParsed.questions;
      } else if (Array.isArray(anyParsed.quiz)) {
        questions = anyParsed.quiz;
      }
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      const errorBody = {
        code: "OPENROUTER_API_ERROR",
        message: "Usługa AI zwróciła nieprawidłowy format quizu. Spróbuj ponownie za chwilę."
      };
      return jsonResponse(errorBody, { status: 502 });
    }
    const normalizedQuestions = questions.slice(0, 5).map((q, index) => ({
      ...q,
      // Upewniamy się, że id są stabilne 1..N niezależnie od tego, co zwrócił model.
      id: index + 1
    }));
    const body = {
      questions: normalizedQuestions
    };
    return jsonResponse(body, { status: 200 });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      let status = 500;
      let code = "INTERNAL_ERROR";
      let message = "Usługa AI jest chwilowo niedostępna. Spróbuj ponownie za chwilę.";
      if (error.code === "MISSING_API_KEY" || error.code === "INVALID_CONFIG") {
        status = 500;
        code = "OPENROUTER_CONFIG_ERROR";
        message = "Konfiguracja usługi AI jest nieprawidłowa. Skontaktuj się z administratorem.";
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
    console.error("Unexpected error in /api/ai/quiz:", error);
    const errorBody = {
      code: "INTERNAL_ERROR",
      message: "Wystąpił nieoczekiwany błąd podczas generowania quizu. Spróbuj ponownie."
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
