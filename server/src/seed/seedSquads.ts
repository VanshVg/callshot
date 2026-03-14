/**
 * One-time migration: populate teams + squads on existing IPL 2025 tournament.
 * Run: npm run seed:squads
 *
 * Safe to re-run — overwrites teams/squads with the latest IPL constants.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Tournament } from '../models/index';
import { IPL_TEAMS, IPL_SQUADS } from '../constants/ipl';

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const result = await Tournament.updateMany(
    { type: 'ipl' },
    {
      $set: {
        teams: IPL_TEAMS,
        squads: new Map(Object.entries(IPL_SQUADS)),
      },
    }
  );

  console.log(`Updated ${result.modifiedCount} IPL tournament(s) with teams and squads`);
  await mongoose.disconnect();
};

run().catch((err) => { console.error(err); process.exit(1); });
