/**
 * OpenAI Service for Explain Your Move
 * Handles scenario generation and judging
 */

import OpenAI from 'openai';
import type {
  Scenario,
  Choice,
  JudgingResult,
  OpenAIScenarioResponse,
  OpenAIJudgingResponse,
} from './types';

const SCENARIO_CATEGORIES = [
  'strategy',
  'morality',
  'business',
  'sport',
  'politics',
  'social',
  'technology',
  'education',
  'health',
  'environment',
] as const;

export class AIService {
  private openai: OpenAI;
  private enabled: boolean;
  private env: Record<string, string | undefined>;
  private isOpenRouter: boolean = false;

  constructor() {
    // Support both Astro/Vite (import.meta.env) and plain Node (process.env).
    const metaEnv =
      typeof import.meta !== 'undefined' && (import.meta as any)?.env
        ? (import.meta as any).env
        : {};
    this.env = { ...metaEnv, ...process.env };

    const apiKey =
      this.env.OPENAI_API_KEY ||
      this.env.PUBLIC_OPENAI_API_KEY ||
      this.env.OPENROUTER_API_KEY; // fallback if user wires OpenRouter key here
    const orgId = this.env.OPENAI_ORG_ID;
    
    if (!apiKey || apiKey.startsWith('sk-xxx')) {
      console.warn('[AIService] OpenAI API key not configured - using mock mode');
      this.enabled = false;
      this.openai = null as any;
    } else {
      this.enabled = true;
      
      // If using OpenRouter key, point to OpenRouter endpoint
      this.isOpenRouter = apiKey.startsWith('sk-or-');
      
      this.openai = new OpenAI({
        apiKey,
        organization: orgId,
        baseURL: this.isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
        defaultHeaders: this.isOpenRouter ? {
          'HTTP-Referer': this.env.PUBLIC_SITE_URL || 'http://localhost:4321',
          'X-Title': 'Explain Your Move Game',
        } : undefined,
      });
      
      console.log(`[AIService] Initialized with ${this.isOpenRouter ? 'OpenRouter' : 'OpenAI'} API`);
    }
  }

  /**
   * Generate scenario with retry logic
   */
  async generateScenario(): Promise<Scenario> {
    if (!this.enabled) {
      return this.generateMockScenario();
    }

    return this.withRetry(async () => {
      const category = this.getRandomCategory();
      
      // OpenRouter requires 'openai/' prefix for OpenAI models
      const model = this.isOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
      
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `Jesteś generatorem scenariuszy dla gry strategicznej. 
Stwórz sytuację decyzyjną z dwoma opcjami (A i B).
Kategoria: ${category}.

Scenariusz powinien być:
- Zwięzły (2-4 zdania)
- Bez oczywistej "dobrej" odpowiedzi
- Z możliwością różnych interpretacji
- Po polsku, poziom 12-18 lat
- Interesujący i angażujący

Zwróć JSON w formacie:
{
  "situation": "Opis sytuacji...",
  "optionA": {
    "label": "Krótka nazwa opcji A",
    "desc": "Opis konsekwencji opcji A"
  },
  "optionB": {
    "label": "Krótka nazwa opcji B",
    "desc": "Opis konsekwencji opcji B"
  }
}`
          },
          {
            role: 'user',
            content: 'Wygeneruj scenariusz'
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9,  // Wysoka kreatywność
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const data: OpenAIScenarioResponse = JSON.parse(content);
      
      // Validate response
      if (!data.situation || !data.optionA || !data.optionB) {
        throw new Error('Invalid scenario format from OpenAI');
      }

      return {
        category,
        situation: data.situation,
        optionA: data.optionA,
        optionB: data.optionB,
        generatedAt: Date.now(),
      };
    });
  }

  /**
   * Judge two player reasons with retry logic
   */
  async judgeReasons(
    scenario: Scenario,
    player1: { choice: Choice; reason: string },
    player2: { choice: Choice; reason: string }
  ): Promise<JudgingResult> {
    if (!this.enabled) {
      return this.generateMockJudging(player1.reason, player2.reason);
    }

    return this.withRetry(async () => {
      // OpenRouter requires 'openai/' prefix for OpenAI models
      const model = this.isOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
      
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `Jesteś sędzią gry strategicznej. Oceniasz JAKOŚĆ ARGUMENTACJI, nie wybór opcji.

Kryteria oceny (każde 0-10 punktów):
- Logika: czy uzasadnienie jest racjonalne i przemyślane?
- Spójność: czy argumenty się nie wykluczają i tworzą całość? CZY UZASADNIENIE ODNOSI SIĘ DO WYBRANEJ OPCJI?
- Kreatywność: czy gracz użył nietypowych metafor, perspektyw, psychologii?

WAŻNE - Weryfikacja zgodności wyboru i uzasadnienia:
- Sprawdź czy gracz pisze uzasadnienie dla opcji którą FAKTYCZNIE wybrał
- Jeśli gracz wybrał A, ale pisze o opcji B (lub odwrotnie) → DRASTYCZNIE obniż punkty za spójność (max 2-3 pkt)
- Jeśli uzasadnienie w ogóle nie dotyczy scenariusza → spójność 0-1 pkt
- W feedbacku WYRAŹNIE napisz jeśli uzasadnienie nie pasuje do wyboru

Zasady:
- Bądź sprawiedliwy i obiektywny
- NIE faworyzuj żadnej opcji (A/B)
- Oceń jakość argumentu, nie zgodność z Twoją opinią
- Dodaj krótki feedback (1 zdanie)
- Jeśli uzasadnienie jest bardzo krótkie lub ogólnikowe, obniż punkty

Zwróć JSON w formacie:
{
  "player1": {
    "logic": 8,
    "coherence": 7,
    "creativity": 9,
    "feedback": "Świetne wykorzystanie psychologii"
  },
  "player2": {
    "logic": 7,
    "coherence": 8,
    "creativity": 5,
    "feedback": "Solidna logika, brak oryginalności"
  }
}`
          },
          {
            role: 'user',
            content: `SCENARIUSZ:
${scenario.situation}

Opcja A: ${scenario.optionA.label} - ${scenario.optionA.desc}
Opcja B: ${scenario.optionB.label} - ${scenario.optionB.desc}

---

GRACZ 1 wybrał: ${player1.choice}
Uzasadnienie: "${player1.reason}"

GRACZ 2 wybrał: ${player2.choice}
Uzasadnienie: "${player2.reason}"

---

Oceń oba uzasadnienia zgodnie z kryteriami.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,  // Niska temperatura dla konsystencji
        max_tokens: 400,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const data: OpenAIJudgingResponse = JSON.parse(content);
      
      // Validate and calculate totals
      const player1Total = data.player1.logic + data.player1.coherence + data.player1.creativity;
      const player2Total = data.player2.logic + data.player2.coherence + data.player2.creativity;
      
      let winner: 'player1' | 'player2' | 'tie';
      if (player1Total > player2Total) {
        winner = 'player1';
      } else if (player2Total > player1Total) {
        winner = 'player2';
      } else {
        winner = 'tie';
      }

      return {
        player1: {
          scores: {
            logic: data.player1.logic,
            coherence: data.player1.coherence,
            creativity: data.player1.creativity,
          },
          feedback: data.player1.feedback,
          total: player1Total,
        },
        player2: {
          scores: {
            logic: data.player2.logic,
            coherence: data.player2.coherence,
            creativity: data.player2.creativity,
          },
          feedback: data.player2.feedback,
          total: player2Total,
        },
        winner,
      };
    });
  }

  /**
   * Retry wrapper for OpenAI calls
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Rate limit → wait longer
        if (error.status === 429) {
          const waitTime = 2000 * (attempt + 1);
          console.warn(`[AIService] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
          await this.sleep(waitTime);
          continue;
        }
        
        // Timeout → retry
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
          console.warn(`[AIService] Timeout, retrying ${attempt + 1}/${maxRetries}`);
          await this.sleep(1000);
          continue;
        }
        
        // Other errors → don't retry
        throw error;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Get random scenario category
   */
  private getRandomCategory(): string {
    const index = Math.floor(Math.random() * SCENARIO_CATEGORIES.length);
    return SCENARIO_CATEGORIES[index];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Mock Methods (for development/testing without OpenAI API)
  // ============================================================================

  private generateMockScenario(): Scenario {
    const scenarios: Omit<Scenario, 'generatedAt'>[] = [
      {
        category: 'strategy',
        situation: 'Grasz w grę typu PvP 1v1. Wiesz, że Twój przeciwnik zawsze gra agresywnie i często ryzykuje. Masz jeden ruch do wykonania.',
        optionA: {
          label: 'Zagrać defensywnie',
          desc: 'Oddajesz inicjatywę, liczysz na błąd przeciwnika'
        },
        optionB: {
          label: 'Zaskoczyć agresją',
          desc: 'Wchodzisz w bezpośrednie starcie, duże ryzyko ale możesz przejąć kontrolę'
        }
      },
      {
        category: 'business',
        situation: 'Jesteś CEO startupu. Inwestor proponuje duży zastrzyk gotówki, ale wymaga 60% udziałów w firmie.',
        optionA: {
          label: 'Odmów i szukaj innych inwestorów',
          desc: 'Zachowujesz kontrolę, ale ryzykujesz brak kapitału'
        },
        optionB: {
          label: 'Przyjmij ofertę',
          desc: 'Tracisz kontrolę, ale zyskujesz stabilność finansową'
        }
      },
      {
        category: 'morality',
        situation: 'Znajdujesz portfel z 2000 zł i dowodem osobistym. Właściciel mieszka daleko, a Ty masz pilne wydatki.',
        optionA: {
          label: 'Oddaj portfel na policję',
          desc: 'Postąpisz uczciwie, ale stracisz czas i zostaniesz z problemem finansowym'
        },
        optionB: {
          label: 'Zostaw wizytówkę z kontaktem',
          desc: 'Rozwiążesz swój problem, ale naruszysz zaufanie'
        }
      },
    ];

    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    return { ...scenario, generatedAt: Date.now() };
  }

  private generateMockJudging(reason1: string, reason2: string): JudgingResult {
    // Simple mock judging based on text length and sentence count
    const score1 = this.calculateMockScore(reason1);
    const score2 = this.calculateMockScore(reason2);

    const winner = score1.total > score2.total ? 'player1' : 
                   score2.total > score1.total ? 'player2' : 'tie';

    return {
      player1: {
        scores: score1.scores,
        feedback: this.generateMockFeedback(score1.total),
        total: score1.total,
      },
      player2: {
        scores: score2.scores,
        feedback: this.generateMockFeedback(score2.total),
        total: score2.total,
      },
      winner,
    };
  }

  private calculateMockScore(reason: string) {
    const length = reason.length;
    const sentences = reason.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    // Base scores on length and sentence count
    const logic = Math.min(10, Math.max(3, Math.floor(length / 20) + sentences));
    const coherence = Math.min(10, Math.max(3, sentences * 2));
    const creativity = Math.min(10, Math.max(3, Math.floor(Math.random() * 5) + 5));
    
    return {
      scores: { logic, coherence, creativity },
      total: logic + coherence + creativity,
    };
  }

  private generateMockFeedback(total: number): string {
    if (total >= 25) return 'Świetne uzasadnienie z dobrą argumentacją';
    if (total >= 20) return 'Solidna logika, dobrze przedstawione argumenty';
    if (total >= 15) return 'Poprawne uzasadnienie, brak głębszej analizy';
    return 'Zbyt ogólnikowe, dodaj więcej szczegółów';
  }
}

// Singleton instance
export const aiService = new AIService();

