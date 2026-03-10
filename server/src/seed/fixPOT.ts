/**
 * Migration: Player of the Tournament — selectionCount=3 (user picks 3), admin enters 1 result.
 * Run: npm run fix:pot
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Category } from '../models/index';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);

  const result = await Category.updateMany(
    { name: 'Player of the Tournament' },
    {
      selectionCount: 3,
      description: 'Pick 3 players — earn 20 pts if the actual Player of the Tournament is among your picks',
    }
  );

  console.log(`Updated ${result.modifiedCount} category document(s).`);
  await mongoose.disconnect();
};

run().catch(console.error);
