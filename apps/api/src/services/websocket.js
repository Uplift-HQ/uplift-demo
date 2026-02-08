// ============================================================
// UPLIFT WEBSOCKET SERVICE
// Real-time sync via Socket.io
// ============================================================

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { db } from '../lib/database.js';

// Use db.query for queries and db.getClient() for transactions
const pool = { 
  query: db.query.bind(db), 
  connect: db.getClient.bind(db) 
};

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Store active connections
const connections = new Map(); // userId -> Set of socket ids
const socketToUser = new Map(); // socketId -> { userId, organizationId }

let io = null;

// -------------------- Initialize --------------------

/**
 * Initialize WebSocket server
 * @param {import('http').Server} httpServer 
 */
export function initializeWebSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user details
      const result = await pool.query(
        'SELECT id, organization_id, role FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (!result.rows[0]) {
        return next(new Error('User not found'));
      }

      socket.user = {
        id: decoded.userId,
        organizationId: result.rows[0].organization_id,
        role: result.rows[0].role,
      };

      next();
    } catch (error) {
      console.error('WebSocket auth error:', error.message);
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const { id: userId, organizationId, role } = socket.user;
    
    console.log(`WebSocket connected: user=${userId}, socket=${socket.id}`);

    // Track connection
    if (!connections.has(userId)) {
      connections.set(userId, new Set());
    }
    connections.get(userId).add(socket.id);
    socketToUser.set(socket.id, { userId, organizationId });

    // Join organization room
    socket.join(`org:${organizationId}`);
    
    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-based room
    socket.join(`role:${organizationId}:${role}`);

    // ----- Event Handlers -----

    // Subscribe to specific resource updates
    socket.on('subscribe', (channels) => {
      if (Array.isArray(channels)) {
        channels.forEach(channel => {
          // Validate channel format and permissions
          if (isValidChannel(channel, socket.user)) {
            socket.join(channel);
            console.log(`User ${userId} subscribed to ${channel}`);
          }
        });
      }
    });

    // Unsubscribe from channels
    socket.on('unsubscribe', (channels) => {
      if (Array.isArray(channels)) {
        channels.forEach(channel => {
          socket.leave(channel);
        });
      }
    });

    // Typing indicator for chat
    socket.on('typing', ({ channelId }) => {
      socket.to(`chat:${channelId}`).emit('user_typing', {
        userId,
        channelId,
      });
    });

    // Acknowledge receipt of update
    socket.on('ack', ({ eventId }) => {
      // Could be used for delivery confirmation
      console.log(`Event ${eventId} acknowledged by user ${userId}`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`WebSocket disconnected: user=${userId}, reason=${reason}`);
      
      const userSockets = connections.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connections.delete(userId);
        }
      }
      socketToUser.delete(socket.id);
    });

    // Send initial connection success
    socket.emit('connected', { 
      userId,
      organizationId,
      serverTime: new Date().toISOString(),
    });
  });

  console.log('WebSocket server initialized');
  return io;
}

// -------------------- Channel Validation --------------------

function isValidChannel(channel, user) {
  // Organization channels
  if (channel.startsWith('org:')) {
    const orgId = channel.split(':')[1];
    return orgId === user.organizationId;
  }

  // Location channels
  if (channel.startsWith('location:')) {
    // Could add location access validation
    return true;
  }

  // Schedule channels
  if (channel.startsWith('schedule:')) {
    return true;
  }

  // Chat channels
  if (channel.startsWith('chat:')) {
    // Could validate chat membership
    return true;
  }

  return false;
}

// -------------------- Emit Events --------------------

/**
 * Emit event to a specific user (all their devices)
 */
export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, {
    ...data,
    _timestamp: Date.now(),
    _eventId: generateEventId(),
  });
}

/**
 * Emit event to multiple users
 */
export function emitToUsers(userIds, event, data) {
  if (!io) return;
  userIds.forEach(userId => {
    emitToUser(userId, event, data);
  });
}

/**
 * Emit event to entire organization
 */
export function emitToOrganization(organizationId, event, data) {
  if (!io) return;
  io.to(`org:${organizationId}`).emit(event, {
    ...data,
    _timestamp: Date.now(),
    _eventId: generateEventId(),
  });
}

/**
 * Emit event to specific location
 */
export function emitToLocation(locationId, event, data) {
  if (!io) return;
  io.to(`location:${locationId}`).emit(event, {
    ...data,
    _timestamp: Date.now(),
    _eventId: generateEventId(),
  });
}

/**
 * Emit event to managers in an organization
 */
export function emitToManagers(organizationId, event, data) {
  if (!io) return;
  io.to(`role:${organizationId}:manager`).emit(event, data);
  io.to(`role:${organizationId}:admin`).emit(event, data);
}

/**
 * Emit to a specific channel
 */
export function emitToChannel(channel, event, data) {
  if (!io) return;
  io.to(channel).emit(event, {
    ...data,
    _timestamp: Date.now(),
    _eventId: generateEventId(),
  });
}

// -------------------- Event Types --------------------

export const Events = {
  // Schedule events
  SHIFT_CREATED: 'shift:created',
  SHIFT_UPDATED: 'shift:updated',
  SHIFT_DELETED: 'shift:deleted',
  SHIFT_ASSIGNED: 'shift:assigned',
  SHIFT_CLAIMED: 'shift:claimed',
  
  // Time tracking
  CLOCK_IN: 'time:clock_in',
  CLOCK_OUT: 'time:clock_out',
  BREAK_START: 'time:break_start',
  BREAK_END: 'time:break_end',
  
  // Time off
  TIME_OFF_REQUESTED: 'timeoff:requested',
  TIME_OFF_APPROVED: 'timeoff:approved',
  TIME_OFF_REJECTED: 'timeoff:rejected',
  
  // Swaps
  SWAP_REQUESTED: 'swap:requested',
  SWAP_ACCEPTED: 'swap:accepted',
  SWAP_REJECTED: 'swap:rejected',
  SWAP_APPROVED: 'swap:approved',
  
  // Skills
  SKILL_ADDED: 'skill:added',
  SKILL_VERIFIED: 'skill:verified',
  SKILL_EXPIRED: 'skill:expired',
  
  // Tasks
  TASK_ASSIGNED: 'task:assigned',
  TASK_COMPLETED: 'task:completed',
  TASK_UPDATED: 'task:updated',
  
  // Achievements
  BADGE_EARNED: 'badge:earned',
  LEVEL_UP: 'gamification:level_up',
  STREAK_MILESTONE: 'gamification:streak',
  
  // Feed
  POST_CREATED: 'feed:post_created',
  POST_LIKED: 'feed:post_liked',
  COMMENT_ADDED: 'feed:comment_added',
  RECOGNITION_GIVEN: 'feed:recognition',
  
  // Notifications
  NOTIFICATION: 'notification',
  
  // Employees
  EMPLOYEE_UPDATED: 'employee:updated',
  EMPLOYEE_STATUS_CHANGED: 'employee:status_changed',
  
  // System
  ANNOUNCEMENT: 'system:announcement',
  SYNC_REQUIRED: 'system:sync_required',
};

// -------------------- Convenience Methods --------------------

/**
 * Notify about schedule changes
 */
export function notifyScheduleChange(organizationId, locationId, change) {
  emitToOrganization(organizationId, Events.SHIFT_UPDATED, {
    type: 'schedule_change',
    locationId,
    ...change,
  });
  
  if (locationId) {
    emitToLocation(locationId, Events.SHIFT_UPDATED, change);
  }
}

/**
 * Notify user about their shift
 */
export function notifyShiftAssignment(userId, shift) {
  emitToUser(userId, Events.SHIFT_ASSIGNED, { shift });
}

/**
 * Notify about time off decision
 */
export function notifyTimeOffDecision(userId, request, approved) {
  emitToUser(userId, approved ? Events.TIME_OFF_APPROVED : Events.TIME_OFF_REJECTED, {
    request,
  });
}

/**
 * Notify about badge earned
 */
export function notifyBadgeEarned(userId, badge) {
  emitToUser(userId, Events.BADGE_EARNED, { badge });
}

/**
 * Notify managers about pending approvals
 */
export function notifyPendingApproval(organizationId, approval) {
  emitToManagers(organizationId, 'approval:pending', approval);
}

/**
 * Broadcast announcement to organization
 */
export function broadcastAnnouncement(organizationId, announcement) {
  emitToOrganization(organizationId, Events.ANNOUNCEMENT, { announcement });
}

// -------------------- Utility --------------------

function generateEventId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if user is currently connected
 */
export function isUserOnline(userId) {
  return connections.has(userId) && connections.get(userId).size > 0;
}

/**
 * Get count of online users in organization
 */
export async function getOnlineCount(organizationId) {
  let count = 0;
  for (const [socketId, info] of socketToUser) {
    if (info.organizationId === organizationId) {
      count++;
    }
  }
  return count;
}

/**
 * Get WebSocket server instance
 */
export function getIO() {
  return io;
}

export default {
  initializeWebSocket,
  emitToUser,
  emitToUsers,
  emitToOrganization,
  emitToLocation,
  emitToManagers,
  emitToChannel,
  notifyScheduleChange,
  notifyShiftAssignment,
  notifyTimeOffDecision,
  notifyBadgeEarned,
  notifyPendingApproval,
  broadcastAnnouncement,
  isUserOnline,
  getOnlineCount,
  Events,
};
