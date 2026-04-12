// backend/src/config/socket.js
// Socket.IO singleton with JWT auth and per-project rooms.

const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt.util');
const User = require('../models/User.model');
const E = require('../ws/events');
const config = require('./env');

let io = null;

function initSocket(httpServer) {
  const configuredOrigins = (config.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const isDevLocalhost = (origin) =>
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);

  io = new Server(httpServer, {
    cors: {
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (configuredOrigins.includes(origin)) return cb(null, true);
        if (config.NODE_ENV !== 'production' && isDevLocalhost(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true
    }
  });

  // JWT auth — token passed via handshake.auth.token or Authorization header
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');

      if (!token) return next(new Error('unauthorized: token manquant'));

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) return next(new Error('unauthorized: user invalide'));

      socket.user = { id: String(user._id), role: user.role, email: user.email };
      next();
    } catch (err) {
      next(new Error('unauthorized: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 WS connected: ${socket.user.email} (${socket.id})`);

    socket.on(E.JOIN, ({ projectId } = {}) => {
      if (!projectId) return;
      socket.join(`project:${projectId}`);
      socket.emit(E.NOTIFICATION, { level: 'info', message: `Joined project ${projectId}` });
    });

    socket.on(E.LEAVE, ({ projectId } = {}) => {
      if (!projectId) return;
      socket.leave(`project:${projectId}`);
    });

    socket.on(E.PING, () => socket.emit('pong', { t: Date.now() }));

    socket.on('disconnect', (reason) => {
      console.log(`🔌 WS disconnected: ${socket.user.email} (${reason})`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized — call initSocket(server) first');
  return io;
}

// Convenience emitters used by pipeline services
function emitToProject(projectId, event, payload) {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, { projectId, ...payload, at: Date.now() });
}

function broadcast(event, payload) {
  if (!io) return;
  io.emit(event, { ...payload, at: Date.now() });
}

module.exports = { initSocket, getIO, emitToProject, broadcast, events: E };
