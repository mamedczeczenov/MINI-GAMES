/**
 * GET /api/explain/limits/:userId
 * Get user's daily game limit stats
 */

import type { APIRoute } from 'astro';
import { rateLimiterService } from '../../../../services/explain/rate-limiter.service';
import type { DailyLimitResponse } from '../../../../services/explain/types';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const userId = params.userId;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if guest
    const isGuest = !locals.user || locals.user.id !== userId;

    // Get daily stats
    const stats: DailyLimitResponse = await rateLimiterService.getUserDailyStats(userId, isGuest);

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[API] Get limits error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to get limits' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

