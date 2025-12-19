/**
 * Client-side Game State Management for Explain Your Move
 * React state manager using hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { getSocketClient } from './socket.client';
import type {
  GameState,
  Scenario,
  Choice,
  AIScores,
  WSRoomPlayerJoinedPayload,
  WSGameCountdownPayload,
  WSGameScenarioPayload,
  WSGameTimerPayload,
  WSGamePhaseWritingPayload,
  WSGameRoundResultsPayload,
  WSGameOverPayload,
  WSErrorPayload,
} from '../../services/explain/types';

export interface ExplainGameState {
  // Connection
  isConnected: boolean;
  error: string | null;

  // Room
  roomCode: string | null;
  isHost: boolean;
  opponentNickname: string | null;
  opponentConnected: boolean;

  // Game state
  gameState: GameState;
  currentRound: number;
  roundWins: { you: number; opponent: number };

  // Countdown
  countdownSeconds: number | null;

  // Scenario
  scenario: Scenario | null;
  timeLeft: number | null;

  // Player choices
  myChoice: Choice | null;
  myReason: string;
  opponentChose: boolean;
  opponentSubmitted: boolean;

  // Round results
  roundResults: WSGameRoundResultsPayload | null;

  // Game over
  gameOverData: WSGameOverPayload | null;
}

const initialState: ExplainGameState = {
  isConnected: false,
  error: null,
  roomCode: null,
  isHost: false,
  opponentNickname: null,
  opponentConnected: false,
  gameState: 'WAITING',
  currentRound: 1,
  roundWins: { you: 0, opponent: 0 },
  countdownSeconds: null,
  scenario: null,
  timeLeft: null,
  myChoice: null,
  myReason: '',
  opponentChose: false,
  opponentSubmitted: false,
  roundResults: null,
  gameOverData: null,
};

export function useExplainGame() {
  const [state, setState] = useState<ExplainGameState>(initialState);
  const socket = getSocketClient();

  // ============================================================================
  // Socket Event Handlers
  // ============================================================================

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // Room events
    unsubscribers.push(
      socket.on<WSRoomPlayerJoinedPayload>('room:player_joined', (data) => {
        setState(prev => ({
          ...prev,
          opponentNickname: data.player.nickname,
          opponentConnected: true,
        }));
      })
    );

    // Countdown
    unsubscribers.push(
      socket.on<WSGameCountdownPayload>('game:countdown', (data) => {
        setState(prev => ({
          ...prev,
          gameState: 'COUNTDOWN',
          countdownSeconds: data.seconds,
        }));
      })
    );

    // Scenario
    unsubscribers.push(
      socket.on<WSGameScenarioPayload>('game:scenario', (data) => {
        setState(prev => ({
          ...prev,
          gameState: 'CHOOSING_MOVE',
          currentRound: data.round,
          scenario: data.scenario,
          timeLeft: data.timeLimit,
          myChoice: null,
          myReason: '',
          opponentChose: false,
          opponentSubmitted: false,
          roundResults: null,
        }));
      })
    );

    // Timer update
    unsubscribers.push(
      socket.on<WSGameTimerPayload>('game:timer', (data) => {
        setState(prev => ({
          ...prev,
          gameState: data.state,
          timeLeft: data.timeLeft,
        }));
      })
    );

    // Opponent chose
    unsubscribers.push(
      socket.on('game:opponent_chose', () => {
        setState(prev => ({ ...prev, opponentChose: true }));
      })
    );

    // Phase writing
    unsubscribers.push(
      socket.on<WSGamePhaseWritingPayload>('game:phase_writing', (data) => {
        setState(prev => ({
          ...prev,
          gameState: 'WRITING_REASON',
          timeLeft: data.timeLimit,
        }));
      })
    );

    // Opponent submitted
    unsubscribers.push(
      socket.on('game:opponent_submitted', () => {
        setState(prev => ({ ...prev, opponentSubmitted: true }));
      })
    );

    // AI judging
    unsubscribers.push(
      socket.on('game:ai_judging', () => {
        setState(prev => ({ ...prev, gameState: 'AI_JUDGING' }));
      })
    );

    // Round results
    unsubscribers.push(
      socket.on<WSGameRoundResultsPayload>('game:round_results', (data) => {
        setState(prev => ({
          ...prev,
          gameState: 'ROUND_RESULTS',
          roundResults: data,
          roundWins: data.roundWins,
        }));
      })
    );

    // Game over
    unsubscribers.push(
      socket.on<WSGameOverPayload>('game:over', (data) => {
        setState(prev => ({
          ...prev,
          gameState: 'GAME_OVER',
          gameOverData: data,
        }));
      })
    );

    // Error
    unsubscribers.push(
      socket.on<WSErrorPayload>('error', (data) => {
        setState(prev => ({ ...prev, error: data.message }));
      })
    );

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [socket]);

  // ============================================================================
  // Actions
  // ============================================================================

  const connect = useCallback(async (token: string, roomCode: string) => {
    try {
      await socket.connect(token);
      setState(prev => ({ ...prev, isConnected: true, roomCode }));
    } catch (error) {
      console.error('[ExplainGame] Connect error:', error);
      setState(prev => ({ ...prev, error: 'Nie udało się połączyć z serwerem' }));
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    socket.disconnect();
    setState(initialState);
  }, [socket]);

  const joinRoom = useCallback((roomCode: string, userId: string, token: string) => {
    socket.joinRoom(roomCode, userId, token);
  }, [socket]);

  const playerReady = useCallback(() => {
    socket.playerReady();
  }, [socket]);

  const chooseOption = useCallback((choice: Choice) => {
    socket.gameChoose(choice);
    setState(prev => ({ ...prev, myChoice: choice }));
  }, [socket]);

  const updateReason = useCallback((reason: string) => {
    setState(prev => ({ ...prev, myReason: reason }));
  }, []);

  const submitReason = useCallback(() => {
    if (state.myReason.trim().length < 20) {
      setState(prev => ({ ...prev, error: 'Uzasadnienie musi mieć co najmniej 20 znaków' }));
      return;
    }
    socket.gameSubmitReason(state.myReason);
  }, [socket, state.myReason]);

  const autoSubmitReason = useCallback(() => {
    // Auto-submit without validation - send whatever the user has written
    const reason = state.myReason.trim() || 'Brak uzasadnienia (czas się skończył)';
    socket.gameSubmitReason(reason);
  }, [socket, state.myReason]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    actions: {
      connect,
      disconnect,
      joinRoom,
      playerReady,
      chooseOption,
      updateReason,
      submitReason,
      autoSubmitReason,
      clearError,
    },
  };
}

