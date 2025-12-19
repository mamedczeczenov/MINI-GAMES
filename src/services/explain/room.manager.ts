/**
 * Room Manager for Explain Your Move
 * Handles room creation, joining, leaving, and cleanup
 */

import { createClient } from '@supabase/supabase-js';
import type {
  GameRoom,
  Player,
  DBRoom,
  RoomNotFoundError,
  RoomFullError,
  GameInProgressError,
} from './types';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Bez I, O, 0, 1
const ROOM_CODE_LENGTH = 6;
const ROOM_TTL_MS = 60 * 60 * 1000; // 1 hour

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private roomCodeToId = new Map<string, string>();
  private playerToRoom = new Map<string, string>(); // userId → roomId
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
        '[RoomManager] Missing SUPABASE_URL or SUPABASE_KEY (service role key required server-side to bypass RLS)',
      );
    }

    // Defensive check: ensure provided key is truly a service_role key.
    const role = this.decodeJwtRole(supabaseKey);
    if (role && role !== 'service_role') {
      throw new Error(
        `[RoomManager] Provided Supabase key is not service_role (role=${role}). Use the service_role key from Supabase Settings → API.`,
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Start cleanup interval (every 30s)
    setInterval(() => this.cleanupExpiredRooms(), 30_000);
  }

  /**
   * Untyped supabase client helper to avoid strict inference issues.
   */
  private get db(): any {
    return this.supabase as any;
  }

  /**
   * Create a new room
   */
  async createRoom(hostId: string, hostNickname: string): Promise<GameRoom> {
    const roomCode = this.generateRoomCode();
    const now = Date.now();

    // Create in database
    const { data: dbRoom, error } = await this.db
      .from('explain_rooms')
      .insert({
        room_code: roomCode,
        host_id: hostId,
        state: 'waiting',
        current_round: 1,
        scores: { host: 0, guest: 0 },
      })
      .select()
      .single();

    if (error || !dbRoom) {
      throw new Error(`Failed to create room: ${error?.message}`);
    }

    // Create in-memory room
    const host: Player = {
      userId: hostId,
      nickname: hostNickname,
      socketId: '',
      isConnected: true,
      lastHeartbeat: now,
      choice: null,
      reason: '',
      hasSubmitted: false,
    };

    const room: GameRoom = {
      id: dbRoom.id,
      roomCode,
      host,
      guest: null,
      state: 'WAITING',
      currentRound: 1,
      scenario: null,
      roundWins: { host: 0, guest: 0 },
      createdAt: now,
      expiresAt: now + ROOM_TTL_MS,
      stateStartedAt: now,
    };

    this.rooms.set(room.id, room);
    this.roomCodeToId.set(roomCode.toUpperCase(), room.id);
    this.playerToRoom.set(hostId, room.id);

    console.log(`[RoomManager] Room created: ${roomCode} (${room.id}), stored as: ${roomCode.toUpperCase()}`);
    return room;
  }

  /**
   * Join existing room
   */
  async joinRoom(
    roomCode: string,
    guestId: string,
    guestNickname: string
  ): Promise<GameRoom> {
    const room = this.getRoomByCode(roomCode);
    
    if (!room) {
      throw new Error('ROOM_NOT_FOUND') as RoomNotFoundError;
    }

    if (room.guest !== null) {
      throw new Error('ROOM_FULL') as RoomFullError;
    }

    if (room.state !== 'WAITING') {
      throw new Error('GAME_IN_PROGRESS') as GameInProgressError;
    }

    if (room.host.userId === guestId) {
      throw new Error('Cannot join your own room');
    }

    // Update database (keep state as 'waiting' until both players connect via WebSocket)
    const { error } = await this.db
      .from('explain_rooms')
      .update({
        guest_id: guestId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id);

    if (error) {
      throw new Error(`Failed to join room: ${error.message}`);
    }

    // Update in-memory room
    const guest: Player = {
      userId: guestId,
      nickname: guestNickname,
      socketId: '',
      isConnected: true,
      lastHeartbeat: Date.now(),
      choice: null,
      reason: '',
      hasSubmitted: false,
    };

    room.guest = guest;
    this.playerToRoom.set(guestId, room.id);

    console.log(`[RoomManager] Player ${guestNickname} joined room ${roomCode}`);
    return room;
  }

  /**
   * Leave room
   */
  async leaveRoom(userId: string): Promise<void> {
    const roomId = this.playerToRoom.get(userId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // If host leaves, close room
    if (room.host.userId === userId) {
      await this.closeRoom(roomId);
      return;
    }

    // If guest leaves, just remove them
    if (room.guest?.userId === userId) {
      room.guest = null;
      this.playerToRoom.delete(userId);

      // Update database
      await this.db
        .from('explain_rooms')
        .update({
          guest_id: null,
          state: 'waiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId);

      console.log(`[RoomManager] Guest left room ${room.roomCode}`);
    }
  }

  /**
   * Close room (delete)
   */
  async closeRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Remove from maps
    this.rooms.delete(roomId);
    this.roomCodeToId.delete(room.roomCode);
    this.playerToRoom.delete(room.host.userId);
    if (room.guest) {
      this.playerToRoom.delete(room.guest.userId);
    }

    // Update database (mark as finished)
    await this.db
      .from('explain_rooms')
      .update({
        state: 'finished',
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    console.log(`[RoomManager] Room closed: ${room.roomCode}`);
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get room by code (case-insensitive)
   */
  getRoomByCode(roomCode: string): GameRoom | undefined {
    const normalizedCode = roomCode.toUpperCase();
    const roomId = this.roomCodeToId.get(normalizedCode);
    if (!roomId) {
      console.log(`[RoomManager] Room not found for code: ${normalizedCode}. Available codes:`, Array.from(this.roomCodeToId.keys()));
    }
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /**
   * Get room by player ID
   */
  getRoomByPlayer(userId: string): GameRoom | undefined {
    const roomId = this.playerToRoom.get(userId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /**
   * Restore room from database to memory
   * If room already exists in memory, update it with DB data
   */
  async restoreRoomFromDB(dbRoom: any): Promise<GameRoom> {
    const now = Date.now();
    
    // Check if room already exists in memory
    const existingRoom = this.rooms.get(dbRoom.id);

    // Create or update host player
    const host: Player = existingRoom?.host || {
      userId: dbRoom.host_id,
      nickname: '',
      socketId: '',
      isConnected: false,
      lastHeartbeat: now,
      choice: null,
      reason: '',
      hasSubmitted: false,
    };

    // Preserve socket connection if player already connected
    if (existingRoom?.host && existingRoom.host.userId === dbRoom.host_id) {
      host.socketId = existingRoom.host.socketId;
      host.nickname = existingRoom.host.nickname;
      host.isConnected = existingRoom.host.isConnected;
      host.lastHeartbeat = existingRoom.host.lastHeartbeat;
    }

    // Create or update guest player if exists
    let guest: Player | null = null;
    if (dbRoom.guest_id) {
      guest = existingRoom?.guest || {
        userId: dbRoom.guest_id,
        nickname: '',
        socketId: '',
        isConnected: false,
        lastHeartbeat: now,
        choice: null,
        reason: '',
        hasSubmitted: false,
      };

      // Preserve socket connection if player already connected
      if (existingRoom?.guest && existingRoom.guest.userId === dbRoom.guest_id) {
        guest.socketId = existingRoom.guest.socketId;
        guest.nickname = existingRoom.guest.nickname;
        guest.isConnected = existingRoom.guest.isConnected;
        guest.lastHeartbeat = existingRoom.guest.lastHeartbeat;
      }
    }

    // Map database state to in-memory state
    const stateMap: Record<string, any> = {
      'waiting': 'WAITING',
      'playing': 'CHOOSING_MOVE',
      'finished': 'GAME_OVER',
    };

    const room: GameRoom = {
      id: dbRoom.id,
      roomCode: dbRoom.room_code,
      host,
      guest,
      state: stateMap[dbRoom.state] || 'WAITING',
      currentRound: dbRoom.current_round || 1,
      scenario: existingRoom?.scenario || null,
      roundWins: existingRoom?.roundWins || { host: 0, guest: 0 },
      createdAt: existingRoom?.createdAt || new Date(dbRoom.created_at).getTime(),
      expiresAt: now + ROOM_TTL_MS,
      stateStartedAt: existingRoom?.stateStartedAt || now,
    };

    // Store in memory
    this.rooms.set(room.id, room);
    this.roomCodeToId.set(room.roomCode.toUpperCase(), room.id);
    this.playerToRoom.set(host.userId, room.id);
    if (guest) {
      this.playerToRoom.set(guest.userId, room.id);
    }

    console.log(`[RoomManager] Room ${existingRoom ? 'updated' : 'restored'} from DB: ${room.roomCode} (${room.id}), guest: ${guest ? guest.userId : 'none'}`);
    return room;
  }

  /**
   * Update player socket ID and nickname
   */
  updatePlayerSocket(userId: string, socketId: string, nickname?: string): void {
    const room = this.getRoomByPlayer(userId);
    if (!room) return;

    const now = Date.now();
    
    if (room.host.userId === userId) {
      room.host.socketId = socketId;
      room.host.isConnected = true;
      room.host.lastHeartbeat = now;
      if (nickname) room.host.nickname = nickname;
    } else if (room.guest?.userId === userId) {
      room.guest.socketId = socketId;
      room.guest.isConnected = true;
      room.guest.lastHeartbeat = now;
      if (nickname) room.guest.nickname = nickname;
    }
  }

  /**
   * Update player heartbeat
   */
  updatePlayerHeartbeat(userId: string): void {
    const room = this.getRoomByPlayer(userId);
    if (!room) return;

    const now = Date.now();
    if (room.host.userId === userId) {
      room.host.lastHeartbeat = now;
    } else if (room.guest?.userId === userId) {
      room.guest.lastHeartbeat = now;
    }
  }

  /**
   * Mark player as disconnected
   */
  markPlayerDisconnected(userId: string): void {
    const room = this.getRoomByPlayer(userId);
    if (!room) return;

    if (room.host.userId === userId) {
      room.host.isConnected = false;
    } else if (room.guest?.userId === userId) {
      room.guest.isConnected = false;
    }

    console.log(`[RoomManager] Player ${userId} disconnected from room ${room.roomCode}`);
  }

  /**
   * Get all active rooms (for monitoring)
   */
  getActiveRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get active room count
   */
  getActiveRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Cleanup expired rooms
   */
  private async cleanupExpiredRooms(): Promise<void> {
    const now = Date.now();
    const expiredRooms: string[] = [];

    for (const [roomId, room] of this.rooms.entries()) {
      // Room expired (1h TTL)
      if (now > room.expiresAt) {
        expiredRooms.push(roomId);
        continue;
      }

      // Waiting too long for second player (10 min)
      if (room.state === 'WAITING' && !room.guest && now - room.createdAt > 10 * 60 * 1000) {
        expiredRooms.push(roomId);
        continue;
      }

      // Both players disconnected for 60s
      if (room.guest) {
        const hostDisconnected = !room.host.isConnected && now - room.host.lastHeartbeat > 60_000;
        const guestDisconnected = !room.guest.isConnected && now - room.guest.lastHeartbeat > 60_000;
        
        if (hostDisconnected && guestDisconnected) {
          expiredRooms.push(roomId);
          continue;
        }
      }
    }

    // Close expired rooms
    for (const roomId of expiredRooms) {
      await this.closeRoom(roomId);
    }

    if (expiredRooms.length > 0) {
      console.log(`[RoomManager] Cleaned up ${expiredRooms.length} expired rooms`);
    }

    // Also cleanup database (call Supabase function)
    const { data, error } = await this.db.rpc('cleanup_expired_explain_rooms');
    if (error) {
      console.error('[RoomManager] Database cleanup error:', error);
    } else if (data > 0) {
      console.log(`[RoomManager] Database cleanup: removed ${data} old rooms`);
    }
  }

  /**
   * Generate unique room code
   */
  private generateRoomCode(): string {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
        code += ROOM_CODE_CHARS[randomIndex];
      }
      attempts++;
    } while (this.roomCodeToId.has(code) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique room code');
    }

    return code;
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
export const roomManager = new RoomManager();

