import type { APIRoute } from "astro";
import type { LeaderboardDto, LeaderboardQuery } from "../../../../types";
import { getGameByCode } from "../../../../services/gameService";
import { getLeaderboard } from "../../../../services/leaderboardService";

export const prerender = false;

// dalej HttpError, jsonResponse, parseLeaderboardQuery, GET itd.
/**
 * Lightweight error type carrying an HTTP status code and a public-safe message.
 * Used for controlled error flows (validation, not-found, etc.).
 */
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

/**
 * Helper to build JSON responses with a unified error shape.
 */
function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

/**
 * Parse and validate query string parameters for the leaderboard endpoint.
 * Implements the rules described in the implementation plan:
 * - limit: optional integer between 1 and 50 (default 10)
 * - period_days: optional integer between 1 and 30 (default 7)
 */
function parseLeaderboardQuery(url: URL): LeaderboardQuery {
  const params = url.searchParams;

  const rawLimit = params.get("limit");
  const rawPeriodDays = params.get("period_days");

  let limit: number | undefined;
  let period_days: number | undefined;

  if (rawLimit !== null) {
    const parsed = Number(rawLimit);
    const isInteger = Number.isInteger(parsed);

    if (!isInteger || parsed < 1 || parsed > 50) {
      throw new HttpError(
        400,
        "INVALID_QUERY",
        "Query parameter 'limit' must be an integer between 1 and 50."
      );
    }

    limit = parsed;
  }

  if (rawPeriodDays !== null) {
    const parsed = Number(rawPeriodDays);
    const isInteger = Number.isInteger(parsed);

    if (!isInteger || parsed < 1 || parsed > 30) {
      throw new HttpError(
        400,
        "INVALID_QUERY",
        "Query parameter 'period_days' must be an integer between 1 and 30."
      );
    }

    period_days = parsed;
  }

  return {
    limit,
    period_days,
  };
}

/**
 * Validate and normalise the game code from the dynamic route segment.
 * Ensures a non-empty string with a safe character set.
 */
function validateGameCode(code: string | undefined): string {
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

  // Allow only letters, digits, underscore and hyphen for game codes.
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new HttpError(
      400,
      "INVALID_QUERY",
      "Path parameter 'code' may only contain letters, digits, '_' and '-'."
    );
  }

  return trimmed;
}

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const gameCode = validateGameCode(params.code);
    const query = parseLeaderboardQuery(url);

    const game = await getGameByCode(gameCode);

    if (!game) {
      throw new HttpError(404, "GAME_NOT_FOUND", "Game not found.");
    }

    const leaderboard: LeaderboardDto = await getLeaderboard(game, query);

    return jsonResponse(leaderboard, 200);
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

    console.error("Unhandled error in leaderboard endpoint:", error);

    const body: ErrorBody = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error while fetching leaderboard.",
      },
    };

    return jsonResponse(body, 500);
  }
};


