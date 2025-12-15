import { supabaseClient } from "../db/supabase.client";
import type {
  GameRow,
  LeaderboardDto,
  LeaderboardEntryDto,
  LeaderboardGameInfoDto,
  LeaderboardQuery,
  ProfileRow,
  ScoreRow,
} from "../types";

/**
 * Build the game metadata part for the leaderboard DTO.
 */
function toLeaderboardGameInfo(game: GameRow): LeaderboardGameInfoDto {
  return {
    id: game.id,
    code: game.code,
    name: game.name,
  };
}

/**
 * Determine whether a given game code should be treated as a "lower is better"
 * score (e.g. reaction time).
 *
 * For now this is hard-coded based on known codes from the PRD; if more games
 * are added, this logic can be extended or moved to a dedicated column.
 */
function isLowerIsBetterGame(code: string): boolean {
  return code === "reaction_test";
}

/**
 * Helper porównujący dwa wyniki i zwracający „lepszy” z nich,
 * z uwzględnieniem tego, czy niższy wynik jest lepszy (`lowerIsBetter`).
 *
 * Przy remisie:
 * - wybieramy nowszy wynik (większe `created_at`), żeby nagradzać aktualne gry.
 */
function pickBetterScore(
  current: ScoreRow,
  candidate: ScoreRow,
  lowerIsBetter: boolean,
): ScoreRow {
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

  // Remis – nowszy wynik ma priorytet.
  const currentTime = new Date(current.created_at).getTime();
  const candidateTime = new Date(candidate.created_at).getTime();

  if (candidateTime > currentTime) {
    return candidate;
  }

  return current;
}

/**
 * Fetch leaderboard entries for a given game and query parameters,
 * then map them into the public `LeaderboardDto` shape.
 */
export async function getLeaderboard(
  game: GameRow,
  query: LeaderboardQuery,
): Promise<LeaderboardDto> {
  // Specjalna logika dla gry kółko i krzyżyk:
  // ranking opiera się na łącznej liczbie zwycięstw z ostatnich N dni.
  if (game.code === "tic_tac_toe") {
    return getTicTacToeWinsLeaderboard(game, query);
  }

  // Specjalna logika dla AI Quiz:
  // ranking opiera się na łącznej liczbie poprawnych odpowiedzi (hits)
  // z ostatnich N dni, z normalizacją do liczby wszystkich pytań.
  if (game.code === "ai_quiz") {
    return getAiQuizAggregateLeaderboard(game, query);
  }

  const periodDays = query.period_days ?? 7;
  const limit = query.limit ?? 10;

  const now = new Date();
  const fromDate = new Date(now.getTime());
  fromDate.setUTCDate(fromDate.getUTCDate() - periodDays);
  const fromIso = fromDate.toISOString();

  const lowerIsBetter = isLowerIsBetterGame(game.code);

  // Fetch scores for the given game and time window.
  // Zawsze pobieramy większe okno, aby wyznaczyć najlepszy wynik na gracza,
  // a dopiero później przycinać do TOP N.
  const rawLimit = limit * 50;

  let scoresQuery = supabaseClient
    .from("scores")
    .select("*")
    .eq("game_id", game.id)
    .gte("created_at", fromIso)
    .limit(rawLimit);

  if (lowerIsBetter) {
    scoresQuery = scoresQuery
      .order("score_value", { ascending: true })
      // Nowszy wynik przy remisie ma wyższe miejsce w rankingu.
      .order("created_at", { ascending: false });
  } else {
    scoresQuery = scoresQuery
      .order("score_value", { ascending: false })
      .order("created_at", { ascending: true });
  }

  const { data: scores, error: scoresError } = await scoresQuery;

  if (scoresError) {
    throw new Error(`Failed to fetch scores for leaderboard: ${scoresError.message}`);
  }

  const safeScores: ScoreRow[] = scores ?? [];

  let candidateScores: ScoreRow[];

  // 1 wynik na gracza – najlepszy w danym oknie czasowym,
  // zarówno dla gier typu "niższy jest lepszy" (reaction_test),
  // jak i "wyższy jest lepszy" (aim_trainer).
  const bestByUser = new Map<string, ScoreRow>();

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
        return aVal - bVal; // niższy czas wyżej
      }

      // Remis: nowszy wynik wyżej.
      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    }

    // Wyższy wynik wyżej.
    if (aVal !== bVal) {
      return bVal - aVal;
    }

    // Remis: nowszy wynik wyżej.
    return (
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
    );
  });

  // Przycinamy do żądanego limitu.
  const topScores = candidateScores.slice(0, limit);

  // Collect user_ids to resolve player nicknames.
  const userIds = Array.from(
    new Set(
      topScores
        .map((score) => score.user_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  const profileMap = new Map<string, ProfileRow["nick"]>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("user_id, nick")
      .in("user_id", userIds);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles for leaderboard: ${profilesError.message}`);
    }

    (profiles ?? []).forEach((profile) => {
      profileMap.set(profile.user_id, profile.nick);
    });
  }

  const items: LeaderboardEntryDto[] = [];

  topScores.forEach((score) => {
    const nick =
      score.user_id != null ? profileMap.get(score.user_id) ?? null : null;

    // Gracze bez profilu / nicku nie są uwzględniani w rankingu.
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
      created_at: score.created_at,
    });
  });

  return {
    game: toLeaderboardGameInfo(game),
    items,
  };
}

/**
 * Leaderboard dla gry „tic_tac_toe”:
 * - wynik to łączna liczba zwycięstw (score_value > 0) z ostatnich N dni,
 * - jedno zwycięstwo = jeden zapisany wynik w tabeli `scores`,
 * - ranking sortowany malejąco po liczbie zwycięstw,
 *   przy remisie wyżej jest gracz z nowszym ostatnim zwycięstwem.
 */
async function getTicTacToeWinsLeaderboard(
  game: GameRow,
  query: LeaderboardQuery,
): Promise<LeaderboardDto> {
  const periodDays = query.period_days ?? 7;
  const limit = query.limit ?? 10;

  const now = new Date();
  const fromDate = new Date(now.getTime());
  fromDate.setUTCDate(fromDate.getUTCDate() - periodDays);
  const fromIso = fromDate.toISOString();

  const { data: scores, error: scoresError } = await supabaseClient
    .from("scores")
    .select("*")
    .eq("game_id", game.id)
    .gte("created_at", fromIso);

  if (scoresError) {
    throw new Error(
      `Failed to fetch scores for tic_tac_toe leaderboard: ${scoresError.message}`,
    );
  }

  const safeScores: ScoreRow[] = scores ?? [];

  // Agregujemy łączną liczbę zwycięstw na gracza w zadanym oknie czasowym.
  const winsByUser = new Map<
    string,
    { totalWins: number; latestCreatedAt: string }
  >();

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
        latestCreatedAt: score.created_at,
      });
    } else {
      const totalWins = existing.totalWins + value;
      const latestCreatedAt =
        new Date(score.created_at).getTime() >
        new Date(existing.latestCreatedAt).getTime()
          ? score.created_at
          : existing.latestCreatedAt;

      winsByUser.set(score.user_id, {
        totalWins,
        latestCreatedAt,
      });
    }
  }

  // Sortujemy: więcej zwycięstw wyżej, przy remisie nowsze zwycięstwo wyżej.
  const aggregated = Array.from(winsByUser.entries()).sort(
    ([_userIdA, a], [_userIdB, b]) => {
      if (a.totalWins !== b.totalWins) {
        return b.totalWins - a.totalWins;
      }

      return (
        new Date(b.latestCreatedAt).getTime() -
        new Date(a.latestCreatedAt).getTime()
      );
    },
  );

  const topAggregated = aggregated.slice(0, limit);

  // Pobieramy profile, aby uzyskać nicki graczy.
  const userIds = topAggregated.map(([userId]) => userId);
  const profileMap = new Map<string, ProfileRow["nick"]>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("user_id, nick")
      .in("user_id", userIds);

    if (profilesError) {
      throw new Error(
        `Failed to fetch profiles for tic_tac_toe leaderboard: ${profilesError.message}`,
      );
    }

    (profiles ?? []).forEach((profile) => {
      profileMap.set(profile.user_id, profile.nick);
    });
  }

  const items: LeaderboardEntryDto[] = [];

  topAggregated.forEach(([userId, { totalWins, latestCreatedAt }]) => {
    const nick = profileMap.get(userId) ?? null;

    // Gracze bez profilu / nicku nie są uwzględniani w rankingu.
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
      created_at: latestCreatedAt,
    });
  });

  return {
    game: toLeaderboardGameInfo(game),
    items,
  };
}

/**
 * Leaderboard dla gry „ai_quiz”:
 * - wynik to łączna liczba poprawnych odpowiedzi (hits) z ostatnich N dni,
 * - zakładamy stałą liczbę pytań w quizie (5), więc dla każdego gracza
 *   liczymy:
 *     - totalCorrect = suma hits,
 *     - totalQuestions = liczba_quizów * 5,
 *     - percent = totalCorrect / totalQuestions * 100,
 * - ranking sortowany malejąco po percent, przy remisie więcej poprawnych
 *   odpowiedzi wyżej, a potem nowszy wynik wyżej.
 */
async function getAiQuizAggregateLeaderboard(
  game: GameRow,
  query: LeaderboardQuery,
): Promise<LeaderboardDto> {
  const periodDays = query.period_days ?? 7;
  const limit = query.limit ?? 10;

  const now = new Date();
  const fromDate = new Date(now.getTime());
  fromDate.setUTCDate(fromDate.getUTCDate() - periodDays);
  const fromIso = fromDate.toISOString();

  const { data: scores, error: scoresError } = await supabaseClient
    .from("scores")
    .select("*")
    .eq("game_id", game.id)
    .gte("created_at", fromIso);

  if (scoresError) {
    throw new Error(
      `Failed to fetch scores for ai_quiz leaderboard: ${scoresError.message}`,
    );
  }

  const safeScores: ScoreRow[] = scores ?? [];

  const statsByUser = new Map<
    string,
    { totalCorrect: number; totalQuestions: number; latestCreatedAt: string }
  >();

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
        latestCreatedAt: score.created_at,
      });
    } else {
      const totalCorrect = existing.totalCorrect + correct;
      const totalQuestions = existing.totalQuestions + QUESTIONS_PER_QUIZ;
      const latestCreatedAt =
        new Date(score.created_at).getTime() >
        new Date(existing.latestCreatedAt).getTime()
          ? score.created_at
          : existing.latestCreatedAt;

      statsByUser.set(score.user_id, {
        totalCorrect,
        totalQuestions,
        latestCreatedAt,
      });
    }
  }

  const aggregated = Array.from(statsByUser.entries()).sort(
    ([_userIdA, a], [_userIdB, b]) => {
      const aPercent =
        a.totalQuestions > 0
          ? a.totalCorrect / a.totalQuestions
          : 0;
      const bPercent =
        b.totalQuestions > 0
          ? b.totalCorrect / b.totalQuestions
          : 0;

      if (aPercent !== bPercent) {
        return bPercent - aPercent;
      }

      if (a.totalCorrect !== b.totalCorrect) {
        return b.totalCorrect - a.totalCorrect;
      }

      return (
        new Date(b.latestCreatedAt).getTime() -
        new Date(a.latestCreatedAt).getTime()
      );
    },
  );

  const topAggregated = aggregated.slice(0, limit);

  const userIds = topAggregated.map(([userId]) => userId);
  const profileMap = new Map<string, ProfileRow["nick"]>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("user_id, nick")
      .in("user_id", userIds);

    if (profilesError) {
      throw new Error(
        `Failed to fetch profiles for ai_quiz leaderboard: ${profilesError.message}`,
      );
    }

    (profiles ?? []).forEach((profile) => {
      profileMap.set(profile.user_id, profile.nick);
    });
  }

  const items: LeaderboardEntryDto[] = [];

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
      created_at: latestCreatedAt,
    });
  });

  return {
    game: toLeaderboardGameInfo(game),
    items,
  };
}



