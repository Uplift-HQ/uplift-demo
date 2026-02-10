// ============================================================
// UPLIFT WEBSOCKET HOOK
// Real-time sync via Socket.io client
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import SocketIO from 'socket.io-client';
import { api } from '../services/api';
import { secureStorage } from '../services/secureStorage';

const io = SocketIO;
type SocketType = ReturnType<typeof io>;

// WebSocket configuration
const WS_URL = __DEV__
  ? 'ws://localhost:3000'
  : 'wss://api.uplifthq.co.uk';

// Reconnection settings
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;

// -------------------- Types --------------------

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

interface WebSocketEvent {
  _timestamp: number;
  _eventId: string;
  [key: string]: any;
}

type EventHandler = (data: WebSocketEvent) => void;

// -------------------- Hook --------------------

export function useWebSocket() {
  const socketRef = useRef<SocketType | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
  });

  // Connect to WebSocket server
  const connect = useCallback(async () => {
    if (socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      // Get auth token from secure storage
      const token = await secureStorage.getToken('access');
      
      if (!token) {
        setState(prev => ({ ...prev, connecting: false, error: 'No auth token' }));
        return;
      }

      // Create socket connection
      const socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: RECONNECT_ATTEMPTS,
        reconnectionDelay: RECONNECT_DELAY,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      // Connection handlers
      socket.on('connect', () => {
        setState({ connected: true, connecting: false, error: null });
      });

      socket.on('disconnect', (reason: string) => {
        setState(prev => ({ ...prev, connected: false }));
      });

      socket.on('connect_error', (error: Error) => {
        setState(prev => ({
          ...prev,
          connecting: false,
          error: error.message
        }));
      });

      // Handle reconnection
      socket.on('reconnect', (attemptNumber: number) => {
        setState({ connected: true, connecting: false, error: null });
      });

      socket.on('reconnect_failed', () => {
        setState(prev => ({ 
          ...prev, 
          connecting: false, 
          error: 'Reconnection failed' 
        }));
      });

      // Server connection confirmation
      socket.on('connected', (data: WebSocketEvent) => {
      });

      // Set up event forwarding to registered handlers
      (socket as any).onAny((event: string, data: WebSocketEvent) => {
        const handlers = handlersRef.current.get(event);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(data);
            } catch (e) {
            }
          });
        }
      });

      socketRef.current = socket;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        connecting: false, 
        error: error.message 
      }));
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState({ connected: false, connecting: false, error: null });
    }
  }, []);

  // Subscribe to events
  const subscribe = useCallback((event: string, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      handlersRef.current.get(event)?.delete(handler);
    };
  }, []);

  // Subscribe to channels (rooms)
  const subscribeToChannels = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', channels);
    }
  }, []);

  // Unsubscribe from channels
  const unsubscribeFromChannels = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', channels);
    }
  }, []);

  // Emit event
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Acknowledge event receipt
  const acknowledge = useCallback((eventId: string) => {
    emit('ack', { eventId });
  }, [emit]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    subscribe,
    subscribeToChannels,
    unsubscribeFromChannels,
    emit,
    acknowledge,
  };
}

// -------------------- Event-specific hooks --------------------

/**
 * Hook for schedule updates
 */
export function useScheduleUpdates(onUpdate: (shift: any) => void) {
  const { subscribe, connected } = useWebSocket();

  useEffect(() => {
    if (!connected) return;

    const unsubscribes = [
      subscribe('shift:created', (data) => onUpdate({ ...data, action: 'created' })),
      subscribe('shift:updated', (data) => onUpdate({ ...data, action: 'updated' })),
      subscribe('shift:deleted', (data) => onUpdate({ ...data, action: 'deleted' })),
      subscribe('shift:assigned', (data) => onUpdate({ ...data, action: 'assigned' })),
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [connected, subscribe, onUpdate]);
}

/**
 * Hook for notification updates
 */
export function useNotificationUpdates(onNotification: (notification: any) => void) {
  const { subscribe, connected } = useWebSocket();

  useEffect(() => {
    if (!connected) return;

    const unsub = subscribe('notification', onNotification);
    return unsub;
  }, [connected, subscribe, onNotification]);
}

/**
 * Hook for gamification updates (badges, levels, etc.)
 */
export function useGamificationUpdates(
  onBadge: (badge: any) => void,
  onLevelUp: (data: any) => void
) {
  const { subscribe, connected } = useWebSocket();

  useEffect(() => {
    if (!connected) return;

    const unsubscribes = [
      subscribe('badge:earned', onBadge),
      subscribe('gamification:level_up', onLevelUp),
      subscribe('gamification:streak', (data) => onBadge({ ...data, type: 'streak' })),
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [connected, subscribe, onBadge, onLevelUp]);
}

/**
 * Hook for time tracking updates
 */
export function useTimeTrackingUpdates(onUpdate: (entry: any) => void) {
  const { subscribe, connected } = useWebSocket();

  useEffect(() => {
    if (!connected) return;

    const unsubscribes = [
      subscribe('time:clock_in', (data) => onUpdate({ ...data, action: 'clock_in' })),
      subscribe('time:clock_out', (data) => onUpdate({ ...data, action: 'clock_out' })),
      subscribe('time:break_start', (data) => onUpdate({ ...data, action: 'break_start' })),
      subscribe('time:break_end', (data) => onUpdate({ ...data, action: 'break_end' })),
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [connected, subscribe, onUpdate]);
}

/**
 * Hook for feed/social updates
 */
export function useFeedUpdates(
  onPost: (post: any) => void,
  onReaction: (reaction: any) => void
) {
  const { subscribe, connected } = useWebSocket();

  useEffect(() => {
    if (!connected) return;

    const unsubscribes = [
      subscribe('feed:post_created', onPost),
      subscribe('feed:post_liked', onReaction),
      subscribe('feed:comment_added', onReaction),
      subscribe('feed:recognition', onPost),
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [connected, subscribe, onPost, onReaction]);
}

