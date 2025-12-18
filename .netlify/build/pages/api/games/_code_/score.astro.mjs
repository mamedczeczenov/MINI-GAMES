import { c as createSupabaseServerInstance } from '../../../../chunks/supabase.client_DSbpnknZ.mjs';
import { g as getGameByCode } from '../../../../chunks/gameService_v6Wbwfkw.mjs';
export { renderers } from '../../../../renderers.mjs';

const prerender = false;
class HttpError extends Error {
  status;
  code;
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
function validateGameCode(code) {
  if (!code) {
    throw new HttpError(
      400,
      "INVALID_QUERY",
      "Path parameter 'code' is required."
    );
  }
  const trimmed = code.trim();
  if (trimmed.length === 0 || trimmed.length > 64) {
    throw new HttpError(
      400,
      "INVALID_QUERY",
      "Path parameter 'code' must be between 1 and 64 characters."
    );
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new HttpError(
      400,
      "INVALID_QUERY",
      "Path parameter 'code' may only contain letters, digits, '_' and '-'."
    );
  }
  return trimmed;
}
function validateScoreCommand(gameCode, body) {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(
      400,
      "INVALID_BODY",
      "Request body must be a JSON object."
    );
  }
  const { reaction_time_ms, hits } = body;
  if (gameCode === "reaction_test") {
    if (reaction_time_ms == null) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'reaction_time_ms' is required for reaction time games."
      );
    }
    const value = Number(reaction_time_ms);
    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'reaction_time_ms' must be a positive integer."
      );
    }
    if (value > 6e5) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'reaction_time_ms' is unrealistically large."
      );
    }
    return {
      reaction_time_ms: value
    };
  }
  if (gameCode === "aim_trainer") {
    if (hits == null) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is required for aim trainer games."
      );
    }
    const value = Number(hits);
    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' must be a positive integer."
      );
    }
    if (value > 1e4) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is unrealistically large."
      );
    }
    return {
      hits: value
    };
  }
  if (gameCode === "tic_tac_toe") {
    if (hits == null) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is required for tic_tac_toe games."
      );
    }
    const value = Number(hits);
    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' must be a positive integer."
      );
    }
    if (value > 1e3) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is unrealistically large for tic_tac_toe."
      );
    }
    return {
      hits: value
    };
  }
  if (gameCode === "ai_quiz") {
    if (hits == null) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is required for ai_quiz games."
      );
    }
    const value = Number(hits);
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' must be a non-negative integer."
      );
    }
    if (value > 100) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Field 'hits' is unrealistically large for ai_quiz."
      );
    }
    return {
      hits: value
    };
  }
  throw new HttpError(
    400,
    "VALIDATION_ERROR",
    "Unsupported game type for score submission."
  );
}
const POST = async ({ request, params, cookies }) => {
  try {
    const gameCode = validateGameCode(params.code);
    const body = await request.json().catch(() => {
      throw new HttpError(
        400,
        "INVALID_BODY",
        "Invalid JSON in request body."
      );
    });
    const command = validateScoreCommand(gameCode, body);
    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies
    });
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new HttpError(
        401,
        "UNAUTHENTICATED",
        "Musisz być zalogowany, aby zapisać wynik."
      );
    }
    const game = await getGameByCode(gameCode);
    if (!game) {
      throw new HttpError(404, "GAME_NOT_FOUND", "Game not found.");
    }
    const userId = user.id;
    const {
      data: profile,
      error: profileError
    } = await supabase.from("profiles").select("user_id, nick").eq("user_id", userId).maybeSingle();
    if (profileError) {
      throw new HttpError(
        500,
        "PROFILE_CHECK_FAILED",
        "Nie udało się zweryfikować profilu użytkownika."
      );
    }
    if (!profile || !profile.nick) {
      throw new HttpError(
        400,
        "PROFILE_REQUIRED",
        "Aby zapisać wynik w rankingu, ustaw najpierw swój nick w profilu."
      );
    }
    const {
      data: session,
      error: sessionError
    } = await supabase.from("game_sessions").insert({
      game_id: game.id,
      user_id: userId
    }).select("*").maybeSingle();
    if (sessionError || !session) {
      throw new HttpError(
        500,
        "SESSION_CREATE_FAILED",
        "Nie udało się utworzyć sesji gry."
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
        "Unsupported game type for score submission."
      );
    }
    let scoreValue;
    let reactionTimeMs = null;
    let hits = null;
    if (isReactionTest) {
      reactionTimeMs = command.reaction_time_ms;
      scoreValue = reactionTimeMs;
    } else if (isAiQuiz) {
      hits = command.hits ?? 0;
      const totalQuestions = 5;
      const percent = totalQuestions > 0 ? hits / totalQuestions * 100 : 0;
      scoreValue = Number(percent.toFixed(2));
    } else {
      hits = command.hits;
      scoreValue = hits;
    }
    const {
      data: score,
      error: scoreError
    } = await supabase.from("scores").insert({
      game_session_id: session.id,
      game_id: game.id,
      user_id: userId,
      score_value: scoreValue,
      reaction_time_ms: reactionTimeMs,
      hits
    }).select(
      "id, game_session_id, game_id, user_id, score_value, reaction_time_ms, hits, created_at"
    ).maybeSingle();
    if (scoreError || !score) {
      throw new HttpError(
        500,
        "SCORE_CREATE_FAILED",
        "Nie udało się zapisać wyniku."
      );
    }
    const responseBody = score;
    return jsonResponse(responseBody, 201);
  } catch (error) {
    if (error instanceof HttpError) {
      const body2 = {
        error: {
          code: error.code,
          message: error.message
        }
      };
      return jsonResponse(body2, error.status);
    }
    console.error("Unhandled error in score endpoint:", error);
    const body = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error while saving score."
      }
    };
    return jsonResponse(body, 500);
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
