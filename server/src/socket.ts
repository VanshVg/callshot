import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: Server;

// userId → Set of connected socketIds (handles multiple tabs/devices)
const userSockets = new Map<string, Set<string>>();

export const initSocket = (httpServer: HttpServer, allowedOrigins: string[]) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const isAllowed =
          allowedOrigins.includes(origin) ||
          /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin);
        cb(isAllowed ? null : new Error(`CORS: ${origin} not allowed`), isAllowed);
      },
      credentials: true,
    },
  });

  // Authenticate every socket connection via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      socket.data.userId = payload.id;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
    });
  });

  return io;
};

// Emit an event to one or more users across all their connected sockets
export const notifyUsers = (userIds: string[], event: string, data: unknown) => {
  if (!io) return;
  for (const userId of userIds) {
    const socketIds = userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        io.to(socketId).emit(event, data);
      }
    }
  }
};
