import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Button } from '../components/common/Button';
import { CelebrationOverlay } from '../components/common/CelebrationOverlay';
import { useAuth } from '../context/AuthContext';
import {
  useGetGroupQuery,
  useGetMatchesQuery,
  useGetTournamentOptionsQuery,
  useGetMyMatchPredictionQuery,
  useSubmitMatchPredictionMutation,
  useGetMatchPredictionsQuery,
} from '../store/api';
import type { MatchPicks } from '../types/index';

// ── Player search input ────────────────────────────────────────────────────────

const PlayerPicker = ({
  label, options, value, onChange, disabled,
}: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; disabled: boolean;
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter(
    (o) => o.toLowerCase().includes(search.toLowerCase()) && o !== value,
  );

  const select = (name: string) => { onChange(name); setSearch(''); setOpen(false); };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      {value ? (
        <div className="flex items-center gap-3 bg-[#FF6800]/5 border border-[#FF6800]/25 rounded-lg px-3 py-2.5">
          <span className="text-gray-200 text-sm flex-1">{value}</span>
          {!disabled && (
            <button onClick={() => onChange('')} className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : disabled ? (
        <div className="bg-[#111111] border border-[#2F2F2F] rounded-lg px-3 py-2.5 text-gray-600 text-sm italic">
          Not predicted
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-2 bg-[#111111] border border-[#2F2F2F] focus-within:border-[#FF6800] rounded-lg px-3 py-2.5 transition-colors">
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Search players…"
              className="bg-transparent text-white text-sm outline-none flex-1 placeholder-gray-600"
            />
            {search && (
              <button onMouseDown={(e) => { e.preventDefault(); setSearch(''); }} className="text-gray-600 hover:text-gray-400 cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {open && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg overflow-hidden z-20 shadow-2xl max-h-44 overflow-y-auto">
              {filtered.map((name) => (
                <button
                  key={name}
                  onMouseDown={() => select(name)}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-[#FF6800]/10 hover:text-white transition-colors cursor-pointer border-b border-[#2A2A2A] last:border-0"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          {open && search && filtered.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg p-3 z-20 shadow-2xl">
              <p className="text-gray-500 text-sm text-center">No results for "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Winner celebration overlay ─────────────────────────────────────────────────

const WinnerCelebration = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3800);
    return () => clearTimeout(t);
  }, [onDone]);

  // Generate confetti pieces
  const pieces = Array.from({ length: 32 }, (_, i) => i);
  const colors = ['#FF6800', '#FFD700', '#FF4500', '#FFF', '#FFB347', '#FFEC8B'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden">
        {pieces.map((i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 0.8;
          const size = 6 + Math.floor(Math.random() * 8);
          const color = colors[i % colors.length];
          const rotate = Math.random() * 360;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: '-10px',
                width: size,
                height: size * (Math.random() > 0.5 ? 1 : 2.5),
                background: color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                transform: `rotate(${rotate}deg)`,
                animation: `confettiFall ${1.8 + Math.random() * 1.4}s ${delay}s ease-in forwards`,
                opacity: 0.9,
              }}
            />
          );
        })}
      </div>

      {/* Trophy card */}
      <div
        className="relative bg-[#1A1A1A] border-2 border-yellow-400/60 rounded-2xl px-8 py-7 flex flex-col items-center gap-3 shadow-2xl"
        style={{ animation: 'celebrationPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      >
        <div className="text-5xl" style={{ animation: 'trophyBounce 0.6s 0.3s ease-in-out infinite alternate' }}>🏆</div>
        <p className="text-yellow-400 font-bold text-xl tracking-tight">Top Scorer!</p>
        <p className="text-gray-400 text-sm text-center">You scored the highest points<br />in this match among all members.</p>
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes celebrationPop {
          0%   { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes trophyBounce {
          0%   { transform: translateY(0) rotate(-5deg); }
          100% { transform: translateY(-6px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
};

// ── MatchPredict Page ──────────────────────────────────────────────────────────

const emptyPicks: MatchPicks = {
  winner: '', topBatter: '', topBowler: '', playerOfMatch: '',
  powerplayScoreA: 0, powerplayScoreB: 0,
};

export const MatchPredict = () => {
  const { groupId, matchId } = useParams<{ groupId: string; matchId: string }>();
  const { user: currentUser } = useAuth();

  const [picks, setPicks] = useState<MatchPicks>(emptyPicks);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [showSubmitCelebration, setShowSubmitCelebration] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const { data: group, isLoading: groupLoading } = useGetGroupQuery(groupId!);

  const tournamentId =
    group?.tournament && typeof group.tournament === 'object'
      ? group.tournament._id
      : (group?.tournament as string | undefined);

  const { data: matches = [], isLoading: matchesLoading } = useGetMatchesQuery(tournamentId!, {
    skip: !tournamentId,
  });

  const match = matches.find((m) => m._id === matchId);

  const { data: options } = useGetTournamentOptionsQuery(tournamentId!, { skip: !tournamentId });

  const { data: existingPrediction, isLoading: predLoading } = useGetMyMatchPredictionQuery(
    { matchId: matchId!, groupId: groupId! },
    { skip: !matchId || !groupId },
  );

  const [submitMatchPrediction, { isLoading: submitting }] = useSubmitMatchPredictionMutation();

  const isLocked = match ? match.status !== 'upcoming' : false;
  const hasExisting = existingPrediction != null;
  const showMemberPicks = match ? match.status !== 'upcoming' : false;

  const { data: memberPredictions = [] } = useGetMatchPredictionsQuery(
    { matchId: matchId!, groupId: groupId! },
    { skip: !matchId || !groupId || !showMemberPicks },
  );

  // Pre-populate from existing prediction
  useEffect(() => {
    if (existingPrediction) setPicks(existingPrediction.picks);
  }, [existingPrediction]);

  // Celebration: show once if current user is top scorer and match is completed
  useEffect(() => {
    if (
      match?.status !== 'completed' ||
      !existingPrediction ||
      existingPrediction.points == null ||
      memberPredictions.length === 0
    ) return;

    const storageKey = `match_winner_seen_${matchId}_${currentUser?.id}`;
    if (sessionStorage.getItem(storageKey)) return;

    const maxPts = Math.max(...memberPredictions.map((p) => p.points ?? 0));
    if (existingPrediction.points > 0 && existingPrediction.points === maxPts) {
      setShowCelebration(true);
      sessionStorage.setItem(storageKey, '1');
    }
  }, [match?.status, existingPrediction, memberPredictions, matchId, currentUser?.id]);

  // Only show players from the two teams' squads for match predictions
  const squads = options?.squads ?? {};
  const squadPlayers = match
    ? Array.from(new Set([...(squads[match.teamA] ?? []), ...(squads[match.teamB] ?? [])]))
    : (options?.players ?? []);
  const teams = match ? [match.teamA, match.teamB] : [];

  const allFilled =
    picks.winner !== '' &&
    picks.topBatter !== '' &&
    picks.topBowler !== '' &&
    picks.playerOfMatch !== '' &&
    picks.powerplayScoreA > 0 &&
    picks.powerplayScoreB > 0;

  const handleSubmit = async () => {
    if (!allFilled) return;
    setError('');
    try {
      await submitMatchPrediction({ matchId: matchId!, groupId: groupId!, picks }).unwrap();
      setSubmitted(true);
      setShowSubmitCelebration(true);
    } catch (err: unknown) {
      setError((err as { data?: { message?: string } })?.data?.message || 'Failed to submit predictions');
    }
  };

  // Derive top scorer id for member highlight
  const maxMemberPts = memberPredictions.length > 0
    ? Math.max(...memberPredictions.map((p) => p.points ?? 0))
    : -1;
  const hasTopScorer = maxMemberPts > 0;

  // Points breakdown rows (reused in two places)
  const breakdownRows = match && existingPrediction && match.result ? [
    { label: 'Match Winner', pts: picks.winner === match.result.winner ? 1 : 0, max: 1 },
    { label: 'Highest Run Scorer', pts: (match.result.topBatter?.includes(picks.topBatter) ? 3 : 0), max: 3 },
    { label: 'Highest Wicket Taker', pts: (match.result.topBowler?.includes(picks.topBowler) ? 3 : 0), max: 3 },
    { label: 'Player of the Match', pts: (match.result.playerOfMatch?.includes(picks.playerOfMatch) ? 5 : 0), max: 5 },
    { label: `${match.teamA} Powerplay`, pts: Math.max(0, 5 - Math.abs(picks.powerplayScoreA - (match.result.powerplayScoreA ?? 0))), max: 5 },
    { label: `${match.teamB} Powerplay`, pts: Math.max(0, 5 - Math.abs(picks.powerplayScoreB - (match.result.powerplayScoreB ?? 0))), max: 5 },
  ] : [];
  const totalPts = breakdownRows.reduce((sum, r) => sum + r.pts, 0);

  const loading = groupLoading || matchesLoading || predLoading;

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse flex flex-col gap-5">
          <div className="h-4 bg-[#2A2A2A] rounded w-20" />
          <div className="h-8 bg-[#2A2A2A] rounded w-1/3" />
          {[1, 2, 3, 4].map((n) => <div key={n} className="h-20 bg-[#1E1E1E] rounded-xl" />)}
        </div>
      </Layout>
    );
  }

  if (!group || !match) {
    return (
      <Layout>
        <div className="text-center py-20 flex flex-col items-center gap-4">
          <p className="text-gray-400">Match not found.</p>
          <Link to={`/groups/${groupId}/matches`} className="text-[#FF6800] text-sm no-underline hover:text-[#ff8533]">
            Back to Matches
          </Link>
        </div>
      </Layout>
    );
  }

  const scheduledDate = new Date(match.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const showBreakdown = match.status === 'completed' && existingPrediction && match.result;

  return (
    <Layout>
      {showSubmitCelebration && (
        <CelebrationOverlay
          headline="Shot Called!"
          subline={hasExisting ? 'Picks updated. Good luck out there!' : 'Your picks are in. Time to watch them pay off!'}
          onDone={() => setShowSubmitCelebration(false)}
        />
      )}
      {showCelebration && <WinnerCelebration onDone={() => setShowCelebration(false)} />}

      <div className="flex flex-col gap-6 pb-28">
        {/* Back nav */}
        <Link
          to={`/groups/${groupId}/matches`}
          className="text-gray-500 hover:text-gray-300 text-sm no-underline flex items-center gap-1.5 w-fit transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Match {match.matchNumber}
        </Link>

        {/* Match header */}
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-500 text-xs">Match {match.matchNumber}{match.venue ? ` · ${match.venue}` : ''}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
              match.status === 'live' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
              match.status === 'completed' ? 'text-gray-400 bg-gray-400/10 border-gray-400/20' :
              'text-blue-400 bg-blue-400/10 border-blue-400/20'
            }`}>
              {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex-1 text-center">
              <p className="text-white font-bold text-lg">{match.teamA}</p>
              {match.status === 'completed' && match.result?.winner === match.teamA && (
                <p className="text-green-400 text-xs font-semibold mt-0.5">Won ✓</p>
              )}
            </div>
            <div className="text-center px-4">
              <p className="text-[#FF6800] font-bold text-sm">VS</p>
              <p className="text-gray-600 text-xs mt-1">{dateStr}</p>
              <p className="text-gray-700 text-xs">{timeStr}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-white font-bold text-lg">{match.teamB}</p>
              {match.status === 'completed' && match.result?.winner === match.teamB && (
                <p className="text-green-400 text-xs font-semibold mt-0.5">Won ✓</p>
              )}
            </div>
          </div>
          {match.status === 'completed' && existingPrediction?.points != null && (
            <div className="mt-4 pt-4 border-t border-[#2A2A2A] text-center">
              <p className="text-gray-500 text-xs">Your points this match</p>
              <p className="text-[#FF6800] text-3xl font-bold mt-1">{existingPrediction.points}</p>
              <p className="text-gray-600 text-xs">/ 22 max</p>
            </div>
          )}
        </div>

        {/* Status banners */}
        {submitted && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {hasExisting ? 'Predictions updated!' : 'Predictions submitted! Good luck.'}
          </div>
        )}

        {!submitted && hasExisting && !isLocked && (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl px-4 py-3 text-sm">
            You've already predicted this match. Edit and resubmit until it starts.
          </div>
        )}

        {isLocked && (
          <div className="bg-[#FF6800]/10 border border-[#FF6800]/20 text-[#FF6800] rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {match.status === 'live' ? 'Match is live — picks are locked.' : 'Match is over — picks are locked.'}
          </div>
        )}

        {/* ── Pick 1: Match Winner ── */}
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Match Winner</h3>
              <p className="text-gray-600 text-xs mt-0.5">1 point if correct</p>
            </div>
            {match.status === 'completed' && match.result?.winner && (
              <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full font-medium">
                Won: {match.result.winner}
              </span>
            )}
            {match.status !== 'completed' && picks.winner && (
              <span className="text-xs bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-0.5 rounded-full">Selected</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {teams.map((team) => {
              const isWinner = match.status === 'completed' && match.result?.winner === team;
              const isPick = picks.winner === team;
              const isCorrect = isWinner && isPick;
              const isWrong = isPick && match.status === 'completed' && !isWinner;

              return (
                <button
                  key={team}
                  onClick={() => !isLocked && setPicks((p) => ({ ...p, winner: team }))}
                  disabled={isLocked}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium transition-colors relative ${
                    isCorrect
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : isWinner
                      ? 'border-green-500/50 bg-green-500/5 text-green-300'
                      : isWrong
                      ? 'border-red-500/40 bg-red-500/5 text-red-400'
                      : isPick
                      ? 'border-[#FF6800] bg-[#FF6800]/10 text-[#FF6800]'
                      : isLocked
                      ? 'border-[#2A2A2A] text-gray-600 cursor-not-allowed'
                      : 'border-[#2F2F2F] text-gray-300 hover:border-[#3A3A3A] cursor-pointer'
                  }`}
                >
                  {team}
                  {isWinner && <span className="absolute top-1 right-1.5 text-[10px] text-green-400">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Pick 2: Top Run Scorer ── */}
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Highest Run Scorer</h3>
              <p className="text-gray-600 text-xs mt-0.5">3 points if correct</p>
            </div>
            {picks.topBatter && (
              <span className="text-xs bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-0.5 rounded-full">Selected</span>
            )}
          </div>
          <PlayerPicker
            label=""
            options={squadPlayers}
            value={picks.topBatter}
            onChange={(v) => setPicks((p) => ({ ...p, topBatter: v }))}
            disabled={isLocked}
          />
          {match.status === 'completed' && match.result?.topBatter?.length && (
            <p className="text-xs text-gray-500">
              Actual: <span className={match.result.topBatter.includes(picks.topBatter) ? 'text-green-400' : 'text-gray-400'}>
                {match.result.topBatter.join(' & ')}
              </span>
            </p>
          )}
        </div>

        {/* ── Pick 3: Top Wicket Taker ── */}
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Highest Wicket Taker</h3>
              <p className="text-gray-600 text-xs mt-0.5">3 points if correct</p>
            </div>
            {picks.topBowler && (
              <span className="text-xs bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-0.5 rounded-full">Selected</span>
            )}
          </div>
          <PlayerPicker
            label=""
            options={squadPlayers}
            value={picks.topBowler}
            onChange={(v) => setPicks((p) => ({ ...p, topBowler: v }))}
            disabled={isLocked}
          />
          {match.status === 'completed' && match.result?.topBowler?.length && (
            <p className="text-xs text-gray-500">
              Actual: <span className={match.result.topBowler.includes(picks.topBowler) ? 'text-green-400' : 'text-gray-400'}>
                {match.result.topBowler.join(' & ')}
              </span>
            </p>
          )}
        </div>

        {/* ── Pick 4: Player of the Match ── */}
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Player of the Match</h3>
              <p className="text-gray-600 text-xs mt-0.5">5 points if correct</p>
            </div>
            {picks.playerOfMatch && (
              <span className="text-xs bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-0.5 rounded-full">Selected</span>
            )}
          </div>
          <PlayerPicker
            label=""
            options={squadPlayers}
            value={picks.playerOfMatch}
            onChange={(v) => setPicks((p) => ({ ...p, playerOfMatch: v }))}
            disabled={isLocked}
          />
          {match.status === 'completed' && match.result?.playerOfMatch?.length && (
            <p className="text-xs text-gray-500">
              Actual: <span className={match.result.playerOfMatch.includes(picks.playerOfMatch) ? 'text-green-400' : 'text-gray-400'}>
                {match.result.playerOfMatch.join(' & ')}
              </span>
            </p>
          )}
        </div>

        {/* ── Pick 5 & 6: Powerplay Scores ── */}
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Powerplay Scores (First 6 Overs)</h3>
            <p className="text-gray-600 text-xs mt-0.5">Up to 5 points each — exact = 5 pts, ±1 = 4 pts, ±2 = 3 pts…</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 text-xs font-medium">{match.teamA}</label>
              <input
                type="number"
                min={0}
                max={120}
                value={picks.powerplayScoreA || ''}
                onChange={(e) => !isLocked && setPicks((p) => ({ ...p, powerplayScoreA: Number(e.target.value) }))}
                disabled={isLocked}
                placeholder="e.g. 55"
                className={`bg-[#111111] border rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-colors text-center ${
                  isLocked ? 'border-[#2A2A2A] text-gray-500' : 'border-[#2F2F2F] focus:border-[#FF6800]'
                }`}
              />
              {match.status === 'completed' && match.result?.powerplayScoreA !== null && (
                <p className="text-xs text-gray-500 text-center">
                  Actual: <span className={
                    Math.abs(picks.powerplayScoreA - (match.result?.powerplayScoreA ?? 0)) === 0
                      ? 'text-green-400'
                      : Math.abs(picks.powerplayScoreA - (match.result?.powerplayScoreA ?? 0)) <= 2
                      ? 'text-yellow-400'
                      : 'text-gray-400'
                  }>{match.result?.powerplayScoreA}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 text-xs font-medium">{match.teamB}</label>
              <input
                type="number"
                min={0}
                max={120}
                value={picks.powerplayScoreB || ''}
                onChange={(e) => !isLocked && setPicks((p) => ({ ...p, powerplayScoreB: Number(e.target.value) }))}
                disabled={isLocked}
                placeholder="e.g. 50"
                className={`bg-[#111111] border rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-colors text-center ${
                  isLocked ? 'border-[#2A2A2A] text-gray-500' : 'border-[#2F2F2F] focus:border-[#FF6800]'
                }`}
              />
              {match.status === 'completed' && match.result?.powerplayScoreB !== null && (
                <p className="text-xs text-gray-500 text-center">
                  Actual: <span className={
                    Math.abs(picks.powerplayScoreB - (match.result?.powerplayScoreB ?? 0)) === 0
                      ? 'text-green-400'
                      : Math.abs(picks.powerplayScoreB - (match.result?.powerplayScoreB ?? 0)) <= 2
                      ? 'text-yellow-400'
                      : 'text-gray-400'
                  }>{match.result?.powerplayScoreB}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Points breakdown for completed matches */}
        {showBreakdown && (
          <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5">
            <p className="text-gray-400 text-sm font-medium mb-3">Points Breakdown</p>
            <div className="flex flex-col gap-2">
              {breakdownRows.map(({ label, pts, max }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-[#2A2A2A]">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className={`text-sm font-semibold ${pts > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                    {pts}/{max}
                  </span>
                </div>
              ))}
              {/* Total row */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-white text-sm font-bold">Total</span>
                <span className={`text-sm font-bold ${totalPts > 0 ? 'text-[#FF6800]' : 'text-gray-500'}`}>
                  {totalPts} / 22
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* ── Member predictions (visible after match starts) ── */}
        {showMemberPicks && memberPredictions.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
              Members' Picks ({memberPredictions.length})
            </p>
            {memberPredictions.map((pred) => {
              const user = pred.user as { _id?: string; name?: string; username?: string } | undefined;
              const name = user?.name || user?.username || 'Member';
              const pts = pred.points ?? null;
              const isTopScorer = hasTopScorer && pts === maxMemberPts;

              return (
                <div
                  key={pred._id}
                  className={`rounded-xl p-4 border transition-colors ${
                    isTopScorer
                      ? 'bg-yellow-400/5 border-yellow-400/40'
                      : 'bg-[#1E1E1E] border-[#2F2F2F]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isTopScorer && <span className="text-base">🏆</span>}
                      <p className={`text-sm font-semibold ${isTopScorer ? 'text-yellow-400' : 'text-white'}`}>
                        {name}
                      </p>
                      {isTopScorer && (
                        <span className="text-[10px] font-semibold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          Top
                        </span>
                      )}
                    </div>
                    {match.status === 'completed' && pts != null && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        isTopScorer
                          ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
                          : 'text-green-400 bg-green-400/10 border-green-400/20'
                      }`}>
                        {pts} pts
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <p className="text-gray-600 uppercase tracking-wide text-[10px]">Winner</p>
                      <p className={`mt-0.5 font-medium ${
                        match.status === 'completed'
                          ? pred.picks.winner === match.result?.winner ? 'text-green-400' : 'text-gray-400'
                          : 'text-gray-300'
                      }`}>{pred.picks.winner || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 uppercase tracking-wide text-[10px]">Top Batter</p>
                      <p className={`mt-0.5 font-medium ${
                        match.status === 'completed'
                          ? match.result?.topBatter?.includes(pred.picks.topBatter) ? 'text-green-400' : 'text-gray-400'
                          : 'text-gray-300'
                      }`}>{pred.picks.topBatter || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 uppercase tracking-wide text-[10px]">Top Bowler</p>
                      <p className={`mt-0.5 font-medium ${
                        match.status === 'completed'
                          ? match.result?.topBowler?.includes(pred.picks.topBowler) ? 'text-green-400' : 'text-gray-400'
                          : 'text-gray-300'
                      }`}>{pred.picks.topBowler || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 uppercase tracking-wide text-[10px]">Player of Match</p>
                      <p className={`mt-0.5 font-medium ${
                        match.status === 'completed'
                          ? match.result?.playerOfMatch?.includes(pred.picks.playerOfMatch) ? 'text-green-400' : 'text-gray-400'
                          : 'text-gray-300'
                      }`}>{pred.picks.playerOfMatch || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 uppercase tracking-wide text-[10px]">{match.teamA} PP</p>
                      <p className={`mt-0.5 font-medium ${
                        match.status === 'completed' && match.result?.powerplayScoreA !== null
                          ? Math.abs(pred.picks.powerplayScoreA - (match.result?.powerplayScoreA ?? 0)) === 0
                            ? 'text-green-400'
                            : Math.abs(pred.picks.powerplayScoreA - (match.result?.powerplayScoreA ?? 0)) <= 2
                            ? 'text-yellow-400'
                            : 'text-gray-400'
                          : 'text-gray-300'
                      }`}>{pred.picks.powerplayScoreA}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 uppercase tracking-wide text-[10px]">{match.teamB} PP</p>
                      <p className={`mt-0.5 font-medium ${
                        match.status === 'completed' && match.result?.powerplayScoreB !== null
                          ? Math.abs(pred.picks.powerplayScoreB - (match.result?.powerplayScoreB ?? 0)) === 0
                            ? 'text-green-400'
                            : Math.abs(pred.picks.powerplayScoreB - (match.result?.powerplayScoreB ?? 0)) <= 2
                            ? 'text-yellow-400'
                            : 'text-gray-400'
                          : 'text-gray-300'
                      }`}>{pred.picks.powerplayScoreB}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky submit bar */}
      {!isLocked && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#111111]/95 backdrop-blur-sm border-t border-[#2F2F2F] px-4 py-4 z-30">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-white text-sm font-medium">
                {[picks.winner, picks.topBatter, picks.topBowler, picks.playerOfMatch].filter(Boolean).length
                  + (picks.powerplayScoreA > 0 ? 1 : 0)
                  + (picks.powerplayScoreB > 0 ? 1 : 0)}/6 picks done
              </p>
              {!allFilled && <p className="text-gray-500 text-xs mt-0.5">Fill all 6 picks to submit</p>}
            </div>
            <Button onClick={handleSubmit} loading={submitting} disabled={!allFilled}>
              {hasExisting ? 'Update Picks' : 'Submit Picks'}
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
};
