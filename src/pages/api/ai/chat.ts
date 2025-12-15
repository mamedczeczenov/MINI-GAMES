import type { APIRoute } from "astro";
import { getOpenRouterService } from "../../../openrouter.config";
import { OpenRouterError } from "../../../openrouter.service";
import type { ChatMessage } from "../../../openrouter.service";

export const prerender = false;

interface ChatRequestBody {
  systemPrompt?: string;
  userPrompt?: string;
  history?: ChatMessage[];
}

type ChatErrorCode =
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "OPENROUTER_CONFIG_ERROR"
  | "OPENROUTER_NETWORK_ERROR"
  | "OPENROUTER_API_ERROR"
  | "INTERNAL_ERROR";

interface ErrorResponseBody {
  code: ChatErrorCode;
  message: string;
}

interface ChatSuccessBody {
  text?: string;
  parsedJson?: unknown;
  model: string;
}

function jsonResponse<T>(body: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    ...init,
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    const errorBody: ErrorResponseBody = {
      code: "INVALID_REQUEST",
      message: "Nieprawidłowe dane żądania.",
    };
    return jsonResponse(errorBody, { status: 400 });
  }

  const userPrompt =
    typeof body.userPrompt === "string" ? body.userPrompt.trim() : "";
  const systemPrompt =
    typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : undefined;
  const history = Array.isArray(body.history) ? body.history : [];

  if (!userPrompt) {
    const errorBody: ErrorResponseBody = {
      code: "VALIDATION_ERROR",
      message: "Pole userPrompt jest wymagane.",
    };
    return jsonResponse(errorBody, { status: 400 });
  }

  try {
    const openRouterService = getOpenRouterService();

    const messages = openRouterService.buildSystemAndUserMessages({
      systemPrompt,
      userPrompt,
      history,
    });

    const result = await openRouterService.generateChatCompletion({
      messages,
    });

    const successBody: ChatSuccessBody = {
      text: result.text,
      parsedJson: result.parsedJson,
      model: result.model,
    };

    return jsonResponse(successBody, { status: 200 });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      // Nie logujemy wrażliwych danych; polegamy na logowaniu w samym serwisie.
      let status = 500;
      let code: ChatErrorCode = "INTERNAL_ERROR";
      let message =
        "Usługa AI jest chwilowo niedostępna. Spróbuj ponownie za chwilę.";

      if (error.code === "MISSING_API_KEY" || error.code === "INVALID_CONFIG") {
        status = 500;
        code = "OPENROUTER_CONFIG_ERROR";
        message =
          "Konfiguracja usługi AI jest nieprawidłowa. Skontaktuj się z administratorem.";
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

      const errorBody: ErrorResponseBody = {
        code,
        message,
      };

      return jsonResponse(errorBody, { status });
    }

    // Nieznany błąd – logujemy i zwracamy standardową odpowiedź 500.
    console.error("Unexpected error in /api/ai/chat:", error);

    const errorBody: ErrorResponseBody = {
      code: "INTERNAL_ERROR",
      message:
        "Wystąpił nieoczekiwany błąd podczas wywołania usługi AI. Spróbuj ponownie.",
    };

    return jsonResponse(errorBody, { status: 500 });
  }
};


