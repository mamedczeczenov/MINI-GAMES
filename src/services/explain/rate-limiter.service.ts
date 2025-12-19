/**
 * Rate Limiter Service for Explain Your Move
 * Handles daily game limits and action rate limiting
 */

import { createClient } from '@supabase/supabase-js';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { DailyLimitResponse, DailyLimitExceededError } from './types';

const DEFAULT_DAILY_LIMIT = 20;
const GUEST_DAILY_LIMIT = 5;

export class RateLimiterService {
  private supabase: ReturnType<typeof createClient>;
  private actionLimiter: RateLimiterMemory;
  private socketLimiter: RateLimiterMemory;
  private env: Record<string, string | undefined>;

  constructor() {
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
        '[RateLimiter] Missing SUPABASE_URL or SUPABASE_KEY (service role key required server-side to bypass RLS)',
      );
    }

    const role = this.decodeJwtRole(supabaseKey);
    if (role && role !== 'service_role') {
      throw new Error(
        `[RateLimiter] Provided Supabase key is not service_role (role=${role}). Use the service_role key from Supabase Settings → API.`,
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Action limiter: 100 actions per second per user
    this.actionLimiter = new RateLimiterMemory({
      points: 100,
      duration: 1,
      blockDuration: 10, // Block for 10s if exceeded
    });

    // Socket event limiter: 50 events per second per socket
    this.socketLimiter = new RateLimiterMemory({
      points: 50,
      duration: 1,
      blockDuration: 5,
    });
  }

  /**
   * Check if user can play another game today
   */
  async checkDailyLimit(userId: string, isGuest: boolean = false): Promise<boolean> {
    const limit = isGuest
      ? GUEST_DAILY_LIMIT
      : parseInt(
          (this.env.EXPLAIN_DAILY_LIMIT ?? DEFAULT_DAILY_LIMIT.toString()) as string,
        );

    const { data, error } = await this.db
      .rpc('check_explain_daily_limit', {
        p_user_id: userId,
        p_limit: limit,
      });

    if (error) {
      console.error('[RateLimiter] Error checking daily limit:', error);
      return true; // Fail open (allow play on error)
    }

    return data as boolean;
  }

  /**
   * Get user's daily stats
   */
  async getUserDailyStats(userId: string, isGuest: boolean = false): Promise<DailyLimitResponse> {
    const { data, error } = await this.db
      .rpc('get_explain_user_daily_stats', { p_user_id: userId })
      .single();

    if (error) {
      console.error('[RateLimiter] Error fetching daily stats:', error);
      const limit = isGuest ? GUEST_DAILY_LIMIT : DEFAULT_DAILY_LIMIT;
      return {
        gamesPlayed: 0,
        limit,
        remaining: limit,
        resetsAt: this.getNextResetTime(),
      };
    }

    const limit = isGuest ? GUEST_DAILY_LIMIT : data.limit_default;
    const gamesPlayed = data.games_played_today;
    const remaining = Math.max(0, limit - gamesPlayed);

    return {
      gamesPlayed,
      limit,
      remaining,
      resetsAt: data.resets_at,
    };
  }

  /**
   * Enforce daily limit (throws if exceeded)
   */
  async enforceDailyLimit(userId: string, isGuest: boolean = false): Promise<void> {
    const canPlay = await this.checkDailyLimit(userId, isGuest);
    
    if (!canPlay) {
      const limit = isGuest ? GUEST_DAILY_LIMIT : DEFAULT_DAILY_LIMIT;
      throw new Error('DAILY_LIMIT_EXCEEDED') as DailyLimitExceededError;
    }
  }

  /**
   * Check action rate limit (general actions)
   */
  async checkActionLimit(userId: string): Promise<boolean> {
    try {
      await this.actionLimiter.consume(userId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Enforce action rate limit (throws if exceeded)
   */
  async enforceActionLimit(userId: string): Promise<void> {
    try {
      await this.actionLimiter.consume(userId);
    } catch (error: any) {
      const msBeforeNext = error.msBeforeNext || 1000;
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(msBeforeNext / 1000)}s`);
    }
  }

  /**
   * Check socket event rate limit
   */
  async checkSocketLimit(socketId: string): Promise<boolean> {
    try {
      await this.socketLimiter.consume(socketId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Enforce socket event rate limit (throws if exceeded)
   */
  async enforceSocketLimit(socketId: string): Promise<void> {
    try {
      await this.socketLimiter.consume(socketId);
    } catch (error: any) {
      const msBeforeNext = error.msBeforeNext || 1000;
      throw new Error(`Too many events. Try again in ${Math.ceil(msBeforeNext / 1000)}s`);
    }
  }

  /**
   * Get next daily reset time (midnight)
   */
  private getNextResetTime(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
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

  /**
   * Untyped supabase client helper to avoid strict inference issues.
   */
  private get db(): any {
    return this.supabase as any;
  }
}

// Singleton instance
export const rateLimiterService = new RateLimiterService();

