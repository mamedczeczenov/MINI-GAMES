/**
 * Socket.IO Client for Explain Your Move
 * Frontend WebSocket connection
 */

import { io, Socket } from 'socket.io-client';
import type {
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
} from '../../services/explain/types';

type EventHandler<T = any> = (data: T) => void;

export class ExplainSocketClient {
  private socket: Socket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();

  /**
   * Connect to WebSocket server
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = import.meta.env.PUBLIC_WS_URL || 'ws://localhost:3001';

      this.socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected');
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
      });

      this.socket.on('error', (error: WSErrorPayload) => {
        console.error('[Socket] Error:', error.message);
        this.emit('error', error);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
        reject(error);
      });

      // Register event forwarders
      this.setupEventForwarding();

      // Start heartbeat
      this.startHeartbeat();
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.handlers.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // ============================================================================
  // Outgoing Events (Client → Server)
  // ============================================================================

  /**
   * Join room
   */
  joinRoom(roomCode: string, userId: string, token: string): void {
    console.log('[Socket] joinRoom called:', { roomCode, userId, connected: this.socket?.connected });
    if (!this.socket || !this.socket.connected) {
      console.error('[Socket] Cannot join room - socket not connected');
      throw new Error('Socket not connected');
    }
    const payload: WSRoomJoinPayload = { roomCode, userId, token };
    console.log('[Socket] Emitting room:join:', payload);
    this.socket.emit('room:join', payload);
    console.log('[Socket] room:join emitted successfully');
  }

  /**
   * Signal ready
   */
  playerReady(): void {
    this.socket?.emit('player:ready');
  }

  /**
   * Choose A or B
   */
  gameChoose(choice: 'A' | 'B'): void {
    const payload: WSGameChoosePayload = { choice };
    this.socket?.emit('game:choose', payload);
  }

  /**
   * Submit reason
   */
  gameSubmitReason(reason: string): void {
    const payload: WSGameSubmitReasonPayload = { reason };
    this.socket?.emit('game:submit_reason', payload);
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  /**
   * Subscribe to event
   */
  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Unsubscribe from event
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to local handlers
   */
  private emit(event: string, data: any): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupEventForwarding(): void {
    if (!this.socket) return;

    // Room events
    this.socket.on('room:player_joined', (data: WSRoomPlayerJoinedPayload) => {
      this.emit('room:player_joined', data);
    });

    // Game events
    this.socket.on('game:countdown', (data: WSGameCountdownPayload) => {
      this.emit('game:countdown', data);
    });

    this.socket.on('game:scenario', (data: WSGameScenarioPayload) => {
      this.emit('game:scenario', data);
    });

    this.socket.on('game:timer', (data: WSGameTimerPayload) => {
      this.emit('game:timer', data);
    });

    this.socket.on('game:opponent_chose', (data: any) => {
      this.emit('game:opponent_chose', data);
    });

    this.socket.on('game:phase_writing', (data: WSGamePhaseWritingPayload) => {
      this.emit('game:phase_writing', data);
    });

    this.socket.on('game:opponent_submitted', () => {
      this.emit('game:opponent_submitted', {});
    });

    this.socket.on('game:ai_judging', () => {
      this.emit('game:ai_judging', {});
    });

    this.socket.on('game:round_results', (data: WSGameRoundResultsPayload) => {
      this.emit('game:round_results', data);
    });

    this.socket.on('game:over', (data: WSGameOverPayload) => {
      this.emit('game:over', data);
    });

    // Pong
    this.socket.on('pong', () => {
      // Heartbeat received
    });
  }

  private startHeartbeat(): void {
    setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 5000);
  }
}

// Singleton instance
let socketClient: ExplainSocketClient | null = null;

export function getSocketClient(): ExplainSocketClient {
  if (!socketClient) {
    socketClient = new ExplainSocketClient();
  }
  return socketClient;
}

