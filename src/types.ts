import type { Tables } from "./db/database.types";

/**
 * Convenience aliases for base row types coming from the generated Supabase types.
 * All DTOs and command models are built directly on top of these row definitions.
 */
export type ProfileRow = Tables<"profiles">;
export type GameRow = Tables<"games">;
export type GameSessionRow = Tables<"game_sessions">;
export type ScoreRow = Tables<"scores">;
export type UiStringRow = Tables<"ui_strings">;

/**
 * Semantic alias for timestamps returned over the API.
 * Underlying DB types are strings, but this documents the expected format.
 */
export type IsoDateTimeString = string;

// ---------------------------------------------------------------------------
// Generic response helpers
// ---------------------------------------------------------------------------

/**
 * Generic list response wrapper used by several endpoints (e.g. games list,
 * games-played stats, user scores).
 */
export interface ListResponseDto<TItem> {
  items: TItem[];
}

// ---------------------------------------------------------------------------
// Profile DTOs & Commands
// ---------------------------------------------------------------------------

/**
 * DTO returned by `GET /api/profile/me`.
 * Mirrors the `profiles` row while excluding internal-only fields (none at the moment).
 */
export type ProfileDto = Pick<
  ProfileRow,
  "user_id" | "nick" | "created_at" | "updated_at"
>;

/**
 * Command payload for `PUT /api/profile/me`.
 * Wraps the only mutable field (`nick`) and derives its type from the DB model.
 */
export interface UpsertProfileCommand {
  /**
   * Desired display nickname; API enforces additional validation
   * (length, allowed characters, uniqueness).
   */
  nick: ProfileRow["nick"];
}

// ---------------------------------------------------------------------------
// Game DTOs
// ---------------------------------------------------------------------------

/**
 * DTO representing a game exposed via `/api/games` and `/api/games/{code}`.
 */
export type GameDto = Pick<
  GameRow,
  "id" | "code" | "name" | "description" | "is_active" | "created_at"
>;

// ---------------------------------------------------------------------------
// Game session DTOs & Commands
// ---------------------------------------------------------------------------

/**
 * DTO representing a game session, as returned from:
 * - `POST /api/games/{code}/sessions`
 * - `PATCH /api/sessions/{sessionId}`
 *
 * It combines the raw `game_sessions` row with derived `game_code` from `games`.
 */
export interface GameSessionDto extends GameSessionRow {
  game_code: GameRow["code"];
}

/**
 * Command payload for `POST /api/games/{code}/sessions`.
 * Currently empty in the API plan but defined as an interface to allow
 * backwards-compatible extension (e.g. difficulty, game-specific options).
 */
export interface StartSessionCommand {
  // Intentionally empty for MVP; reserved for future use.
}

/**
 * Command payload for `PATCH /api/sessions/{sessionId}`.
 * Used to mark a session as finished and/or abandoned.
 */
export interface UpdateSessionCommand {
  /**
   * When true, sets `finished_at` for the session if not already set.
   */
  finished?: boolean;

  /**
   * When true, sets `is_abandoned` for the session.
   */
  abandoned?: boolean;
}

/**
 * DTO used by `GET /api/stats/games-played`.
 * Aggregates session counts per game, binding back to `games` via id/code.
 */
export interface GamesPlayedStatDto {
  game_code: GameRow["code"];
  game_id: GameRow["id"];
  sessions_count: number;
}

/**
 * Query model for `GET /api/stats/games-played` (derived from API spec).
 * Represents the query string parameters in a strongly-typed form.
 */
export interface GamesPlayedStatsQuery {
  game_code?: GameRow["code"];
  from?: IsoDateTimeString;
  to?: IsoDateTimeString;
}

// ---------------------------------------------------------------------------
// Score & leaderboard DTOs & Commands
// ---------------------------------------------------------------------------

/**
 * DTO returned by `POST /api/sessions/{sessionId}/score`.
 * Mirrors the `scores` row that is safe to expose.
 */
export type ScoreDto = Pick<
  ScoreRow,
  | "id"
  | "game_session_id"
  | "game_id"
  | "user_id"
  | "score_value"
  | "reaction_time_ms"
  | "hits"
  | "created_at"
>;

/**
 * Command payload for `POST /api/sessions/{sessionId}/score`.
 *
 * The allowed fields depend on the game type (reaction test vs. aim trainer),
 * but both are modeled here as optional and validated at runtime.
 */
export interface CreateScoreForSessionCommand {
  /**
   * Reaction test result in milliseconds.
   * Required for reaction test games; must be omitted/null for aim trainer.
   */
  reaction_time_ms?: Exclude<ScoreRow["reaction_time_ms"], undefined>;

  /**
   * Number of hits in the aim trainer.
   * Required for aim trainer; must be omitted/null for reaction test.
   */
  hits?: Exclude<ScoreRow["hits"], undefined>;
}

/**
 * Lightweight view of a game for use in leaderboard responses.
 */
export type LeaderboardGameInfoDto = Pick<GameRow, "id" | "code" | "name">;

/**
 * Single leaderboard entry combining score information and player identity.
 */
export interface LeaderboardEntryDto
  extends Pick<
    ScoreRow,
    "user_id" | "score_value" | "reaction_time_ms" | "hits" | "created_at"
  > {
  /**
   * 1-based rank within the leaderboard response.
   */
  rank: number;

  /**
   * Nick of the player, resolved from `profiles`.
   * May be null if the user/profile is missing or anonymized.
   */
  nick: ProfileRow["nick"] | null;
}

/**
 * DTO returned by `GET /api/games/{code}/leaderboard`.
 */
export interface LeaderboardDto {
  game: LeaderboardGameInfoDto;
  items: LeaderboardEntryDto[];
}

/**
 * Query model for `GET /api/games/{code}/leaderboard`.
 */
export interface LeaderboardQuery {
  limit?: number;
  period_days?: number;
}

/**
 * DTO representing a single score row in `GET /api/me/scores`.
 * Enriches the base score with game metadata.
 */
export interface UserScoreSummaryDto
  extends Pick<
    ScoreRow,
    "id" | "score_value" | "reaction_time_ms" | "hits" | "created_at"
  > {
  game_code: GameRow["code"];
  game_name: GameRow["name"];
}

/**
 * Query model for `GET /api/me/scores`.
 */
export interface UserScoresQuery {
  limit?: number;
}

// ---------------------------------------------------------------------------
// UI strings DTOs & Queries
// ---------------------------------------------------------------------------

/**
 * DTO representing a single UI string entry returned from `/api/ui-strings`.
 */
export interface UiStringDto
  extends Pick<UiStringRow, "key" | "value" | "locale"> {}

/**
 * DTO representing the full payload of `GET /api/ui-strings`.
 */
export interface UiStringsResponseDto {
  locale: UiStringRow["locale"];
  items: UiStringDto[];
}

/**
 * Query model for `GET /api/ui-strings`.
 */
export interface UiStringsQuery {
  locale?: UiStringRow["locale"];
  prefix?: string;
}


