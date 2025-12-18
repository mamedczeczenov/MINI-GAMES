import type { APIRoute } from "astro";
import { getOpenRouterService } from "../../../openrouter.config";
import { OpenRouterError } from "../../../openrouter.service";

export const prerender = false;

type AnswerId = "A" | "B" | "C" | "D";

interface QuizQuestion {
  id: number;
  question: string;
  answers: Record<AnswerId, string>;
  correctAnswer: AnswerId;
  explanation?: string | null;
}

interface QuizResponseBody {
  questions: QuizQuestion[];
}

const QUIZ_JSON_EXAMPLE =
  '{"questions":[{"id":1,"question":"Treść pytania 1","answers":{"A":"Odpowiedź A","B":"Odpowiedź B","C":"Odpowiedź C","D":"Odpowiedź D"},"correctAnswer":"A","explanation":"Krótko wyjaśnij, dlaczego ta odpowiedź jest poprawna"}]}';

type QuizErrorCode =
  | "OPENROUTER_CONFIG_ERROR"
  | "OPENROUTER_NETWORK_ERROR"
  | "OPENROUTER_API_ERROR"
  | "INTERNAL_ERROR";

interface ErrorResponseBody {
  code: QuizErrorCode;
  message: string;
}

function jsonResponse<T>(body: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    ...init,
  });
}

export const GET: APIRoute = async () => {
  try {
    // 1) Quiz jest dostępny dla wszystkich użytkowników (zalogowanych i niezalogowanych).
    //    Wynik można zapisać tylko będąc zalogowanym (patrz endpoint [code]/score.ts).
    const openRouterService = getOpenRouterService();

    const messages = openRouterService.buildSystemAndUserMessages({
      systemPrompt:
        "Jesteś generatorem quizów wielokrotnego wyboru po polsku. " +
        "Zawsze zwracasz DOKŁADNIE 5 pytań, każde z odpowiedziami A, B, C, D i jedną poprawną odpowiedzią. " +
        "ZWRACASZ WYŁĄCZNIE POPRAWNY JSON w formacie jak w przykładzie (bez dodatkowego tekstu): " +
        `${QUIZ_JSON_EXAMPLE}`,
      userPrompt:
        "Wygeneruj nowy quiz mieszany (5 pytań, A–D, dokładnie jedna poprawna odpowiedź w każdym pytaniu).",
    });

    const result = await openRouterService.generateChatCompletion({
      messages,
      params: {
        temperature: 0.7,
        maxTokens: 400,
      },
    });

    let parsed = result.parsedJson as unknown;

    if (!parsed && result.text) {
      try {
        parsed = JSON.parse(result.text) as unknown;
      } catch {
        // Ignorujemy błąd – obsłużymy go niżej jako problem z formatem.
      }
    }

    let questions: QuizQuestion[] | null = null;

    if (parsed && typeof parsed === "object") {
      const anyParsed = parsed as any;

      if (Array.isArray(anyParsed.questions)) {
        questions = anyParsed.questions as QuizQuestion[];
      } else if (Array.isArray(anyParsed.quiz)) {
        // Czasem model może użyć pola "quiz" zamiast "questions".
        questions = anyParsed.quiz as QuizQuestion[];
      }
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      const errorBody: ErrorResponseBody = {
        code: "OPENROUTER_API_ERROR",
        message:
          "Usługa AI zwróciła nieprawidłowy format quizu. Spróbuj ponownie za chwilę.",
      };
      return jsonResponse(errorBody, { status: 502 });
    }

    // Dla bezpieczeństwa przycinamy do maksymalnie 5 pytań.
    const normalizedQuestions = questions.slice(0, 5).map((q, index) => ({
      ...q,
      // Upewniamy się, że id są stabilne 1..N niezależnie od tego, co zwrócił model.
      id: index + 1,
    }));

    const body: QuizResponseBody = {
      questions: normalizedQuestions,
    };

    return jsonResponse<QuizResponseBody>(body, { status: 200 });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      let status = 500;
      let code: QuizErrorCode = "INTERNAL_ERROR";
      let message =
        "Usługa AI jest chwilowo niedostępna. Spróbuj ponownie za chwilę.";

      if (error.code === "MISSING_API_KEY" || error.code === "INVALID_CONFIG") {
        status = 500;
        code = "OPENROUTER_CONFIG_ERROR";
        message =
          "Konfiguracja usługi AI jest nieprawidłowa. Skontaktuj się z administratorem.";
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

    console.error("Unexpected error in /api/ai/quiz:", error);

    const errorBody: ErrorResponseBody = {
      code: "INTERNAL_ERROR",
      message:
        "Wystąpił nieoczekiwany błąd podczas generowania quizu. Spróbuj ponownie.",
    };

    return jsonResponse(errorBody, { status: 500 });
  }
};


