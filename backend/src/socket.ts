import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { prisma } from './db/prisma';
import { GlobalRole } from '@prisma/client';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    name: string;
    globalRole: GlobalRole;
  };
}

let io: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  // JWT Authenticated Handshake Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const rawCookies = socket.handshake.headers.cookie;
      let token: string | undefined;

      if (rawCookies) {
        const parsed = cookie.parse(rawCookies);
        token = parsed.token;
      }

      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      if (!token) {
        return next(new Error('Authentication error: Missing token cookie.'));
      }

      const payload: any = jwt.verify(token, env.JWT_SECRET);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, globalRole: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User account not found or deactivated.'));
      }

      socket.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
      };

      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token.'));
    }
  });

  // Connection Lifecycle
  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    console.log(`[Socket.IO] Client connected: user=${user.email} (socket=${socket.id})`);

    // Automatically join private user notification room
    socket.join(`user:${user.id}`);

    // Server-Side Authorized Project Room Join Request
    socket.on('join_project', async ({ projectId }: { projectId: string }) => {
      try {
        if (!projectId) {
          socket.emit('error', { message: 'Project ID is required.' });
          return;
        }

        // Global Admin bypass
        if (user.globalRole === GlobalRole.ADMIN) {
          socket.join(`project:${projectId}`);
          socket.emit('joined_project_success', { projectId });
          return;
        }

        // Verify Project Membership
        const member = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId,
              userId: user.id,
            },
          },
        });

        if (!member) {
          socket.emit('error', { message: 'Forbidden. You are not a member of this project.' });
          return;
        }

        socket.join(`project:${projectId}`);
        socket.emit('joined_project_success', { projectId });
      } catch (err) {
        socket.emit('error', { message: 'Failed to join project room.' });
      }
    });

    // Leave Project Room Request
    socket.on('leave_project', ({ projectId }: { projectId: string }) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: socket=${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO has not been initialized.');
  }
  return io;
}

export function broadcastToProject(projectId: string, event: string, payload: any) {
  if (io) {
    io.to(`project:${projectId}`).emit(event, payload);
  }
}

export function sendToUser(userId: string, event: string, payload: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}
