import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { connectDB } from './config/db';
import { BRAND } from './constants/brand';
import { initSocket } from './socket';
import { Match } from './models/index';

import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import tournamentRoutes from './routes/tournaments';
import predictionRoutes from './routes/predictions';
import cardRoutes from './routes/cards';
import leaderboardRoutes from './routes/leaderboard';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import matchRoutes from './routes/matches';

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const isAllowed =
      allowedOrigins.includes(origin) ||
      /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin);
    cb(isAllowed ? null : new Error(`CORS: ${origin} not allowed`), isAllowed);
  },
  credentials: true,
}));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ app: BRAND.name, tagline: BRAND.tagline, status: 'running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/matches', matchRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
initSocket(httpServer, allowedOrigins);

connectDB()
  .then(() => {
    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`${BRAND.name} server running on http://0.0.0.0:${PORT}`);

      // Auto-update match statuses every minute: upcoming → live
      setInterval(async () => {
        try {
          const updated = await Match.updateMany(
            { status: 'upcoming', scheduledAt: { $lte: new Date() } },
            { $set: { status: 'live' } }
          );
          if (updated.modifiedCount > 0)
            console.log(`[scheduler] ${updated.modifiedCount} match(es) set to live`);
        } catch (err) {
          console.error('[scheduler] Match status update error:', err);
        }
      }, 60 * 1000);
    });
  })
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });

export default app;
