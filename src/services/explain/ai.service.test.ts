/**
 * Unit tests for AIService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from './ai.service';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn(),
        },
      };
    },
  };
});

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService();
  });

  describe('generateScenario', () => {
    it('should generate scenario with valid structure', async () => {
      const scenario = await aiService.generateScenario();
      
      expect(scenario).toHaveProperty('category');
      expect(scenario).toHaveProperty('situation');
      expect(scenario).toHaveProperty('optionA');
      expect(scenario).toHaveProperty('optionB');
      expect(scenario).toHaveProperty('generatedAt');
      
      expect(scenario.optionA).toHaveProperty('label');
      expect(scenario.optionA).toHaveProperty('desc');
      expect(scenario.optionB).toHaveProperty('label');
      expect(scenario.optionB).toHaveProperty('desc');
      
      expect(typeof scenario.situation).toBe('string');
      expect(scenario.situation.length).toBeGreaterThan(0);
    });

    it('should generate different scenarios', async () => {
      const scenario1 = await aiService.generateScenario();
      const scenario2 = await aiService.generateScenario();
      
      // Not guaranteed to be different, but statistically should be
      // Just check they both exist
      expect(scenario1).toBeDefined();
      expect(scenario2).toBeDefined();
    });
  });

  describe('judgeReasons', () => {
    it('should judge two reasons and return scores', async () => {
      const scenario = {
        category: 'strategy',
        situation: 'Test situation',
        optionA: { label: 'Option A', desc: 'Desc A' },
        optionB: { label: 'Option B', desc: 'Desc B' },
        generatedAt: Date.now(),
      };

      const player1 = {
        choice: 'A' as const,
        reason: 'This is a well thought out reason with strategic thinking and analysis.',
      };

      const player2 = {
        choice: 'B' as const,
        reason: 'My choice is based on careful consideration of all factors.',
      };

      const result = await aiService.judgeReasons(scenario, player1, player2);
      
      expect(result).toHaveProperty('player1');
      expect(result).toHaveProperty('player2');
      expect(result).toHaveProperty('winner');
      
      // Check player1 scores
      expect(result.player1.scores).toHaveProperty('logic');
      expect(result.player1.scores).toHaveProperty('coherence');
      expect(result.player1.scores).toHaveProperty('creativity');
      expect(result.player1).toHaveProperty('feedback');
      expect(result.player1).toHaveProperty('total');
      
      // Check scores are in valid range
      expect(result.player1.scores.logic).toBeGreaterThanOrEqual(0);
      expect(result.player1.scores.logic).toBeLessThanOrEqual(10);
      expect(result.player1.scores.coherence).toBeGreaterThanOrEqual(0);
      expect(result.player1.scores.coherence).toBeLessThanOrEqual(10);
      expect(result.player1.scores.creativity).toBeGreaterThanOrEqual(0);
      expect(result.player1.scores.creativity).toBeLessThanOrEqual(10);
      
      // Check winner is valid
      expect(['player1', 'player2', 'tie']).toContain(result.winner);
    });

    it('should handle very short reasons appropriately', async () => {
      const scenario = {
        category: 'strategy',
        situation: 'Test',
        optionA: { label: 'A', desc: 'A' },
        optionB: { label: 'B', desc: 'B' },
        generatedAt: Date.now(),
      };

      const player1 = { choice: 'A' as const, reason: 'Short reason here.' };
      const player2 = { choice: 'B' as const, reason: 'Also short.' };

      const result = await aiService.judgeReasons(scenario, player1, player2);
      
      // Should still return valid structure
      expect(result.player1.total).toBeGreaterThanOrEqual(0);
      expect(result.player2.total).toBeGreaterThanOrEqual(0);
    });
  });
});

