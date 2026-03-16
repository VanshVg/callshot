import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { useGetGroupQuery, useGetMatchesQuery, useGetMyMatchPredictionQuery } from '../store/api';
import type { Match } from '../types/index';

// ── Status config ─────────────────────────────────────────────────────────────

const statusConfig = {
  upcoming: { label: 'Upcoming', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  live: { label: 'Live', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  completed: { label: 'Completed', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
};

// ── Match card (fetches own prediction) ───────────────────────────────────────

const MatchCard = ({ match, groupId }: { match: Match; groupId: string }) => {
  const { data: myPrediction } = useGetMyMatchPredictionQuery(
    { matchId: match._id, groupId },
    { skip: match.status === 'upcoming' && false } // always fetch to show predicted badge
  );

  const { label, color } = statusConfig[match.status];
  const scheduledDate = new Date(match.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const hasPredicted = myPrediction != null;
  const isLocked = match.status !== 'upcoming';
  const hoursUntil = (new Date(match.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
  const windowOpen = match.status === 'upcoming' && hoursUntil <= 24;
  const windowClosed = match.status === 'upcoming' && hoursUntil > 24;
  const canPredict = windowOpen;

  return (
    <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl overflow-hidden hover:border-[#3A3A3A] transition-colors">
      {/* Match header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-gray-600 text-xs font-medium">Match {match.matchNumber}</span>
          {match.venue && <span className="text-gray-700 text-xs hidden sm:inline">· {match.venue}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {hasPredicted && !windowClosed && (
            <span className="text-xs text-[#FF6800] bg-[#FF6800]/10 border border-[#FF6800]/20 px-2 py-0.5 rounded-full font-medium">
              Predicted
            </span>
          )}
          {match.status === 'completed' && myPrediction?.points != null && (
            <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full font-medium">
              +{myPrediction.points} pts
            </span>
          )}
          {windowClosed && (
            <span className="text-xs text-gray-500 bg-[#2A2A2A] border border-[#3A3A3A] px-2 py-0.5 rounded-full font-medium">
              Opens in {Math.ceil(hoursUntil - 24)}h
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <p className="text-white font-bold text-base">{match.teamA}</p>
            {match.status === 'completed' && match.result?.winner === match.teamA && (
              <p className="text-green-400 text-xs mt-0.5 font-medium">Won</p>
            )}
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[#FF6800] font-bold text-sm">VS</span>
            <span className="text-gray-600 text-xs mt-1">{dateStr}</span>
            <span className="text-gray-700 text-xs">{timeStr}</span>
          </div>
          <div className="flex-1 text-center">
            <p className="text-white font-bold text-base">{match.teamB}</p>
            {match.status === 'completed' && match.result?.winner === match.teamB && (
              <p className="text-green-400 text-xs mt-0.5 font-medium">Won</p>
            )}
          </div>
        </div>

        {/* Result summary */}
        {match.status === 'completed' && match.result && (
          <div className="mt-3 pt-3 border-t border-[#2A2A2A] grid grid-cols-2 gap-2">
            {match.result.playerOfMatch?.length && (
              <div>
                <p className="text-gray-600 text-[11px] uppercase tracking-wide">Player of Match</p>
                <p className="text-gray-300 text-xs font-medium mt-0.5">{match.result.playerOfMatch.join(' & ')}</p>
              </div>
            )}
            {match.result.topBatter?.length && (
              <div>
                <p className="text-gray-600 text-[11px] uppercase tracking-wide">Top Batter</p>
                <p className="text-gray-300 text-xs font-medium mt-0.5">{match.result.topBatter.join(' & ')}</p>
              </div>
            )}
            {match.result.powerplayScoreA !== null && (
              <div>
                <p className="text-gray-600 text-[11px] uppercase tracking-wide">{match.teamA} Powerplay</p>
                <p className="text-gray-300 text-xs font-medium mt-0.5">{match.result.powerplayScoreA} runs</p>
              </div>
            )}
            {match.result.powerplayScoreB !== null && (
              <div>
                <p className="text-gray-600 text-[11px] uppercase tracking-wide">{match.teamB} Powerplay</p>
                <p className="text-gray-300 text-xs font-medium mt-0.5">{match.result.powerplayScoreB} runs</p>
              </div>
            )}
          </div>
        )}

        {/* Action */}
        <div className="mt-4 flex gap-2">
          {canPredict && (
            <Link
              to={`/groups/${groupId}/matches/${match._id}/predict`}
              className={`flex-1 text-center text-sm font-medium py-2 rounded-lg border transition-colors no-underline ${
                hasPredicted
                  ? 'border-[#FF6800]/40 bg-[#FF6800]/5 text-[#FF6800] hover:bg-[#FF6800]/10'
                  : 'border-[#FF6800] bg-[#FF6800] text-white hover:bg-[#e05e00]'
              }`}
            >
              {hasPredicted ? 'Edit Predictions' : 'Predict Now'}
            </Link>
          )}
          {windowClosed && (
            <div className="flex-1 text-center text-sm font-medium py-2 rounded-lg border border-[#2A2A2A] text-gray-600 cursor-not-allowed select-none">
              Predictions Not Open Yet
            </div>
          )}
          {isLocked && (
            <Link
              to={`/groups/${groupId}/matches/${match._id}/predict`}
              className="flex-1 text-center text-sm font-medium py-2 rounded-lg border border-[#2F2F2F] text-gray-500 hover:border-[#3A3A3A] transition-colors no-underline"
            >
              View Picks
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

// ── GroupMatches Page ─────────────────────────────────────────────────────────

export const GroupMatches = () => {
  const { groupId } = useParams<{ groupId: string }>();

  const { data: group, isLoading: groupLoading, isError } = useGetGroupQuery(groupId!);

  const tournamentId =
    group?.tournament && typeof group.tournament === 'object'
      ? group.tournament._id
      : (group?.tournament as string | undefined);

  const { data: matches = [], isLoading: matchesLoading } = useGetMatchesQuery(tournamentId!, {
    skip: !tournamentId,
  });

  const loading = groupLoading || matchesLoading;

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse flex flex-col gap-5">
          <div className="h-4 bg-[#2A2A2A] rounded w-20" />
          <div className="h-8 bg-[#2A2A2A] rounded w-1/3" />
          {[1, 2, 3].map((n) => <div key={n} className="h-40 bg-[#1E1E1E] rounded-xl" />)}
        </div>
      </Layout>
    );
  }

  if (isError || !group) {
    return (
      <Layout>
        <div className="text-center py-20 flex flex-col items-center gap-4">
          <p className="text-gray-400">Group not found or you are not a member.</p>
          <Link to="/dashboard" className="text-[#FF6800] text-sm no-underline hover:text-[#ff8533]">
            Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  const tournament = typeof group.tournament === 'object' ? group.tournament : null;
  const upcoming = matches.filter((m) => m.status === 'upcoming');
  const live = matches.filter((m) => m.status === 'live');
  const completed = matches.filter((m) => m.status === 'completed');

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Back nav */}
        <Link
          to={`/groups/${groupId}`}
          className="text-gray-500 hover:text-gray-300 text-sm no-underline flex items-center gap-1.5 w-fit transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {group.name}
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-white text-2xl font-bold">Match Day Predictions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tournament?.name} · {matches.length} match{matches.length !== 1 ? 'es' : ''}
          </p>
        </div>

        {matches.length === 0 && (
          <div className="bg-[#1E1E1E] border border-[#2F2F2F] border-dashed rounded-xl p-12 flex flex-col items-center gap-3">
            <p className="text-gray-300 font-semibold">No matches scheduled yet</p>
            <p className="text-gray-500 text-sm">Check back later — the admin will add matches soon.</p>
          </div>
        )}

        {live.length > 0 && (
          <section>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Live Now</p>
            <div className="flex flex-col gap-4">
              {live.map((m) => <MatchCard key={m._id} match={m} groupId={groupId!} />)}
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Upcoming</p>
            <div className="flex flex-col gap-4">
              {upcoming.map((m) => <MatchCard key={m._id} match={m} groupId={groupId!} />)}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Completed</p>
            <div className="flex flex-col gap-4">
              {completed.map((m) => <MatchCard key={m._id} match={m} groupId={groupId!} />)}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};
