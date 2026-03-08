import 'dotenv/config';
import mongoose from 'mongoose';
import { Tournament, Category } from '../models/index';
import { IPL_TEAMS, IPL_PLAYERS } from '../constants/ipl';

const CATEGORIES = [
  { name: 'Purple Cap', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Most wickets in the season', order: 1 },
  { name: 'Orange Cap', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Most runs in the season', order: 2 },
  { name: 'Most Fours', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Most boundaries (4s) in the season', order: 3 },
  { name: 'Most Sixes', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Most sixes in the season', order: 4 },
  { name: 'Most Catches', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Most catches in the season', order: 5 },
  { name: 'Top 4 Teams', type: 'team_position', selectionCount: 4, scoringType: 'positional', description: 'Predict any 4 teams that qualify for playoffs', order: 6 },
  { name: 'Best Economy Rate', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Best bowling economy rate (min. qualifying overs)', order: 7 },
  { name: 'Player of the Tournament', type: 'single_player', selectionCount: 3, scoringType: 'exact_match', description: 'Predict the Player of the Tournament', order: 8 },
  { name: 'Highest Individual Score', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Highest individual batting score in a single match', order: 9 },
  { name: 'Best Bowling Figures', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Best bowling figures in a single match', order: 10 },
];

const seed = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Clear existing IPL 2025 data
  const existing = await Tournament.findOne({ type: 'ipl', season: '2025' });
  if (existing) {
    await Category.deleteMany({ tournament: existing._id });
    await existing.deleteOne();
    console.log('Cleared existing IPL 2025 data');
  }

  const tournament = await Tournament.create({
    name: 'IPL 2025',
    sport: 'cricket',
    type: 'ipl',
    season: '2025',
    totalMatches: 74,
    startDate: new Date('2025-03-22'),
    endDate: new Date('2025-05-25'),
    status: 'upcoming',
  });

  const categoryDocs = await Category.insertMany(
    CATEGORIES.map((c) => ({ ...c, tournament: tournament._id }))
  );

  console.log(`Created tournament: ${tournament.name}`);
  console.log(`Created ${categoryDocs.length} categories`);
  console.log('\nIPL Teams:', IPL_TEAMS.length);
  console.log('IPL Players:', IPL_PLAYERS.length);
  console.log('\nSeed complete!');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

