import { g as getGameByCode } from '../../../../chunks/gameService_v6Wbwfkw.mjs';
import { s as supabaseClient } from '../../../../chunks/supabase.client_DSbpnknZ.mjs';
export { renderers } from '../../../../renderers.mjs';

function toLeaderboardGameInfo(game) {
  return {
    id: game.id,
    code: game.code,
    name: game.name
  };
}
function isLowerIsBetterGame(code) {
  return code === "reaction_test";
}
function pickBetterScore(current, candidate, lowerIsBetter) {
  const currentValue = Number(current.score_value);
  const candidateValue = Number(candidate.score_value);
  if (Number.isNaN(currentValue) || Number.isNaN(candidateValue)) {
    return current;
  }
  if (lowerIsBetter) {
    if (candidateValue < currentValue) {
      return candidate;
    }
  } else if (candidateValue > currentValue) {
    return candidate;
  }
  const currentTime = new Date(current.created_at).getTime();
  const candidateTime = new Date(candidate.created_at).getTime();
  if (candidateTime > currentTime) {
    return candidate;
  }
  return current;
}
async function getLeaderboard(game, query) {
  if (game.code === "tic_tac_toe") {
    return getTicTacToeWinsLeaderboard(game, query);
  }
  if (game.code === "ai_quiz") {
    return getAiQuizAggregateLeaderboard(game, query);
  }
  const periodDays = query.period_days ?? 7;
  const limit = query.limit ?? 10;
  const now = /* @__PURE__ */ new Date();
  const fromDate = new Date(now.getTime());
  fromDate.setUTCDate(fromDate.getUTCDate() - periodDays);
  const fromIso = fromDate.toISOString();
  const lowerIsBetter = isLowerIsBetterGame(game.code);
  const rawLimit = limit * 50;
  let scoresQuery = supabaseClient.from("scores").select("*").eq("game_id", game.id).gte("created_at", fromIso).limit(rawLimit);
  if (lowerIsBetter) {
    scoresQuery = scoresQuery.order("score_value", { ascending: true }).order("created_at", { ascending: false });
  } else {
    scoresQuery = scoresQuery.order("score_value", { ascending: false }).order("created_at", { ascending: true });
  }
  const { data: scores, error: scoresError } = await scoresQuery;
  if (scoresError) {
    throw new Error(`Failed to fetch scores for leaderboard: ${scoresError.message}`);
  }
  const safeScores = scores ?? [];
  let candidateScores;
  const bestByUser = /* @__PURE__ */ new Map();
  for (const score of safeScores) {
    if (!score.user_id) {
      continue;
    }
    const current = bestByUser.get(score.user_id);
    if (!current) {
      bestByUser.set(score.user_id, score);
      continue;
    }
    const better = pickBetterScore(current, score, lowerIsBetter);
    bestByUser.set(score.user_id, better);
  }
  candidateScores = Array.from(bestByUser.values()).sort((a, b) => {
    const aVal = Number(a.score_value);
    const bVal = Number(b.score_value);
    if (Number.isNaN(aVal) || Number.isNaN(bVal)) {
      return 0;
    }
    if (lowerIsBetter) {
      if (aVal !== bVal) {
        return aVal - bVal;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (aVal !== bVal) {
      return bVal - aVal;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const topScores = candidateScores.slice(0, limit);
  const userIds = Array.from(
    new Set(
      topScores.map((score) => score.user_id).filter((id) => typeof id === "string" && id.length > 0)
    )
  );
  const profileMap = /* @__PURE__ */ new Map();
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabaseClient.from("profiles").select("user_id, nick").in("user_id", userIds);
    if (profilesError) {
      throw new Error(`Failed to fetch profiles for leaderboard: ${profilesError.message}`);
    }
    (profiles ?? []).forEach((profile) => {
      profileMap.set(profile.user_id, profile.nick);
    });
  }
  const items = [];
  topScores.forEach((score) => {
    const nick = score.user_id != null ? profileMap.get(score.user_id) ?? null : null;
    if (!nick) {
      return;
    }
    items.push({
      rank: items.length + 1,
      user_id: score.user_id,
      nick,
      score_value: score.score_value,
      reaction_time_ms: score.reaction_time_ms,
      hits: score.hits,
      created_at: score.created_at
    });
  });
  return {
    game: toLeaderboardGameInfo(game),
    items
  };
}
async function getTicTacToeWinsLeaderboard(game, query) {
  const periodDays = query.period_days ?? 7;
  const limit = query.limit ?? 10;
  const now = /* @__PURE__ */ new Date();
  const fromDate = new Date(now.getTime());
  fromDate.setUTCDate(fromDate.getUTCDate() - periodDays);
  const fromIso = fromDate.toISOString();
  const { data: scores, error: scoresError } = await supabaseClient.from("scores").select("*").eq("game_id", game.id).gte("created_at", fromIso);
  if (scoresError) {
    throw new Error(
      `Failed to fetch scores for tic_tac_toe leaderboard: ${scoresError.message}`
    );
  }
  const safeScores = scores ?? [];
  const winsByUser = /* @__PURE__ */ new Map();
  for (const score of safeScores) {
    if (!score.user_id) {
      continue;
    }
    const value = Number(score.score_value);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }
    const existing = winsByUser.get(score.user_id);
    if (!existing) {
      winsByUser.set(score.user_id, {
        totalWins: value,
        latestCreatedAt: score.created_at
      });
    } else {
      const totalWins = existing.totalWins + value;
      const latestCreatedAt = new Date(score.created_at).getTime() > new Date(existing.latestCreatedAt).getTime() ? score.created_at : existing.latestCreatedAt;
      winsByUser.set(score.user_id, {
        totalWins,
        latestCreatedAt
      });
    }
  }
  const aggregated = Array.from(winsByUser.entries()).sort(
    ([_userIdA, a], [_userIdB, b]) => {
      if (a.totalWins !== b.totalWins) {
        return b.totalWins - a.totalWins;
      }
      return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
    }
  );
  const topAggregated = aggregated.slice(0, limit);
  const userIds = topAggregated.map(([userId]) => userId);
  const profileMap = /* @__PURE__ */ new Map();
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabaseClient.from("profiles").select("user_id, nick").in("user_id", userIds);
    if (profilesError) {
      throw new Error(
        `Failed to fetch profiles for tic_tac_toe leaderboard: ${profilesError.message}`
      );
    }
    (profiles ?? []).forEach((profile) => {
      profileMap.set(profile.user_id, profile.nick);
    });
  }
  const items = [];
  topAggregated.forEach(([userId, { totalWins, latestCreatedAt }]) => {
    const nick = profileMap.get(userId) ?? null;
    if (!nick) {
      return;
    }
    items.push({
      rank: items.length + 1,
      user_id: userId,
      nick,
      score_value: totalWins,
      reaction_time_ms: null,
      hits: totalWins,
      created_at: latestCreatedAt
    });
  });
  return {
    game: toLeaderboardGameInfo(game),
    items
  };
}
async function getAiQuizAggregateLeaderboard(game, query) {
  const periodDays = query.period_days ?? 7;
  const limit = query.limit ?? 10;
  const now = /* @__PURE__ */ new Date();
  const fromDate = new Date(now.getTime());
  fromDate.setUTCDate(fromDate.getUTCDate() - periodDays);
  const fromIso = fromDate.toISOString();
  const { data: scores, error: scoresError } = await supabaseClient.from("scores").select("*").eq("game_id", game.id).gte("created_at", fromIso);
  if (scoresError) {
    throw new Error(
      `Failed to fetch scores for ai_quiz leaderboard: ${scoresError.message}`
    );
  }
  const safeScores = scores ?? [];
  const statsByUser = /* @__PURE__ */ new Map();
  const QUESTIONS_PER_QUIZ = 5;
  for (const score of safeScores) {
    if (!score.user_id) {
      continue;
    }
    const hitsValue = Number(score.hits ?? 0);
    const correct = Number.isFinite(hitsValue) && hitsValue >= 0 ? hitsValue : 0;
    const existing = statsByUser.get(score.user_id);
    if (!existing) {
      statsByUser.set(score.user_id, {
        totalCorrect: correct,
        totalQuestions: QUESTIONS_PER_QUIZ,
        latestCreatedAt: score.created_at
      });
    } else {
      const totalCorrect = existing.totalCorrect + correct;
      const totalQuestions = existing.totalQuestions + QUESTIONS_PER_QUIZ;
      const latestCreatedAt = new Date(score.created_at).getTime() > new Date(existing.latestCreatedAt).getTime() ? score.created_at : existing.latestCreatedAt;
      statsByUser.set(score.user_id, {
        totalCorrect,
        totalQuestions,
        latestCreatedAt
      });
    }
  }
  const aggregated = Array.from(statsByUser.entries()).sort(
    ([_userIdA, a], [_userIdB, b]) => {
      const aPercent = a.totalQuestions > 0 ? a.totalCorrect / a.totalQuestions : 0;
      const bPercent = b.totalQuestions > 0 ? b.totalCorrect / b.totalQuestions : 0;
      if (aPercent !== bPercent) {
        return bPercent - aPercent;
      }
      if (a.totalCorrect !== b.totalCorrect) {
        return b.totalCorrect - a.totalCorrect;
      }
      return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
    }
  );
  const topAggregated = aggregated.slice(0, limit);
  const userIds = topAggregated.map(([userId]) => userId);
  const profileMap = /* @__PURE__ */ new Map();
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabaseClient.from("profiles").select("user_id, nick").in("user_id", userIds);
    if (profilesError) {
      throw new Error(
        `Failed to fetch profiles for ai_quiz leaderboard: ${profilesError.message}`
      );
    }
    (profiles ?? []).forEach((profile) => {
      profileMap.set(profile.user_id, profile.nick);
    });
  }
  const items = [];
  topAggregated.forEach(([userId, { totalCorrect, totalQuestions, latestCreatedAt }]) => {
    const nick = profileMap.get(userId) ?? null;
    if (!nick) {
      return;
    }
    items.push({
      rank: items.length + 1,
      user_id: userId,
      nick,
      // score_value przechowuje tutaj liczbę pytań, aby UI mogło wyliczyć procent.
      score_value: totalQuestions,
      reaction_time_ms: null,
      // hits przechowuje łączną liczbę poprawnych odpowiedzi.
      hits: totalCorrect,
      created_at: latestCreatedAt
    });
  });
  return {
    game: toLeaderboardGameInfo(game),
    items
  };
}

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
function parseLeaderboardQuery(url) {
  const params = url.searchParams;
  const rawLimit = params.get("limit");
  const rawPeriodDays = params.get("period_days");
  let limit;
  let period_days;
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
    period_days
  };
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
const GET = async ({ params, url }) => {
  try {
    const gameCode = validateGameCode(params.code);
    const query = parseLeaderboardQuery(url);
    const game = await getGameByCode(gameCode);
    if (!game) {
      throw new HttpError(404, "GAME_NOT_FOUND", "Game not found.");
    }
    const leaderboard = await getLeaderboard(game, query);
    return jsonResponse(leaderboard, 200);
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
    console.error("Unhandled error in leaderboard endpoint:", error);
    const body = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error while fetching leaderboard."
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
