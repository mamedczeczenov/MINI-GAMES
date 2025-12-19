/**
 * POST /api/explain/rooms/:code/join
 * Join an existing room by code
 */

import type { APIRoute } from 'astro';
import { roomManager } from '../../../../../services/explain/room.manager';
import { rateLimiterService } from '../../../../../services/explain/rate-limiter.service';
import type { JoinRoomRequest, JoinRoomResponse } from '../../../../../services/explain/types';

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const roomCode = params.code?.toUpperCase();
    if (!roomCode) {
      return new Response(
        JSON.stringify({ error: 'Missing room code' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: Omit<JoinRoomRequest, 'roomCode'> = await request.json();
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

    // Join room
    const room = await roomManager.joinRoom(roomCode, userId, nickname);

    const response: JoinRoomResponse = {
      roomId: room.id,
      room,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[API] Join room error:', error);

    if (error.message === 'ROOM_NOT_FOUND') {
      return new Response(
        JSON.stringify({ error: 'Room not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error.message === 'ROOM_FULL') {
      return new Response(
        JSON.stringify({ error: 'Room is full' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error.message === 'GAME_IN_PROGRESS') {
      return new Response(
        JSON.stringify({ error: 'Game already in progress' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error.message === 'DAILY_LIMIT_EXCEEDED') {
      return new Response(
        JSON.stringify({ error: 'Daily game limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to join room' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

