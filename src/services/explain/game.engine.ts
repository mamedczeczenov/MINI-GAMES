/**
 * Game Engine for Explain Your Move
 * State machine and game logic
 */

import { createClient } from '@supabase/supabase-js';
import type {
  GameRoom,
  GameState,
  Choice,
  Scenario,
  DBRound,
  DBGameResult,
  InvalidChoiceError,
  ReasonTooShortError,
  ReasonTooLongError,
} from './types';
import { aiService } from './ai.service';

// Game configuration
export const GAME_CONFIG = {
  MAX_ROUNDS: 3,
  COUNTDOWN_SECONDS: 10,
  CHOOSING_MOVE_SECONDS: 45,
  WRITING_REASON_SECONDS: 120,
  ROUND_RESULTS_DISPLAY_SECONDS: 15,
  MIN_REASON_LENGTH: 20,  // Minimum 20 characters (~2 short sentences)
  MAX_REASON_LENGTH: 500,
} as const;

export class GameEngine {
  private supabase: ReturnType<typeof createClient>;
  private env: Record<string, string | undefined>;

  constructor() {
    // Support running under Astro (import.meta.env) and plain Node (process.env).
    const metaEnv =
      typeof import.meta !== 'undefined' && (import.meta as any)?.env
        ? (import.meta as any).env
        : {};
    this.env = { ...metaEnv, ...process.env };

    const getEnv = (key: string): string | undefined => this.env[key];
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        '[GameEngine] Missing SUPABASE_URL or SUPABASE_KEY (service role key required server-side to bypass RLS)',
      );
    }

    const role = this.decodeJwtRole(supabaseKey);
    if (role && role !== 'service_role') {
      throw new Error(
        `[GameEngine] Provided Supabase key is not service_role (role=${role}). Use the service_role key from Supabase Settings → API.`,
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Untyped supabase client helper to avoid strict inference issues.
   */
  private get db(): any {
    return this.supabase as any;
  }

  /**
   * Start countdown when both players are ready
   */
  async startCountdown(room: GameRoom): Promise<void> {
    if (room.state !== 'WAITING') {
      throw new Error('Can only start countdown from WAITING state');
    }

    if (!room.guest) {
      throw new Error('Cannot start game without second player');
    }

    this.transitionState(room, 'COUNTDOWN');
    console.log(`[GameEngine] Starting countdown for room ${room.roomCode}`);
  }

  /**
   * Generate scenario and start round
   */
  async startRound(room: GameRoom): Promise<Scenario> {
    this.transitionState(room, 'SCENARIO_GEN');

    try {
      const scenario = await aiService.generateScenario();
      room.scenario = scenario;

      // Reset player choices/reasons for new round
      room.host.choice = null;
      room.host.reason = '';
      room.host.hasSubmitted = false;
      room.host.scores = undefined;
      room.host.feedback = undefined;

      if (room.guest) {
        room.guest.choice = null;
        room.guest.reason = '';
        room.guest.hasSubmitted = false;
        room.guest.scores = undefined;
        room.guest.feedback = undefined;
      }

      this.transitionState(room, 'CHOOSING_MOVE');
      
      console.log(`[GameEngine] Round ${room.currentRound} started for room ${room.roomCode}`);
      return scenario;
    } catch (error) {
      console.error('[GameEngine] Failed to generate scenario:', error);
      throw new Error('Failed to generate scenario');
    }
  }

  /**
   * Handle player choice (A or B)
   */
  setPlayerChoice(room: GameRoom, userId: string, choice: Choice): boolean {
    if (room.state !== 'CHOOSING_MOVE') {
      throw new Error('Can only make choice during CHOOSING_MOVE state');
    }

    if (choice !== 'A' && choice !== 'B') {
      throw new Error('INVALID_CHOICE') as InvalidChoiceError;
    }

    let player = room.host.userId === userId ? room.host : room.guest;
    if (!player) {
      throw new Error('Player not found in room');
    }

    player.choice = choice;
    
    // Check if both players chose
    const bothChose = Boolean(room.host.choice && room.guest?.choice);
    return bothChose;
  }

  /**
   * Start writing phase
   */
  startWritingPhase(room: GameRoom): void {
    if (room.state !== 'CHOOSING_MOVE') {
      throw new Error('Can only transition to writing from CHOOSING_MOVE');
    }

    this.transitionState(room, 'WRITING_REASON');
    console.log(`[GameEngine] Writing phase started for room ${room.roomCode}`);
  }

  /**
   * Handle player reason submission
   */
  submitPlayerReason(room: GameRoom, userId: string, reason: string): boolean {
    if (room.state !== 'WRITING_REASON') {
      throw new Error('Can only submit reason during WRITING_REASON state');
    }

    // Validate reason length
    const trimmedReason = reason.trim();
    if (trimmedReason.length < GAME_CONFIG.MIN_REASON_LENGTH) {
      throw new Error('REASON_TOO_SHORT') as ReasonTooShortError;
    }
    if (trimmedReason.length > GAME_CONFIG.MAX_REASON_LENGTH) {
      throw new Error('REASON_TOO_LONG') as ReasonTooLongError;
    }

    let player = room.host.userId === userId ? room.host : room.guest;
    if (!player) {
      throw new Error('Player not found in room');
    }

    player.reason = trimmedReason;
    player.hasSubmitted = true;

    // Check if both players submitted
    const bothSubmitted = Boolean(room.host.hasSubmitted && room.guest?.hasSubmitted);
    return bothSubmitted;
  }

  /**
   * Judge round with AI
   */
  async judgeRound(room: GameRoom): Promise<void> {
    if (room.state !== 'WRITING_REASON') {
      throw new Error('Can only judge during WRITING_REASON state');
    }

    if (!room.scenario || !room.guest) {
      throw new Error('Invalid room state for judging');
    }

    // Handle case where players didn't submit
    if (!room.host.choice) {
      room.host.choice = 'A'; // default
    }
    if (!room.guest.choice) {
      room.guest.choice = 'A'; // default
    }

    // If reason is empty, use placeholder
    const hostReason = room.host.reason || 'Brak uzasadnienia';
    const guestReason = room.guest.reason || 'Brak uzasadnienia';

    this.transitionState(room, 'AI_JUDGING');

    try {
      const result = await aiService.judgeReasons(
        room.scenario,
        { choice: room.host.choice, reason: hostReason },
        { choice: room.guest.choice, reason: guestReason }
      );

      // Assign scores to players
      room.host.scores = result.player1.scores;
      room.host.feedback = result.player1.feedback;
      room.host.totalScore = result.player1.total;

      room.guest.scores = result.player2.scores;
      room.guest.feedback = result.player2.feedback;
      room.guest.totalScore = result.player2.total;

      // Update round wins
      if (result.winner === 'player1') {
        room.roundWins.host++;
      } else if (result.winner === 'player2') {
        room.roundWins.guest++;
      }

      // Save round to database
      await this.saveRound(room, result.winner);

      this.transitionState(room, 'ROUND_RESULTS');
      
      console.log(`[GameEngine] Round ${room.currentRound} judged for room ${room.roomCode}`);
    } catch (error) {
      console.error('[GameEngine] Failed to judge round:', error);
      throw new Error('Failed to judge round');
    }
  }

  /**
   * Check if game is over (someone won 2 rounds)
   */
  isGameOver(room: GameRoom): boolean {
    return room.roundWins.host >= 2 || room.roundWins.guest >= 2 || room.currentRound >= GAME_CONFIG.MAX_ROUNDS;
  }

  /**
   * Advance to next round or end game
   */
  async advanceGame(room: GameRoom): Promise<'next_round' | 'game_over'> {
    if (room.state !== 'ROUND_RESULTS') {
      throw new Error('Can only advance from ROUND_RESULTS state');
    }

    if (this.isGameOver(room)) {
      await this.endGame(room);
      return 'game_over';
    }

    // Next round
    room.currentRound++;
    console.log(`[GameEngine] Advancing to round ${room.currentRound} for room ${room.roomCode}`);
    return 'next_round';
  }

  /**
   * End game and save results
   */
  async endGame(room: GameRoom): Promise<void> {
    this.transitionState(room, 'GAME_OVER');

    if (!room.guest) {
      throw new Error('Cannot end game without guest');
    }

    // Determine winner
    const hostWins = room.roundWins.host;
    const guestWins = room.roundWins.guest;
    const hostWon = hostWins > guestWins;
    const guestWon = guestWins > hostWins;

    // Calculate total points (from all rounds)
    const hostTotalPoints = await this.calculateTotalPoints(room.id, room.host.userId);
    const guestTotalPoints = await this.calculateTotalPoints(room.id, room.guest.userId);

    // Save game results for both players
    const results: Omit<DBGameResult, 'id' | 'played_at'>[] = [
      {
        user_id: room.host.userId,
        total_points: hostTotalPoints,
        rounds_won: hostWins,
        rounds_total: room.currentRound,
        game_won: hostWon,
        opponent_id: room.guest.userId,
        room_id: room.id,
      },
      {
        user_id: room.guest.userId,
        total_points: guestTotalPoints,
        rounds_won: guestWins,
        rounds_total: room.currentRound,
        game_won: guestWon,
        opponent_id: room.host.userId,
        room_id: room.id,
      },
    ];

    const { error } = await this.db
      .from('explain_game_results')
      .insert(results);

    if (error) {
      console.error('[GameEngine] Failed to save game results:', error);
    }

    // Increment daily game counters
    await Promise.all([
      this.db.rpc('increment_explain_games', { p_user_id: room.host.userId }),
      this.db.rpc('increment_explain_games', { p_user_id: room.guest.userId }),
    ]);

    console.log(`[GameEngine] Game ended for room ${room.roomCode}: Host ${hostWins}-${guestWins} Guest`);
  }

  /**
   * Handle timeout for choosing move
   */
  handleChoosingMoveTimeout(room: GameRoom): void {
    if (room.state !== 'CHOOSING_MOVE') return;

    // If player didn't choose, they auto-lose the round
    if (!room.host.choice) {
      room.host.choice = 'A'; // default to prevent errors
      room.host.reason = 'Brak wyboru w czasie';
      if (room.guest) room.roundWins.guest++;
    }

    if (room.guest && !room.guest.choice) {
      room.guest.choice = 'A';
      room.guest.reason = 'Brak wyboru w czasie';
      room.roundWins.host++;
    }

    // If both didn't choose, skip round
    if (!room.host.hasSubmitted && room.guest && !room.guest.hasSubmitted) {
      console.log(`[GameEngine] Both players timed out in choosing phase for room ${room.roomCode}`);
    }

    this.transitionState(room, 'WRITING_REASON');
  }

  /**
   * Handle timeout for writing reason
   */
  handleWritingReasonTimeout(room: GameRoom): void {
    if (room.state !== 'WRITING_REASON') return;

    // Use whatever they wrote (even if empty)
    console.log(`[GameEngine] Writing timeout for room ${room.roomCode}`);
    // Proceed to judging with whatever reasons were provided
  }

  /**
   * Transition state
   */
  private transitionState(room: GameRoom, newState: GameState): void {
    console.log(`[GameEngine] Room ${room.roomCode}: ${room.state} → ${newState}`);
    room.state = newState;
    room.stateStartedAt = Date.now();
  }

  /**
   * Save round to database
   */
  private async saveRound(room: GameRoom, winner: 'player1' | 'player2' | 'tie'): Promise<void> {
    if (!room.scenario || !room.guest) return;

    const winnerId = winner === 'player1' ? room.host.userId : 
                     winner === 'player2' ? room.guest.userId : null;

    const round: Omit<DBRound, 'id' | 'created_at'> = {
      room_id: room.id,
      round_number: room.currentRound,
      scenario: room.scenario,
      
      player1_id: room.host.userId,
      player1_choice: room.host.choice,
      player1_reason: room.host.reason,
      player1_scores: room.host.scores || null,
      player1_feedback: room.host.feedback || null,
      
      player2_id: room.guest.userId,
      player2_choice: room.guest.choice,
      player2_reason: room.guest.reason,
      player2_scores: room.guest.scores || null,
      player2_feedback: room.guest.feedback || null,
      
      winner_id: winnerId,
    };

    const { error } = await this.db
      .from('explain_rounds')
      .insert(round);

    if (error) {
      console.error('[GameEngine] Failed to save round:', error);
    }
  }

  /**
   * Calculate total points from all rounds
   */
  private async calculateTotalPoints(roomId: string, userId: string): Promise<number> {
    const { data: rounds, error } = await this.db
      .from('explain_rounds')
      .select('player1_id, player1_scores, player2_scores')
      .eq('room_id', roomId);

    if (error || !rounds) {
      console.error('[GameEngine] Failed to fetch rounds for points calculation:', error);
      return 0;
    }

    let total = 0;
    for (const round of rounds) {
      const isPlayer1 = round.player1_id === userId;
      const scores = isPlayer1 ? round.player1_scores : round.player2_scores;
      
      if (scores) {
        total += scores.logic + scores.coherence + scores.creativity;
      }
    }

    return total;
  }

  /**
   * Best-effort decode of the "role" claim from a JWT (to ensure service_role).
   */
  private decodeJwtRole(jwt: string): string | undefined {
    const parts = jwt.split('.');
    if (parts.length < 2) return undefined;
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      return payload?.role;
    } catch {
      return undefined;
    }
  }
}

// Singleton instance
export const gameEngine = new GameEngine();

