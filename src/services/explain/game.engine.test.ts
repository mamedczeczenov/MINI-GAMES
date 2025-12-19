/**
 * Unit tests for GameEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { gameEngine } from './game.engine';
import type { GameRoom, Player } from './types';

describe('GameEngine', () => {
  let mockRoom: GameRoom;
  let mockHost: Player;
  let mockGuest: Player;

  beforeEach(() => {
    mockHost = {
      userId: 'host-123',
      nickname: 'Host Player',
      socketId: 'socket-host',
      isConnected: true,
      lastHeartbeat: Date.now(),
      choice: null,
      reason: '',
      hasSubmitted: false,
    };

    mockGuest = {
      userId: 'guest-456',
      nickname: 'Guest Player',
      socketId: 'socket-guest',
      isConnected: true,
      lastHeartbeat: Date.now(),
      choice: null,
      reason: '',
      hasSubmitted: false,
    };

    mockRoom = {
      id: 'room-123',
      roomCode: 'ABC123',
      host: mockHost,
      guest: mockGuest,
      state: 'WAITING',
      currentRound: 1,
      scenario: null,
      roundWins: { host: 0, guest: 0 },
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      stateStartedAt: Date.now(),
    };
  });

  describe('setPlayerChoice', () => {
    it('should set player choice correctly', () => {
      mockRoom.state = 'CHOOSING_MOVE';
      
      const bothChose = gameEngine.setPlayerChoice(mockRoom, 'host-123', 'A');
      
      expect(mockRoom.host.choice).toBe('A');
      expect(bothChose).toBe(false); // guest hasn't chosen yet
    });

    it('should return true when both players chose', () => {
      mockRoom.state = 'CHOOSING_MOVE';
      
      gameEngine.setPlayerChoice(mockRoom, 'host-123', 'A');
      const bothChose = gameEngine.setPlayerChoice(mockRoom, 'guest-456', 'B');
      
      expect(mockRoom.host.choice).toBe('A');
      expect(mockRoom.guest?.choice).toBe('B');
      expect(bothChose).toBe(true);
    });

    it('should throw error for invalid choice', () => {
      mockRoom.state = 'CHOOSING_MOVE';
      
      expect(() => {
        gameEngine.setPlayerChoice(mockRoom, 'host-123', 'C' as any);
      }).toThrow('INVALID_CHOICE');
    });

    it('should throw error if not in CHOOSING_MOVE state', () => {
      mockRoom.state = 'WAITING';
      
      expect(() => {
        gameEngine.setPlayerChoice(mockRoom, 'host-123', 'A');
      }).toThrow('Can only make choice during CHOOSING_MOVE state');
    });
  });

  describe('submitPlayerReason', () => {
    it('should accept valid reason', () => {
      mockRoom.state = 'WRITING_REASON';
      const validReason = 'This is a valid reason with more than 20 characters explaining my choice.';
      
      const bothSubmitted = gameEngine.submitPlayerReason(mockRoom, 'host-123', validReason);
      
      expect(mockRoom.host.reason).toBe(validReason);
      expect(mockRoom.host.hasSubmitted).toBe(true);
      expect(bothSubmitted).toBe(false);
    });

    it('should return true when both players submitted', () => {
      mockRoom.state = 'WRITING_REASON';
      const reason1 = 'This is host reason with sufficient length for validation.';
      const reason2 = 'This is guest reason with sufficient length for validation.';
      
      gameEngine.submitPlayerReason(mockRoom, 'host-123', reason1);
      const bothSubmitted = gameEngine.submitPlayerReason(mockRoom, 'guest-456', reason2);
      
      expect(bothSubmitted).toBe(true);
    });

    it('should throw error for too short reason', () => {
      mockRoom.state = 'WRITING_REASON';
      const shortReason = 'Too short';
      
      expect(() => {
        gameEngine.submitPlayerReason(mockRoom, 'host-123', shortReason);
      }).toThrow('REASON_TOO_SHORT');
    });

    it('should throw error if not in WRITING_REASON state', () => {
      mockRoom.state = 'CHOOSING_MOVE';
      const validReason = 'This is a valid reason with more than 20 characters.';
      
      expect(() => {
        gameEngine.submitPlayerReason(mockRoom, 'host-123', validReason);
      }).toThrow('Can only submit reason during WRITING_REASON state');
    });
  });

  describe('isGameOver', () => {
    it('should return true when host wins 2 rounds', () => {
      mockRoom.roundWins.host = 2;
      mockRoom.roundWins.guest = 0;
      
      expect(gameEngine.isGameOver(mockRoom)).toBe(true);
    });

    it('should return true when guest wins 2 rounds', () => {
      mockRoom.roundWins.host = 0;
      mockRoom.roundWins.guest = 2;
      
      expect(gameEngine.isGameOver(mockRoom)).toBe(true);
    });

    it('should return true after 3 rounds', () => {
      mockRoom.currentRound = 3;
      mockRoom.roundWins.host = 1;
      mockRoom.roundWins.guest = 1;
      
      expect(gameEngine.isGameOver(mockRoom)).toBe(true);
    });

    it('should return false when game is ongoing', () => {
      mockRoom.currentRound = 1;
      mockRoom.roundWins.host = 1;
      mockRoom.roundWins.guest = 0;
      
      expect(gameEngine.isGameOver(mockRoom)).toBe(false);
    });
  });
});

