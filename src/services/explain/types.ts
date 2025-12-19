/**
 * Explain Your Move - TypeScript Type Definitions
 * Multiplayer game with AI judging
 */

// ============================================================================
// Game States
// ============================================================================

export type GameState =
  | 'WAITING'           // Oczekiwanie na drugiego gracza
  | 'COUNTDOWN'         // 10s countdown przed rozpoczęciem
  | 'SCENARIO_GEN'      // AI generuje scenariusz
  | 'CHOOSING_MOVE'     // Gracze wybierają A/B (45s)
  | 'WRITING_REASON'    // Gracze piszą uzasadnienie (2 min)
  | 'AI_JUDGING'        // AI ocenia (3-8s)
  | 'ROUND_RESULTS'     // Wyświetlenie wyników rundy (15s)
  | 'GAME_OVER';        // Koniec gry (best of 3)

export type Choice = 'A' | 'B';

export type PlayerRole = 'host' | 'guest';

// ============================================================================
// Scenario (AI Generated)
// ============================================================================

export interface ScenarioOption {
  label: string;        // "Defensywny ruch"
  desc: string;         // "Czekasz na błąd przeciwnika"
}

export interface Scenario {
  category: string;     // 'strategy' | 'morality' | 'business' | 'sport' | etc.
  situation: string;    // Opis sytuacji (2-4 zdania)
  optionA: ScenarioOption;
  optionB: ScenarioOption;
  generatedAt: number;  // timestamp
}

// ============================================================================
// AI Judging
// ============================================================================

export interface AIScores {
  logic: number;        // 0-10
  coherence: number;    // 0-10
  creativity: number;   // 0-10
}

export interface PlayerJudgingResult {
  scores: AIScores;
  feedback: string;     // Krótki komentarz AI (1 zdanie)
  total: number;        // suma logic + coherence + creativity
}

export interface JudgingResult {
  player1: PlayerJudgingResult;
  player2: PlayerJudgingResult;
  winner: 'player1' | 'player2' | 'tie';
}

// ============================================================================
// Player & Room (Runtime State)
// ============================================================================

export interface Player {
  userId: string;
  nickname: string;
  socketId: string;
  isConnected: boolean;
  lastHeartbeat: number;
  
  // Dane bieżącej rundy
  choice: Choice | null;
  reason: string;
  hasSubmitted: boolean;
  scores?: AIScores;
  feedback?: string;
  totalScore?: number;
}

export interface GameRoom {
  id: string;                          // UUID z Supabase
  roomCode: string;                    // 6-znakowy kod (np. "XJ4K2P")
  host: Player;
  guest: Player | null;
  state: GameState;
  currentRound: number;                // 1-3
  scenario: Scenario | null;
  roundWins: { host: number; guest: number };
  createdAt: number;
  expiresAt: number;
  stateStartedAt: number;              // Kiedy rozpoczął się obecny state (dla timeoutów)
}

// ============================================================================
// Database Models (Supabase)
// ============================================================================

export interface DBRoom {
  id: string;
  room_code: string;
  host_id: string;
  guest_id: string | null;
  state: 'waiting' | 'playing' | 'finished';
  current_round: number;
  scores: { host: number; guest: number };
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export interface DBRound {
  id: string;
  room_id: string;
  round_number: number;
  scenario: Scenario;
  
  player1_id: string;
  player1_choice: Choice | null;
  player1_reason: string | null;
  player1_scores: AIScores | null;
  player1_feedback: string | null;
  
  player2_id: string;
  player2_choice: Choice | null;
  player2_reason: string | null;
  player2_scores: AIScores | null;
  player2_feedback: string | null;
  
  winner_id: string | null;
  created_at: string;
}

export interface DBGameResult {
  id: string;
  user_id: string;
  total_points: number;
  rounds_won: number;
  rounds_total: number;
  game_won: boolean;
  opponent_id: string | null;
  room_id: string | null;
  played_at: string;
}

export interface DBDailyLimit {
  user_id: string;
  games_played_today: number;
  last_reset_date: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateRoomRequest {
  userId: string;
  nickname: string;
}

export interface CreateRoomResponse {
  roomId: string;
  roomCode: string;
  hostId: string;
}

export interface JoinRoomRequest {
  roomCode: string;
  userId: string;
  nickname: string;
}

export interface JoinRoomResponse {
  roomId: string;
  room: GameRoom;
}

export interface DailyLimitResponse {
  gamesPlayed: number;
  limit: number;
  remaining: number;
  resetsAt: string;
}

export interface RankingEntry {
  userId: string;
  nickname: string;
  bestScore: number;
  gamesPlayed: number;
  wins: number;
}

export interface RankingResponse {
  rankings: RankingEntry[];
}

// ============================================================================
// WebSocket Events (Client → Server)
// ============================================================================

export interface WSRoomJoinPayload {
  roomCode: string;
  userId: string;
  token: string;
}

export interface WSGameChoosePayload {
  choice: Choice;
}

export interface WSGameSubmitReasonPayload {
  reason: string;
}

// ============================================================================
// WebSocket Events (Server → Client)
// ============================================================================

export interface WSRoomPlayerJoinedPayload {
  player: {
    userId: string;
    nickname: string;
  };
  room: GameRoom;
}

export interface WSGameCountdownPayload {
  seconds: number;
}

export interface WSGameScenarioPayload {
  scenario: Scenario;
  round: number;
  timeLimit: number;
}

export interface WSGameTimerPayload {
  state: GameState;
  timeLeft: number;
}

export interface WSGameOpponentChosePayload {
  opponentReady: boolean;
}

export interface WSGamePhaseWritingPayload {
  timeLimit: number;
}

export interface WSGameRoundResultsPayload {
  round: number;
  
  yourChoice: Choice;
  yourReason: string;
  yourScores: AIScores;
  yourTotal: number;
  yourFeedback: string;
  
  opponentChoice: Choice;
  opponentReason: string;
  opponentScores: AIScores;
  opponentTotal: number;
  opponentFeedback: string;
  
  winner: 'you' | 'opponent' | 'tie';
  roundWins: { you: number; opponent: number };
}

export interface WSGameOverPayload {
  winner: 'you' | 'opponent';
  finalScore: { you: number; opponent: number };
  roundWins: { you: number; opponent: number };
  mvpRound: number;  // numer rundy z najwyższym wynikiem
}

export interface WSErrorPayload {
  message: string;
  code?: string;
}

// ============================================================================
// OpenAI API Types
// ============================================================================

export interface OpenAIScenarioResponse {
  situation: string;
  optionA: {
    label: string;
    desc: string;
  };
  optionB: {
    label: string;
    desc: string;
  };
}

export interface OpenAIJudgingResponse {
  player1: {
    logic: number;
    coherence: number;
    creativity: number;
    feedback: string;
  };
  player2: {
    logic: number;
    coherence: number;
    creativity: number;
    feedback: string;
  };
}

// ============================================================================
// Configuration
// ============================================================================

export interface ExplainGameConfig {
  DAILY_LIMIT: number;
  GUEST_DAILY_LIMIT: number;
  ROOM_TTL_MINUTES: number;
  MAX_ROUNDS: number;
  COUNTDOWN_SECONDS: number;
  CHOOSING_MOVE_SECONDS: number;
  WRITING_REASON_SECONDS: number;
  ROUND_RESULTS_DISPLAY_SECONDS: number;
  MIN_REASON_LENGTH: number;
  MAX_REASON_LENGTH: number;
  ROOM_CODE_LENGTH: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class ExplainGameError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ExplainGameError';
  }
}

export class RoomNotFoundError extends ExplainGameError {
  constructor(roomCode: string) {
    super(`Room ${roomCode} not found`, 'ROOM_NOT_FOUND', 404);
  }
}

export class RoomFullError extends ExplainGameError {
  constructor() {
    super('Room is full', 'ROOM_FULL', 400);
  }
}

export class GameInProgressError extends ExplainGameError {
  constructor() {
    super('Game already in progress', 'GAME_IN_PROGRESS', 400);
  }
}

export class DailyLimitExceededError extends ExplainGameError {
  constructor(limit: number) {
    super(`Daily limit exceeded (${limit} games)`, 'DAILY_LIMIT_EXCEEDED', 429);
  }
}

export class InvalidChoiceError extends ExplainGameError {
  constructor() {
    super('Invalid choice (must be A or B)', 'INVALID_CHOICE', 400);
  }
}

export class ReasonTooShortError extends ExplainGameError {
  constructor(minLength: number) {
    super(`Reason too short (min ${minLength} characters)`, 'REASON_TOO_SHORT', 400);
  }
}

export class ReasonTooLongError extends ExplainGameError {
  constructor(maxLength: number) {
    super(`Reason too long (max ${maxLength} characters)`, 'REASON_TOO_LONG', 400);
  }
}

