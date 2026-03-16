import { Link } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-4">
    <h2 className="text-xl font-bold text-white border-b border-[#2F2F2F] pb-2">{title}</h2>
    {children}
  </section>
);

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[#FF6800]/10 border border-[#FF6800]/20 rounded-lg px-4 py-3 text-sm text-[#FF6800]">
    {children}
  </div>
);

const ExampleBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-4 flex flex-col gap-3">
    <p className="text-xs font-semibold uppercase tracking-wider text-[#FF6800]">{title}</p>
    {children}
  </div>
);

export const Rules = () => (
  <div className="min-h-screen bg-[#141414]">
    <Navbar />

    <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-10">

      {/* Hero */}
      <div className="text-center flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">How to Play <span className="text-[#FF6800]">CallShot</span></h1>
        <p className="text-gray-400 text-base max-w-xl mx-auto">
          Predict season-long cricket stats, use strategy cards, and battle your friends on the leaderboard.
        </p>
      </div>

      {/* Overview */}
      <Section title="Overview">
        <p className="text-gray-400 text-sm leading-relaxed">
          CallShot is a prediction game built around cricket tournaments (starting with IPL).
          Before the season kicks off, each player in your group submits predictions across
          10 categories — things like who will take the most wickets, which teams will qualify
          for the playoffs, and who will be Player of the Tournament.
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">
          Points are awarded at the end of the tournament based on how close your picks were.
          The higher your rank in a category, the more points you earn. Use your 4 strategy
          cards wisely to boost your score or fix a bad pick.
        </p>
      </Section>

      {/* Groups */}
      <Section title="Groups">
        <p className="text-gray-400 text-sm leading-relaxed">
          Everything happens inside a <span className="text-white font-medium">group</span>.
          You create or join a group, pick a tournament, and compete only against the people in that group.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-4">
            <p className="text-white font-semibold text-sm mb-1">Private Group</p>
            <p className="text-gray-500 text-xs">Invite friends via a unique code. Only people with the code can join.</p>
          </div>
          <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-4">
            <p className="text-white font-semibold text-sm mb-1">Public Group</p>
            <p className="text-gray-500 text-xs">Anyone can discover and join. Great for open competitions.</p>
          </div>
        </div>
        <Note>Predictions are locked once the tournament starts. Make sure everyone submits before the deadline.</Note>
      </Section>

      {/* Prediction Categories */}
      <Section title="The 10 Prediction Categories">
        <p className="text-gray-400 text-sm">
          When creating your group, you choose which categories to include. By default all 10 are enabled.
          Each member of the group predicts independently.
        </p>
        <div className="flex flex-col gap-2">
          {[
            { name: 'Purple Cap', desc: 'Pick 3 players most likely to take the most wickets in the season.' },
            { name: 'Orange Cap', desc: 'Pick 3 players most likely to score the most runs in the season.' },
            { name: 'Most Fours', desc: 'Pick 3 players most likely to hit the most boundaries (4s).' },
            { name: 'Most Sixes', desc: 'Pick 3 players most likely to hit the most sixes.' },
            { name: 'Most Catches', desc: 'Pick 3 players most likely to take the most catches.' },
            { name: 'Top 4 Teams', desc: 'Pick any 4 teams you think will qualify for the playoffs.' },
            { name: 'Best Economy Rate', desc: 'Pick 3 bowlers most likely to finish with the best economy rate (min. qualifying overs).' },
            { name: 'Player of the Tournament', desc: 'Pick 3 players — earn 20 pts if the actual POT winner is among your choices.' },
            { name: 'Highest Individual Score', desc: 'Pick 3 batters most likely to record the highest individual innings score.' },
            { name: 'Best Bowling Figures', desc: 'Pick 3 bowlers most likely to record the best bowling figures in a single match.' },
          ].map((cat) => (
            <div key={cat.name} className="flex gap-3 bg-[#1E1E1E] border border-[#2F2F2F] rounded-lg px-4 py-3">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#FF6800] flex-shrink-0 mt-2" />
              <div>
                <p className="text-white text-sm font-medium">{cat.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{cat.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Note>
          Most categories ask for 3 picks. <strong>Top 4 Teams</strong> asks for 4. You cannot submit fewer than required.
        </Note>
      </Section>

      {/* Scoring */}
      <Section title="How Points Are Calculated">
        <p className="text-gray-400 text-sm leading-relaxed">
          At the end of the tournament, admins enter the actual results for each category.
          Points are awarded based on whether your picks appeared in the top results and in what order.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <ExampleBox title="Positional Scoring (most categories)">
            <p className="text-gray-400 text-xs mb-1">
              If the actual result ranks players 1st–5th, your picks earn points based on their position:
            </p>
            <div className="flex flex-col gap-1">
              {[['1st place', '10 pts'], ['2nd place', '8 pts'], ['3rd place', '6 pts'], ['4th place', '4 pts'], ['5th place', '2 pts']].map(([pos, pts]) => (
                <div key={pos} className="flex justify-between text-sm">
                  <span className="text-gray-400">{pos}</span>
                  <span className="text-white font-semibold">{pts}</span>
                </div>
              ))}
            </div>
          </ExampleBox>

          <ExampleBox title="Player of the Tournament (exact match)">
            <p className="text-gray-400 text-xs">
              You pick 3 players. If the actual Player of the Tournament is any one of your 3 picks, you earn:
            </p>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Correct pick</span>
              <span className="text-[#FF6800] font-bold">20 pts</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">No partial credit — it's all or nothing.</p>
          </ExampleBox>
        </div>

        <ExampleBox title="Example — Purple Cap">
          <p className="text-gray-400 text-xs mb-2">
            Final Purple Cap standings: 1. Jasprit Bumrah · 2. Yuzvendra Chahal · 3. T Natarajan · 4. Arshdeep Singh · 5. Mohammed Siraj
          </p>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">You picked: <span className="text-white">Jasprit Bumrah</span> (ranked 1st)</span>
              <span className="text-green-400 font-semibold">+10 pts</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">You picked: <span className="text-white">T Natarajan</span> (ranked 3rd)</span>
              <span className="text-green-400 font-semibold">+6 pts</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">You picked: <span className="text-white">Pat Cummins</span> (not in top 5)</span>
              <span className="text-gray-600 font-semibold">+0 pts</span>
            </div>
            <div className="flex justify-between text-sm border-t border-[#2F2F2F] pt-1 mt-1">
              <span className="text-white font-medium">Total for Purple Cap</span>
              <span className="text-[#FF6800] font-bold">16 pts</span>
            </div>
          </div>
        </ExampleBox>
      </Section>

      {/* Strategy Cards */}
      <Section title="Strategy Cards">
        <p className="text-gray-400 text-sm leading-relaxed">
          Each player gets <span className="text-white font-medium">4 strategy cards</span> per group per tournament —
          a mix of Swap and Joker cards that you can use in <span className="text-white font-medium">any combination</span> (4 swaps, 4 jokers, or anything in between).
          Cards must be used before the tournament reaches its halfway point.
          Any unused card at the end is worth <span className="text-white font-medium">4 pts each</span>.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-[#1E1E1E] border border-[#FF6800]/30 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔄</span>
              <p className="text-white font-semibold text-sm">Swap Card</p>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Replace one of your picks in any category with a different player or team.
              Useful if you regret a pick early in the season.
            </p>
            <p className="text-gray-600 text-xs">No points bonus — just a free pick change.</p>
          </div>

          <div className="bg-[#1E1E1E] border border-yellow-500/30 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🃏</span>
              <p className="text-white font-semibold text-sm">Joker Card</p>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Bet on a specific player finishing in an exact position in a category.
              If you're right, earn a <span className="text-yellow-400 font-semibold">+30 pts bonus</span> on top of the normal positional points.
            </p>
            <p className="text-gray-600 text-xs">If wrong, you earn normal positional points with no penalty.</p>
          </div>
        </div>

        <ExampleBox title="Example — Joker Card">
          <p className="text-gray-400 text-xs">
            You use a Joker on Orange Cap, betting that <strong className="text-white">Rohit Sharma</strong> finishes <strong className="text-white">1st</strong>.
          </p>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">If Rohit finishes 1st</span>
              <span className="text-yellow-400 font-semibold">10 + 30 = 40 pts</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">If Rohit finishes 2nd</span>
              <span className="text-green-400 font-semibold">8 pts (no bonus)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">If Rohit doesn't finish in top 5</span>
              <span className="text-gray-600 font-semibold">0 pts</span>
            </div>
          </div>
        </ExampleBox>

        <Note>
          Unused cards are worth 4 pts each at the end. If you hold onto all 4 cards, that's 16 bonus points — sometimes the best strategy is patience.
        </Note>
      </Section>

      {/* Match Predictions */}
      <Section title="Match Day Predictions (Optional)">
        <p className="text-gray-400 text-sm leading-relaxed">
          Group admins can enable <span className="text-white font-medium">match day predictions</span>.
          Before each match starts, members predict: the winner, top batter, top bowler, Player of the Match,
          and powerplay scores for both teams.
        </p>
        <p className="text-gray-400 text-sm">
          Match predictions are separate from season predictions and don't affect your strategy cards.
          Points from match predictions are tracked separately on the leaderboard.
        </p>
      </Section>

      {/* Leaderboard */}
      <Section title="Leaderboard">
        <p className="text-gray-400 text-sm leading-relaxed">
          The leaderboard shows everyone's total points in your group, broken down by:
        </p>
        <div className="flex flex-col gap-2">
          {[
            ['Tournament Points', 'Points from all season-long prediction categories + unused strategy cards.'],
            ['Match Points', 'Points from match day predictions (if enabled in your group).'],
            ['Total Points', 'Sum of tournament + match points — this determines your final rank.'],
          ].map(([label, desc]) => (
            <div key={label} className="flex gap-3 bg-[#1E1E1E] border border-[#2F2F2F] rounded-lg px-4 py-3 items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6800] flex-shrink-0 mt-2" />
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Quick summary */}
      <Section title="Points at a Glance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2F2F2F]">
                <th className="text-left text-gray-500 font-medium py-2 pr-4">Event</th>
                <th className="text-right text-gray-500 font-medium py-2">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E1E]">
              {[
                ['Your pick is ranked 1st', '+10'],
                ['Your pick is ranked 2nd', '+8'],
                ['Your pick is ranked 3rd', '+6'],
                ['Your pick is ranked 4th', '+4'],
                ['Your pick is ranked 5th', '+2'],
                ['Player of Tournament — correct pick', '+20'],
                ['Joker bonus (exact position match)', '+30'],
                ['Unused strategy card (each)', '+4'],
              ].map(([event, pts]) => (
                <tr key={event} className="border-b border-[#2F2F2F]">
                  <td className="text-gray-400 py-2.5 pr-4">{event}</td>
                  <td className="text-right text-[#FF6800] font-bold py-2.5">{pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* CTA */}
      <div className="text-center flex flex-col items-center gap-4 py-4">
        <p className="text-gray-400 text-sm">Ready to make your calls?</p>
        <Link
          to="/dashboard"
          className="bg-[#FF6800] hover:bg-[#e05e00] text-white font-semibold px-8 py-3 rounded-xl transition-colors no-underline text-sm"
        >
          Go to Dashboard
        </Link>
      </div>

    </div>
  </div>
);
