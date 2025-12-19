/**
 * WebSocket Server for Explain Your Move (Socket.IO)
 * Handles real-time multiplayer game logic
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { createClient } from '@supabase/supabase-js';
import { roomManager } from './room.manager';
import { gameEngine, GAME_CONFIG } from './game.engine';
import { rateLimiterService } from './rate-limiter.service';
import type {
  GameRoom,
  WSRoomJoinPayload,
  WSGameChoosePayload,
  WSGameSubmitReasonPayload,
  WSRoomPlayerJoinedPayload,
  WSGameCountdownPayload,
  WSGameScenarioPayload,
  WSGameTimerPayload,
  WSGamePhaseWritingPayload,
  WSGameRoundResultsPayload,
  WSGameOverPayload,
  WSErrorPayload,
} from './types';

export class WebSocketServer {
  private io: SocketIOServer;
  private supabase: ReturnType<typeof createClient>;
  private timers = new Map<string, NodeJS.Timeout>(); // roomId → timer
  private env: Record<string, string | undefined>;

  constructor(httpServer: HTTPServer) {
    // Support both Astro/Vite (import.meta.env) and plain Node (process.env).
    const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any)?.env ? (import.meta as any).env : {};
    this.env = {
      ...metaEnv,
      ...process.env,
    };

    const getEnv = (key: string): string | undefined => this.env[key];
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('[WebSocket] Missing SUPABASE_URL or SUPABASE_KEY (service role key required server-side to bypass RLS)');
    }

    const role = this.decodeJwtRole(supabaseKey);
    if (role && role !== 'service_role') {
      throw new Error(
        `[WebSocket] Provided Supabase key is not service_role (role=${role}). Use the service_role key from Supabase Settings → API.`,
      );
    }

    const corsOrigin = getEnv('PUBLIC_SITE_URL') || getEnv('SITE_URL') || '*';

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigin,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 10000,
      pingInterval: 5000,
    });

    this.supabase = createClient(supabaseUrl, supabaseKey);

    this.setupSocketHandlers();
    console.log('[WebSocket] Server initialized');
  }

  private setupSocketHandlers(): void {
    this.io.use(async (socket, next) => {
      try {
        // Auth middleware
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('No auth token provided'));
        }

        const { data: { user }, error } = await this.supabase.auth.getUser(token);
        if (error || !user) {
          return next(new Error('Invalid auth token'));
        }

        socket.data.userId = user.id;
        socket.data.nickname = user.user_metadata?.nickname || user.email;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      console.log(`[WebSocket] User connected: ${userId} (${socket.id})`);

      // Room join
      socket.on('room:join', async (payload: WSRoomJoinPayload) => {
        try {
          await this.handleRoomJoin(socket, payload);
        } catch (error: any) {
          socket.emit('error', { message: error.message } as WSErrorPayload);
        }
      });

      // Player ready (starts countdown)
      socket.on('player:ready', async () => {
        try {
          await this.handlePlayerReady(socket);
        } catch (error: any) {
          socket.emit('error', { message: error.message } as WSErrorPayload);
        }
      });

      // Game choose (A or B)
      socket.on('game:choose', async (payload: WSGameChoosePayload) => {
        try {
          await this.handleGameChoose(socket, payload);
        } catch (error: any) {
          socket.emit('error', { message: error.message } as WSErrorPayload);
        }
      });

      // Game submit reason
      socket.on('game:submit_reason', async (payload: WSGameSubmitReasonPayload) => {
        try {
          await this.handleSubmitReason(socket, payload);
        } catch (error: any) {
          socket.emit('error', { message: error.message } as WSErrorPayload);
        }
      });

      // Ping/pong (heartbeat)
      socket.on('ping', () => {
        roomManager.updatePlayerHeartbeat(userId);
        socket.emit('pong');
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private async handleRoomJoin(socket: any, payload: WSRoomJoinPayload): Promise<void> {
    const userId = socket.data.userId;
    console.log(`[WebSocket] Player ${userId} attempting to join room: ${payload.roomCode}`);
    
    let room = roomManager.getRoomByCode(payload.roomCode);

    // If room not in memory, try to load from database
    if (!room) {
      console.log(`[WebSocket] Room not in memory, checking database...`);
      
      try {
        const { data: dbRoom, error } = await (this.supabase as any)
          .from('explain_rooms')
          .select('*')
          .eq('room_code', payload.roomCode.toUpperCase())
          .single();

        if (error || !dbRoom) {
          console.error(`[WebSocket] Room not found in database: ${payload.roomCode}`, error);
          throw new Error('Room not found');
        }

        console.log(`[WebSocket] Room found in database:`, dbRoom);

        // Restore room to memory
        room = await roomManager.restoreRoomFromDB(dbRoom);
        console.log(`[WebSocket] Room restored to memory: ${room.roomCode}`);
      } catch (error) {
        console.error(`[WebSocket] Failed to load room from database:`, error);
        throw new Error('Room not found');
      }
    }

    console.log(`[WebSocket] Room found: ${room.id}, state: ${room.state}, has guest: ${!!room.guest}`);

    // Check if player is in room (host or guest)
    const isHost = room.host.userId === userId;
    const isGuest = room.guest?.userId === userId;
    
    console.log(`[WebSocket] Player check: isHost=${isHost}, isGuest=${isGuest}`);

    // If player is not in room yet, refresh from database (guest might have joined via API)
    if (!isHost && !isGuest) {
      console.log(`[WebSocket] Player not in room, refreshing from database...`);
      
      try {
        const { data: dbRoom, error } = await (this.supabase as any)
          .from('explain_rooms')
          .select('*')
          .eq('room_code', payload.roomCode.toUpperCase())
          .single();

        if (!error && dbRoom) {
          console.log(`[WebSocket] Refreshed room data:`, dbRoom);
          // Update room in memory with fresh data from DB
          room = await roomManager.restoreRoomFromDB(dbRoom);
        }
      } catch (error) {
        console.error(`[WebSocket] Failed to refresh room from database:`, error);
      }
    }

    // Update player socket and nickname
    roomManager.updatePlayerSocket(userId, socket.id, socket.data.nickname);
    socket.join(room.id);

    console.log(`[WebSocket] Player ${socket.data.nickname} (${userId}) joined room ${room.roomCode} (${room.id})`);
    console.log(`[WebSocket] Room state after join: guest=${!!room.guest}, state=${room.state}`);

    // Notify all players
    this.io.to(room.id).emit('room:player_joined', {
      player: {
        userId,
        nickname: socket.data.nickname,
      },
      room,
    } as WSRoomPlayerJoinedPayload);

    // If both players present and in waiting state, start countdown
    if (room.guest && room.state === 'WAITING') {
      console.log(`[WebSocket] Both players present, starting countdown for room ${room.roomCode}`);
      await this.startCountdown(room);
    } else {
      console.log(`[WebSocket] Not starting countdown: guest=${!!room.guest}, state=${room.state}`);
    }
  }

  private async handlePlayerReady(socket: any): Promise<void> {
    const userId = socket.data.userId;
    const room = roomManager.getRoomByPlayer(userId);

    if (!room) {
      throw new Error('Not in a room');
    }

    if (!room.guest) {
      throw new Error('Waiting for second player');
    }

    // Start countdown if not already started
    if (room.state === 'WAITING') {
      await this.startCountdown(room);
    }
  }

  private async handleGameChoose(socket: any, payload: WSGameChoosePayload): Promise<void> {
    const userId = socket.data.userId;
    const room = roomManager.getRoomByPlayer(userId);

    if (!room) {
      throw new Error('Not in a room');
    }

    // Rate limit check
    await rateLimiterService.enforceSocketLimit(socket.id);

    // Set choice
    const bothChose = gameEngine.setPlayerChoice(room, userId, payload.choice);

    // Notify opponent (without revealing choice)
    socket.to(room.id).emit('game:opponent_chose', { opponentReady: true });

    // If both chose, move to writing phase
    if (bothChose) {
      this.clearTimer(room.id);
      gameEngine.startWritingPhase(room);
      
      this.io.to(room.id).emit('game:phase_writing', {
        timeLimit: GAME_CONFIG.WRITING_REASON_SECONDS,
      } as WSGamePhaseWritingPayload);

      // Start writing timer
      this.startTimer(room.id, GAME_CONFIG.WRITING_REASON_SECONDS * 1000, async () => {
        await this.handleWritingTimeout(room);
      });

      this.startTimerBroadcast(room);
    }
  }

  private async handleSubmitReason(socket: any, payload: WSGameSubmitReasonPayload): Promise<void> {
    const userId = socket.data.userId;
    const room = roomManager.getRoomByPlayer(userId);

    if (!room) {
      throw new Error('Not in a room');
    }

    // Rate limit check
    await rateLimiterService.enforceSocketLimit(socket.id);

    // Submit reason
    const bothSubmitted = gameEngine.submitPlayerReason(room, userId, payload.reason);

    // Notify opponent
    socket.to(room.id).emit('game:opponent_submitted');

    // If both submitted, start AI judging
    if (bothSubmitted) {
      this.clearTimer(room.id);
      await this.startJudging(room);
    }
  }

  private handleDisconnect(socket: any): void {
    const userId = socket.data.userId;
    roomManager.markPlayerDisconnected(userId);
    console.log(`[WebSocket] User disconnected: ${userId}`);
  }

  // ============================================================================
  // Game Flow Methods
  // ============================================================================

  private async startCountdown(room: GameRoom): Promise<void> {
    await gameEngine.startCountdown(room);
    
    // Update database state to 'playing'
    await (this.supabase as any)
      .from('explain_rooms')
      .update({
        state: 'playing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id);
    
    console.log(`[WebSocket] Updated room ${room.roomCode} state to 'playing' in database`);
    
    // Broadcast countdown
    let secondsLeft = GAME_CONFIG.COUNTDOWN_SECONDS;
    this.io.to(room.id).emit('game:countdown', { seconds: secondsLeft } as WSGameCountdownPayload);

    const interval = setInterval(() => {
      secondsLeft--;
      this.io.to(room.id).emit('game:countdown', { seconds: secondsLeft } as WSGameCountdownPayload);

      if (secondsLeft <= 0) {
        clearInterval(interval);
        this.startRound(room);
      }
    }, 1000);
  }

  private async startRound(room: GameRoom): Promise<void> {
    try {
      const scenario = await gameEngine.startRound(room);

      // Broadcast scenario
      this.io.to(room.id).emit('game:scenario', {
        scenario,
        round: room.currentRound,
        timeLimit: GAME_CONFIG.CHOOSING_MOVE_SECONDS,
      } as WSGameScenarioPayload);

      // Start choosing timer
      this.startTimer(room.id, GAME_CONFIG.CHOOSING_MOVE_SECONDS * 1000, async () => {
        await this.handleChoosingTimeout(room);
      });

      this.startTimerBroadcast(room);
    } catch (error) {
      console.error('[WebSocket] Failed to start round:', error);
      this.io.to(room.id).emit('error', { message: 'Failed to start round' } as WSErrorPayload);
    }
  }

  private async startJudging(room: GameRoom): Promise<void> {
    try {
      // Notify players AI is judging
      this.io.to(room.id).emit('game:ai_judging');

      // Judge
      await gameEngine.judgeRound(room);

      // Broadcast results
      await this.broadcastRoundResults(room);

      // Auto-advance after display time
      this.startTimer(room.id, GAME_CONFIG.ROUND_RESULTS_DISPLAY_SECONDS * 1000, async () => {
        await this.advanceGame(room);
      });
    } catch (error) {
      console.error('[WebSocket] Failed to judge round:', error);
      this.io.to(room.id).emit('error', { message: 'Failed to judge round' } as WSErrorPayload);
    }
  }

  private async broadcastRoundResults(room: GameRoom): Promise<void> {
    if (!room.guest || !room.host.scores || !room.guest.scores) {
      throw new Error('Invalid game state for broadcasting results');
    }

    // Send personalized results to each player
    const hostSocket = this.io.sockets.sockets.get(room.host.socketId);
    const guestSocket = this.io.sockets.sockets.get(room.guest.socketId);

    if (hostSocket) {
      const hostPayload: WSGameRoundResultsPayload = {
        round: room.currentRound,
        yourChoice: room.host.choice!,
        yourReason: room.host.reason,
        yourScores: room.host.scores,
        yourTotal: room.host.totalScore!,
        yourFeedback: room.host.feedback!,
        opponentChoice: room.guest.choice!,
        opponentReason: room.guest.reason,
        opponentScores: room.guest.scores,
        opponentTotal: room.guest.totalScore!,
        opponentFeedback: room.guest.feedback!,
        winner: room.host.totalScore! > room.guest.totalScore! ? 'you' : 
                room.guest.totalScore! > room.host.totalScore! ? 'opponent' : 'tie',
        roundWins: { you: room.roundWins.host, opponent: room.roundWins.guest },
      };
      hostSocket.emit('game:round_results', hostPayload);
    }

    if (guestSocket) {
      const guestPayload: WSGameRoundResultsPayload = {
        round: room.currentRound,
        yourChoice: room.guest.choice!,
        yourReason: room.guest.reason,
        yourScores: room.guest.scores,
        yourTotal: room.guest.totalScore!,
        yourFeedback: room.guest.feedback!,
        opponentChoice: room.host.choice!,
        opponentReason: room.host.reason,
        opponentScores: room.host.scores,
        opponentTotal: room.host.totalScore!,
        opponentFeedback: room.host.feedback!,
        winner: room.guest.totalScore! > room.host.totalScore! ? 'you' : 
                room.host.totalScore! > room.guest.totalScore! ? 'opponent' : 'tie',
        roundWins: { you: room.roundWins.guest, opponent: room.roundWins.host },
      };
      guestSocket.emit('game:round_results', guestPayload);
    }
  }

  private async advanceGame(room: GameRoom): Promise<void> {
    this.clearTimer(room.id);

    const result = await gameEngine.advanceGame(room);

    if (result === 'game_over') {
      await this.endGame(room);
    } else {
      await this.startRound(room);
    }
  }

  private async endGame(room: GameRoom): Promise<void> {
    if (!room.guest) return;

    // Calculate MVP round (highest score)
    // TODO: Implement MVP round calculation

    // Send game over to both players
    const hostSocket = this.io.sockets.sockets.get(room.host.socketId);
    const guestSocket = this.io.sockets.sockets.get(room.guest.socketId);

    const hostWon = room.roundWins.host > room.roundWins.guest;
    const guestWon = room.roundWins.guest > room.roundWins.host;

    if (hostSocket) {
      const payload: WSGameOverPayload = {
        winner: hostWon ? 'you' : 'opponent',
        finalScore: { you: room.host.totalScore || 0, opponent: room.guest.totalScore || 0 },
        roundWins: { you: room.roundWins.host, opponent: room.roundWins.guest },
        mvpRound: 1, // TODO
      };
      hostSocket.emit('game:over', payload);
    }

    if (guestSocket) {
      const payload: WSGameOverPayload = {
        winner: guestWon ? 'you' : 'opponent',
        finalScore: { you: room.guest.totalScore || 0, opponent: room.host.totalScore || 0 },
        roundWins: { you: room.roundWins.guest, opponent: room.roundWins.host },
        mvpRound: 1, // TODO
      };
      guestSocket.emit('game:over', payload);
    }

    // Clean up room after 30s
    setTimeout(() => {
      roomManager.closeRoom(room.id);
    }, 30_000);
  }

  // ============================================================================
  // Timeout Handlers
  // ============================================================================

  private async handleChoosingTimeout(room: GameRoom): Promise<void> {
    if (room.state !== 'CHOOSING_MOVE') return;

    gameEngine.handleChoosingMoveTimeout(room);
    
    this.io.to(room.id).emit('game:phase_writing', {
      timeLimit: GAME_CONFIG.WRITING_REASON_SECONDS,
    } as WSGamePhaseWritingPayload);

    this.startTimer(room.id, GAME_CONFIG.WRITING_REASON_SECONDS * 1000, async () => {
      await this.handleWritingTimeout(room);
    });

    this.startTimerBroadcast(room);
  }

  private async handleWritingTimeout(room: GameRoom): Promise<void> {
    if (room.state !== 'WRITING_REASON') return;

    gameEngine.handleWritingReasonTimeout(room);
    await this.startJudging(room);
  }

  // ============================================================================
  // Timer Utilities
  // ============================================================================

  private startTimer(roomId: string, ms: number, callback: () => void): void {
    this.clearTimer(roomId);
    const timer = setTimeout(callback, ms);
    this.timers.set(roomId, timer);
  }

  private clearTimer(roomId: string): void {
    const timer = this.timers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomId);
    }
  }

  private startTimerBroadcast(room: GameRoom): void {
    const broadcastInterval = setInterval(() => {
      const elapsed = Date.now() - room.stateStartedAt;
      const timeLimit = this.getTimeLimitForState(room.state);
      const timeLeft = Math.max(0, Math.floor((timeLimit - elapsed) / 1000));

      this.io.to(room.id).emit('game:timer', {
        state: room.state,
        timeLeft,
      } as WSGameTimerPayload);

      if (timeLeft <= 0) {
        clearInterval(broadcastInterval);
      }
    }, 1000);
  }

  private getTimeLimitForState(state: string): number {
    switch (state) {
      case 'CHOOSING_MOVE':
        return GAME_CONFIG.CHOOSING_MOVE_SECONDS * 1000;
      case 'WRITING_REASON':
        return GAME_CONFIG.WRITING_REASON_SECONDS * 1000;
      case 'ROUND_RESULTS':
        return GAME_CONFIG.ROUND_RESULTS_DISPLAY_SECONDS * 1000;
      default:
        return 0;
    }
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

// Export factory function
export function createWebSocketServer(httpServer: HTTPServer): WebSocketServer {
  return new WebSocketServer(httpServer);
}

