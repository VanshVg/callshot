import { Link } from 'react-router-dom';
import { BRAND } from '../constants/brand';

const features = [
  {
    icon: '🏏',
    title: 'Pick Your Players',
    desc: 'Select 3 players across 10 IPL categories before the season starts.',
  },
  {
    icon: '👥',
    title: 'Compete With Friends',
    desc: 'Create a group, share the invite link, and let the battle begin.',
  },
  {
    icon: '🃏',
    title: 'Play Strategy Cards',
    desc: 'Use Swap and Joker cards mid-season to outsmart your rivals.',
  },
  {
    icon: '🏆',
    title: 'Top the Leaderboard',
    desc: 'Earn points as the season unfolds. The best prediction wins.',
  },
];

export const Home = () => (
  <div className="min-h-screen bg-[#111111] flex flex-col">
    {/* Hero */}
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-20 pb-16">
      <div className="mb-4 inline-flex items-center gap-2 bg-[#FF6800]/10 border border-[#FF6800]/20 text-[#FF6800] text-xs font-medium px-3 py-1 rounded-full">
        IPL 2025 Season
      </div>

      <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-4">
        Call<span className="text-[#FF6800]">Shot</span>
      </h1>
      <p className="text-lg text-gray-400 max-w-md mb-2">{BRAND.tagline}</p>
      <p className="text-gray-500 text-sm max-w-sm mb-10">
        Predict IPL performances, compete with your friends, and prove you know cricket better than anyone.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/register"
          className="bg-[#FF6800] hover:bg-[#e05e00] text-white font-semibold px-6 py-3 rounded-lg transition-colors no-underline text-sm"
        >
          Start Predicting
        </Link>
        <Link
          to="/login"
          className="bg-[#1E1E1E] hover:bg-[#2A2A2A] text-gray-300 font-medium px-6 py-3 rounded-lg border border-[#2F2F2F] transition-colors no-underline text-sm"
        >
          Login
        </Link>
      </div>
    </div>

    {/* Features */}
    <div className="max-w-4xl mx-auto w-full px-4 pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <div key={f.title} className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5">
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="text-white font-semibold mb-1 text-sm">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Footer */}
    <div className="border-t border-[#1E1E1E] py-4 text-center text-gray-600 text-xs">
      {BRAND.name} · Cricket prediction, done right.
    </div>
  </div>
);
