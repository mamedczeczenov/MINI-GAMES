/**
 * GET /api/explain/rankings?period=7d
 * Get top 10 rankings
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import type { RankingResponse } from '../../../services/explain/types';

export const GET: APIRoute = async ({ url }) => {
  try {
    const periodParam = url.searchParams.get('period') || '7d';
    const periodDays = parseInt(periodParam.replace('d', '')) || 7;

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_KEY
    );

    const { data, error } = await supabase
      .rpc('get_explain_ranking', { p_period_days: periodDays });

    if (error) {
      throw new Error(`Failed to fetch rankings: ${error.message}`);
    }

    const response: RankingResponse = {
      rankings: (data || []).map((row: any) => ({
        userId: row.user_id,
        nickname: row.nickname,
        bestScore: row.best_score,
        gamesPlayed: parseInt(row.games_played),
        wins: parseInt(row.wins),
      })),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[API] Get rankings error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch rankings' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

