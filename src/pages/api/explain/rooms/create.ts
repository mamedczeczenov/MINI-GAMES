/**
 * POST /api/explain/rooms/create
 * Create a new game room
 */

import type { APIRoute } from 'astro';
import { roomManager } from '../../../../services/explain/room.manager';
import { rateLimiterService } from '../../../../services/explain/rate-limiter.service';
import type { CreateRoomRequest, CreateRoomResponse } from '../../../../services/explain/types';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body: CreateRoomRequest = await request.json();
    const { userId, nickname } = body;

    if (!userId || !nickname) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or nickname' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check daily limit
    const isGuest = !locals.user || locals.user.id !== userId;
    await rateLimiterService.enforceDailyLimit(userId, isGuest);

    // Create room
    const room = await roomManager.createRoom(userId, nickname);

    const response: CreateRoomResponse = {
      roomId: room.id,
      roomCode: room.roomCode,
      hostId: room.host.userId,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[API] Create room error:', error);

    if (error.message === 'DAILY_LIMIT_EXCEEDED') {
      return new Response(
        JSON.stringify({ error: 'Daily game limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create room' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

