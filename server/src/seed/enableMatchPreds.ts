import 'dotenv/config';
import mongoose from 'mongoose';
import { Group } from '../models/index';

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
  const result = await Group.updateMany({}, { $set: { enableMatchPredictions: true } });
  console.log(`Enabled match predictions on ${result.modifiedCount} group(s)`);
  await mongoose.disconnect();
};

run().catch((err) => { console.error(err); process.exit(1); });
