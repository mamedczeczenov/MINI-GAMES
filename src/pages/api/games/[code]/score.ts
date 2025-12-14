import type { APIRoute } from "astro";
import type {
  CreateScoreForSessionCommand,
  ScoreDto,
} from "../../../../types";
import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { getGameByCode } from "../../../../services/gameService";

export const prerender = false;

class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: string;
  };
};

function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function validateGameCode(code: string | undefined): string {
  if (!code) {
    throw new HttpError(
      400,
      "INVALID_QUERY",
      "Path parameter 'code' is required.",
    );
  }

  const trimmed = code.trim();

  if (trimmed.length === 0 || trimmed.length > 64) {
    throw new HttpError(
      400,
      "INVALID_QUERY",
      "Path parameter 'code' must be between 1 and 64 characters.",
    );
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new HttpError(
      400,
      "INVALID_QUERY",
      "Path parameter 'code' may only contain letters, digits, '_' and '-'.",
    );
  }

  return trimmed;
}

function validateScoreCommand(
  gameCode: string,
  body: unknown,
): CreateScoreForSessionCommand {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(
      400,
      "INVALID_BODY",
      "Request body must be a JSON object.",
    );
  }

  const { reaction_time_ms, hits } = body as {
    reaction_time_ms?: unknown;
    hits?: unknown;
  };

  if (gameCode === "reaction_test") {
    if (reaction_time_ms == null) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'reaction_time_ms' is required for reaction time games.",
      );
    }

    const value = Number(reaction_time_ms);

    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'reaction_time_ms' must be a positive integer.",
      );
    }

    if (value > 600000) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'reaction_time_ms' is unrealistically large.",
      );
    }

    return {
      reaction_time_ms: value,
    };
  }

  if (gameCode === "aim_trainer") {
    if (hits == null) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is required for aim trainer games.",
      );
    }

    const value = Number(hits);

    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' must be a positive integer.",
      );
    }

    if (value > 10000) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is unrealistically large.",
      );
    }

    return {
      hits: value,
    };
  }

  if (gameCode === "tic_tac_toe") {
    if (hits == null) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is required for tic_tac_toe games.",
      );
    }

    const value = Number(hits);

    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' must be a positive integer.",
      );
    }

    if (value > 1000) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is unrealistically large for tic_tac_toe.",
      );
    }

    return {
      hits: value,
    };
  }

  if (gameCode === "ai_quiz") {
    if (hits == null) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is required for ai_quiz games.",
      );
    }

    const value = Number(hits);

    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' must be a non-negative integer.",
      );
    }

    if (value > 100) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is unrealistically large for ai_quiz.",
      );
    }

    return {
      hits: value,
    };
  }

  throw new HttpError(
    400,
    "VALIDATION_ERROR",
    "Unsupported game type for score submission.",
  );
}

export const POST: APIRoute = async ({ request, params, cookies }) => {
  try {
    const gameCode = validateGameCode(params.code);
    const body = await request.json().catch(() => {
      throw new HttpError(
        400,
        "INVALID_BODY",
        "Invalid JSON in request body.",
      );
    });

    const command = validateScoreCommand(gameCode, body);

    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies,
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new HttpError(
        401,
        "UNAUTHENTICATED",
        "Musisz być zalogowany, aby zapisać wynik.",
      );
    }

    const game = await getGameByCode(gameCode);

    if (!game) {
      throw new HttpError(404, "GAME_NOT_FOUND", "Game not found.");
    }

    const userId = user.id;

    // Upewnij się, że użytkownik ma profil (i tym samym nick),
    // zanim pozwolimy zapisać wynik do rankingu.
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("user_id, nick")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      throw new HttpError(
        500,
        "PROFILE_CHECK_FAILED",
        "Nie udało się zweryfikować profilu użytkownika.",
      );
    }

    if (!profile || !profile.nick) {
      throw new HttpError(
        400,
        "PROFILE_REQUIRED",
        "Aby zapisać wynik w rankingu, ustaw najpierw swój nick w profilu.",
      );
    }

    const {
      data: session,
      error: sessionError,
    } = await supabase
      .from("game_sessions")
      .insert({
        game_id: game.id,
        user_id: userId,
      })
      .select("*")
      .maybeSingle();

    if (sessionError || !session) {
      throw new HttpError(
        500,
        "SESSION_CREATE_FAILED",
        "Nie udało się utworzyć sesji gry.",
      );
    }

    const isReactionTest = gameCode === "reaction_test";
    const isAimTrainer = gameCode === "aim_trainer";
    const isTicTacToe = gameCode === "tic_tac_toe";
    const isAiQuiz = gameCode === "ai_quiz";

    if (!isReactionTest && !isAimTrainer && !isTicTacToe && !isAiQuiz) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Unsupported game type for score submission.",
      );
    }

    let scoreValue: number;
    let reactionTimeMs: number | null = null;
    let hits: number | null = null;

    if (isReactionTest) {
      reactionTimeMs = command.reaction_time_ms!;
      scoreValue = reactionTimeMs;
    } else if (isAiQuiz) {
      hits = command.hits ?? 0;
      const totalQuestions = 5;
      const percent =
        totalQuestions > 0 ? (hits / totalQuestions) * 100 : 0;
      scoreValue = Number(percent.toFixed(2));
    } else {
      hits = command.hits!;
      scoreValue = hits;
    }

    const {
      data: score,
      error: scoreError,
    } = await supabase
      .from("scores")
      .insert({
        game_session_id: session.id,
        game_id: game.id,
        user_id: userId,
        score_value: scoreValue,
        reaction_time_ms: reactionTimeMs,
        hits,
      })
      .select(
        "id, game_session_id, game_id, user_id, score_value, reaction_time_ms, hits, created_at",
      )
      .maybeSingle();

    if (scoreError || !score) {
      throw new HttpError(
        500,
        "SCORE_CREATE_FAILED",
        "Nie udało się zapisać wyniku.",
      );
    }

    const responseBody: ScoreDto = score;

    return jsonResponse<ScoreDto>(responseBody, 201);
  } catch (error) {
    if (error instanceof HttpError) {
      const body: ErrorBody = {
        error: {
          code: error.code,
          message: error.message,
        },
      };

      return jsonResponse(body, error.status);
    }

    console.error("Unhandled error in score endpoint:", error);

    const body: ErrorBody = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error while saving score.",
      },
    };

    return jsonResponse(body, 500);
  }
};



