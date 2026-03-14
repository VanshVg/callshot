import 'dotenv/config';
import mongoose from 'mongoose';
import { Tournament, Category, Match } from '../models/index';
import { IPL_TEAMS, IPL_PLAYERS, IPL_SQUADS } from '../constants/ipl';

const CATEGORIES = [
  { name: 'Purple Cap', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Most wickets in the season', order: 1 },
  { name: 'Orange Cap', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Most runs in the season', order: 2 },
  { name: 'Most Fours', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Most boundaries (4s) in the season', order: 3 },
  { name: 'Most Sixes', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Most sixes in the season', order: 4 },
  { name: 'Most Catches', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Most catches in the season', order: 5 },
  { name: 'Top 4 Teams', type: 'team_position', selectionCount: 4, scoringType: 'positional', description: 'Predict any 4 teams that qualify for playoffs', order: 6 },
  { name: 'Best Economy Rate', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Best bowling economy rate (min. qualifying overs)', order: 7 },
  { name: 'Player of the Tournament', type: 'single_player', selectionCount: 3, scoringType: 'exact_match', description: 'Pick 3 players — earn 20 pts if the actual Player of the Tournament is among your picks', order: 8 },
  { name: 'Highest Individual Score', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Highest individual batting score in a single match', order: 9 },
  { name: 'Best Bowling Figures', type: 'player_stat', selectionCount: 3, scoringType: 'positional', description: 'Best bowling figures in a single match', order: 10 },
];

// ── Demo match helpers ─────────────────────────────────────────────────────────

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);

const DEMO_MATCHES = [
  // ── Completed matches (with full results) ──────────────────────────────────
  {
    matchNumber: 1,
    teamA: 'Mumbai Indians',
    teamB: 'Chennai Super Kings',
    venue: 'Wankhede Stadium, Mumbai',
    scheduledAt: hoursAgo(72),
    status: 'completed' as const,
    result: {
      winner: 'Mumbai Indians',
      topBatter: 'Rohit Sharma',
      topBowler: 'Jasprit Bumrah',
      playerOfMatch: 'Rohit Sharma',
      powerplayScoreA: 62,
      powerplayScoreB: 48,
    },
  },
  {
    matchNumber: 2,
    teamA: 'Royal Challengers Bengaluru',
    teamB: 'Kolkata Knight Riders',
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    scheduledAt: hoursAgo(48),
    status: 'completed' as const,
    result: {
      winner: 'Kolkata Knight Riders',
      topBatter: 'Virat Kohli',
      topBowler: 'Varun Chakaravarthy',
      playerOfMatch: 'Varun Chakaravarthy',
      powerplayScoreA: 54,
      powerplayScoreB: 71,
    },
  },
  {
    matchNumber: 3,
    teamA: 'Rajasthan Royals',
    teamB: 'Delhi Capitals',
    venue: 'Sawai Mansingh Stadium, Jaipur',
    scheduledAt: hoursAgo(24),
    status: 'completed' as const,
    result: {
      winner: 'Rajasthan Royals',
      topBatter: 'Jos Buttler',
      topBowler: 'Yuzvendra Chahal',
      playerOfMatch: 'Jos Buttler',
      powerplayScoreA: 68,
      powerplayScoreB: 52,
    },
  },

  // ── Live match (started 1 hour ago) ────────────────────────────────────────
  {
    matchNumber: 4,
    teamA: 'Sunrisers Hyderabad',
    teamB: 'Punjab Kings',
    venue: 'Rajiv Gandhi International Stadium, Hyderabad',
    scheduledAt: hoursAgo(1),
    status: 'live' as const,
    result: {
      winner: null,
      topBatter: null,
      topBowler: null,
      playerOfMatch: null,
      powerplayScoreA: null,
      powerplayScoreB: null,
    },
  },

  // ── Upcoming within 24h (prediction window open) ───────────────────────────
  {
    matchNumber: 5,
    teamA: 'Gujarat Titans',
    teamB: 'Lucknow Super Giants',
    venue: 'Narendra Modi Stadium, Ahmedabad',
    scheduledAt: hoursFromNow(5),
    status: 'upcoming' as const,
    result: {
      winner: null,
      topBatter: null,
      topBowler: null,
      playerOfMatch: null,
      powerplayScoreA: null,
      powerplayScoreB: null,
    },
  },
  {
    matchNumber: 6,
    teamA: 'Chennai Super Kings',
    teamB: 'Royal Challengers Bengaluru',
    venue: 'MA Chidambaram Stadium, Chennai',
    scheduledAt: hoursFromNow(18),
    status: 'upcoming' as const,
    result: {
      winner: null,
      topBatter: null,
      topBowler: null,
      playerOfMatch: null,
      powerplayScoreA: null,
      powerplayScoreB: null,
    },
  },

  // ── Upcoming outside 24h (prediction window closed) ────────────────────────
  {
    matchNumber: 7,
    teamA: 'Mumbai Indians',
    teamB: 'Kolkata Knight Riders',
    venue: 'Wankhede Stadium, Mumbai',
    scheduledAt: hoursFromNow(36),
    status: 'upcoming' as const,
    result: {
      winner: null,
      topBatter: null,
      topBowler: null,
      playerOfMatch: null,
      powerplayScoreA: null,
      powerplayScoreB: null,
    },
  },
  {
    matchNumber: 8,
    teamA: 'Delhi Capitals',
    teamB: 'Sunrisers Hyderabad',
    venue: 'Arun Jaitley Stadium, Delhi',
    scheduledAt: hoursFromNow(60),
    status: 'upcoming' as const,
    result: {
      winner: null,
      topBatter: null,
      topBowler: null,
      playerOfMatch: null,
      powerplayScoreA: null,
      powerplayScoreB: null,
    },
  },
];

const seed = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Clear existing IPL 2025 data
  const existing = await Tournament.findOne({ type: 'ipl', season: '2025' });
  if (existing) {
    await Match.deleteMany({ tournament: existing._id });
    await existing.deleteOne();
    console.log('Cleared existing IPL 2025 tournament + matches');
  }

  // (Re)seed cricket categories — shared across all cricket tournaments
  await Category.deleteMany({ sport: 'cricket' });
  const categoryDocs = await Category.insertMany(
    CATEGORIES.map((c) => ({ ...c, sport: 'cricket' }))
  );
  console.log(`Created ${categoryDocs.length} cricket categories`);

  const tournament = await Tournament.create({
    name: 'IPL 2025',
    sport: 'cricket',
    type: 'ipl',
    season: '2025',
    totalMatches: 74,
    startDate: hoursAgo(72),
    endDate: new Date('2025-05-25'),
    status: 'live',
    teams: IPL_TEAMS,
    squads: new Map(Object.entries(IPL_SQUADS)),
  });

  const matchDocs = await Match.insertMany(
    DEMO_MATCHES.map((m) => ({ ...m, tournament: tournament._id }))
  );

  console.log(`Created tournament: ${tournament.name} (status: ${tournament.status})`);
  console.log(`Created ${matchDocs.length} demo matches:`);
  matchDocs.forEach((m: any) => {
    console.log(`  Match ${m.matchNumber}: ${m.teamA} vs ${m.teamB} — ${m.status}`);
  });
  console.log('\nIPL Teams:', IPL_TEAMS.length);
  console.log('IPL Players:', IPL_PLAYERS.length);
  console.log('\nSeed complete!');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
