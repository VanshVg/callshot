import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { useGetGroupQuery, useGetLeaderboardQuery } from '../store/api';
import { useAuth } from '../context/AuthContext';
import type { LeaderboardEntry } from '../types/index';

// ── Confetti ───────────────────────────────────────────────────────────────────

const COLORS = ['#FF6800','#FFD700','#FF4500','#00E5FF','#FF69B4','#ADFF2F','#FF1493','#FFA500','#7FFF00','#00BFFF'];
const PIECES = 90;

interface Piece {
  id: number; color: string; left: number; delay: number; duration: number; size: number; wobble: number;
}

const makeConfetti = (): Piece[] =>
  Array.from({ length: PIECES }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    left: Math.random() * 100,
    delay: Math.random() * 2.5,
    duration: 2.8 + Math.random() * 2.2,
    size: 6 + Math.random() * 8,
    wobble: (Math.random() - 0.5) * 160,
  }));

const Confetti = ({ onDone }: { onDone: () => void }) => {
  const pieces = useRef(makeConfetti()).current;

  // Remove overlay after longest piece settles (~6s)
  useEffect(() => {
    const t = setTimeout(onDone, 6200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (0.4 + Math.random() * 0.6),
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg) translateX(0); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg) translateX(var(--wobble, 60px)); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const WinnerBanner = ({ name, onClose }: { name: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
    <div
      className="pointer-events-auto relative bg-gradient-to-br from-yellow-500/20 via-[#1E1E1E] to-[#FF6800]/20 border border-yellow-400/40 rounded-3xl px-8 py-10 w-full max-w-sm text-center shadow-2xl"
      style={{ animation: 'banner-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <div className="text-6xl mb-3">🏆</div>
      <p className="text-yellow-300 text-xs font-bold uppercase tracking-widest mb-1">Tournament Winner</p>
      <h2 className="text-white text-3xl font-extrabold mb-1">{name}</h2>
      <p className="text-gray-400 text-sm mb-6">You called it! Congratulations on winning the tournament.</p>
      <button
        onClick={onClose}
        className="bg-[#FF6800] hover:bg-[#e05e00] text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
      >
        See the Leaderboard 🎉
      </button>
      <style>{`
        @keyframes banner-pop {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  </div>
);

// ── Rank config ───────────────────────────────────────────────────────────────

const RANK: Record<number, {
  medal: string; ring: string; glow: string; pts: string; bar: string;
  border: string; leftBar: string; avatar: string; badge: string; rowBg: string;
}> = {
  1: {
    medal: '🥇', ring: 'ring-yellow-400', glow: 'shadow-yellow-400/40',
    pts: 'text-yellow-400', bar: 'bg-yellow-400', border: 'border-yellow-400/35',
    leftBar: 'bg-yellow-400', avatar: 'bg-yellow-400/25 text-yellow-200',
    badge: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30',
    rowBg: 'bg-gradient-to-r from-yellow-400/8 via-[#1A1A1A] to-[#1A1A1A]',
  },
  2: {
    medal: '🥈', ring: 'ring-slate-400', glow: 'shadow-slate-400/20',
    pts: 'text-slate-300', bar: 'bg-slate-400', border: 'border-slate-400/30',
    leftBar: 'bg-slate-400', avatar: 'bg-slate-400/20 text-slate-200',
    badge: 'bg-slate-400/15 text-slate-300 border-slate-400/30',
    rowBg: 'bg-gradient-to-r from-slate-400/6 via-[#1A1A1A] to-[#1A1A1A]',
  },
  3: {
    medal: '🥉', ring: 'ring-amber-600', glow: 'shadow-amber-600/20',
    pts: 'text-amber-500', bar: 'bg-amber-500', border: 'border-amber-600/30',
    leftBar: 'bg-amber-600', avatar: 'bg-amber-600/20 text-amber-300',
    badge: 'bg-amber-600/15 text-amber-400 border-amber-600/30',
    rowBg: 'bg-gradient-to-r from-amber-600/6 via-[#1A1A1A] to-[#1A1A1A]',
  },
};

const rankCfg = (rank: number) =>
  RANK[rank] ?? {
    medal: String(rank), ring: 'ring-[#333]', glow: '',
    pts: 'text-[#FF6800]', bar: 'bg-[#FF6800]', border: 'border-[#2A2A2A]',
    leftBar: 'bg-[#FF6800]/40', avatar: 'bg-[#252525] text-gray-400',
    badge: 'bg-[#FF6800]/10 text-[#FF6800] border-[#FF6800]/20',
    rowBg: 'bg-[#1A1A1A]',
  };

// ── Podium ────────────────────────────────────────────────────────────────────

const Podium = ({ standings }: { standings: LeaderboardEntry[] }) => {
  const order = [standings[1], standings[0], standings[2]]; // 2nd | 1st | 3rd
  const platforms = [
    { height: 'h-16', label: '2nd', cfg: rankCfg(2) },
    { height: 'h-28', label: '1st', cfg: rankCfg(1) },
    { height: 'h-10', label: '3rd', cfg: rankCfg(3) },
  ];
  const avatarSz = ['w-13 h-13', 'w-18 h-18', 'w-12 h-12'];
  const nameSz = ['text-xs', 'text-sm', 'text-xs'];
  const ptsSz = ['text-lg', 'text-3xl', 'text-base'];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#252525] bg-[#111111]">
      {/* Star field background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: i % 3 === 0 ? 2 : 1,
              height: i % 3 === 0 ? 2 : 1,
              top: `${(i * 17 + 5) % 60}%`,
              left: `${(i * 23 + 8) % 100}%`,
              opacity: 0.12 + (i % 4) * 0.05,
            }}
          />
        ))}
      </div>

      {/* Central gold glow for #1 */}
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
        <div className="w-40 h-40 bg-yellow-400/8 blur-3xl rounded-full -translate-y-4" />
      </div>

      <div className="relative px-4 pt-8 pb-0">
        {/* Crown above #1 */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl">👑</div>

        <div className="grid grid-cols-3 items-end gap-1">
          {order.map((entry, i) => {
            if (!entry) return <div key={i} />;
            const { height, label, cfg } = platforms[i];
            const isFirst = i === 1;

            return (
              <div key={entry.user.id} className="flex flex-col items-center">
                {/* Medal emoji */}
                <span className="text-xl mb-1">{cfg.medal}</span>

                {/* Avatar */}
                <div
                  className={`${avatarSz[i]} rounded-full ring-2 ${cfg.ring} flex items-center justify-center font-extrabold ${cfg.avatar} mb-2 ${isFirst ? `shadow-2xl ${cfg.glow}` : ''}`}
                  style={{ width: isFirst ? 64 : i === 0 ? 52 : 46, height: isFirst ? 64 : i === 0 ? 52 : 46, fontSize: isFirst ? 22 : 16 }}
                >
                  {entry.user.name?.[0]?.toUpperCase()}
                </div>

                {/* Name + pts */}
                <p className={`font-bold truncate max-w-[90px] text-center ${nameSz[i]} ${isFirst ? 'text-white' : 'text-gray-300'}`}>
                  {entry.user.name}
                </p>
                <p className={`font-extrabold ${ptsSz[i]} ${cfg.pts} leading-tight`}>
                  {entry.totalPoints}
                </p>
                <p className="text-gray-600 text-[10px] mb-2">pts</p>

                {/* Platform */}
                <div className={`w-full ${height} ${cfg.border} border-t border-x rounded-t-lg flex items-center justify-center`}
                  style={{ background: `linear-gradient(to bottom, ${i === 1 ? 'rgba(250,204,21,0.12)' : i === 0 ? 'rgba(148,163,184,0.08)' : 'rgba(217,119,6,0.08)'}, transparent)` }}
                >
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Details chips parser ──────────────────────────────────────────────────────

interface DetailChip { label: string; pts: string; isJoker?: boolean; isCorrect?: boolean }

const parseDetails = (raw: string): DetailChip[] => {
  const chips: DetailChip[] = [];

  // Match player picks: "Name → P1 (+10pts)"
  const pickRe = /(.+?) → P(\d+) \(\+(\d+)pts\)/g;
  let m: RegExpExecArray | null;
  while ((m = pickRe.exec(raw)) !== null) {
    chips.push({ label: `${m[1]} · P${m[2]}`, pts: `+${m[3]}`, isCorrect: true });
  }

  // Joker bonus chips: "Joker CORRECT: Player @P1 (+30pts)" — one per correct joker
  const jokerRe = /Joker CORRECT: (.+?) @P(\d+) \(\+(\d+)pts\)/g;
  let jm: RegExpExecArray | null;
  while ((jm = jokerRe.exec(raw)) !== null) {
    chips.push({ label: `🃏 ${jm[1]} @P${jm[2]}`, pts: `+${jm[3]}`, isJoker: true, isCorrect: true });
  }

  // Correct single player pick (exact_match categories)
  if (chips.length === 0 && raw.includes('Correct Player')) {
    chips.push({ label: raw, pts: '', isCorrect: true });
  }

  // Unused cards line — just show as plain text
  if (chips.length === 0 && raw) {
    chips.push({ label: raw, pts: '' });
  }

  return chips;
};

const DetailChips = ({ details }: { details: string }) => {
  const chips = parseDetails(details);
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {chips.map((c, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            c.isJoker
              ? 'text-purple-300 bg-purple-400/10 border-purple-400/20'
              : c.isCorrect
              ? 'text-gray-300 bg-[#1E1E1E] border-[#333]'
              : 'text-gray-500 bg-[#1A1A1A] border-[#2A2A2A]'
          }`}
        >
          {c.label}
          {c.pts && (
            <span className={`font-bold ${c.isJoker ? 'text-purple-300' : 'text-green-400'}`}>
              {c.pts}
            </span>
          )}
        </span>
      ))}
    </div>
  );
};

// ── Entry row ─────────────────────────────────────────────────────────────────

const EntryRow = ({ entry, maxPts }: { entry: LeaderboardEntry; maxPts: number }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = rankCfg(entry.rank);
  const pct = maxPts > 0 ? Math.round((entry.totalPoints / maxPts) * 100) : 0;
  const hasBreakdown = entry.breakdown.length > 0 || entry.matchPoints > 0;
  const isTop3 = entry.rank <= 3;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${cfg.border} ${isTop3 ? `shadow-lg ${cfg.glow}` : ''}`}>
      {/* Main row */}
      <button
        onClick={() => hasBreakdown && setExpanded((o) => !o)}
        className={`w-full flex items-stretch text-left ${hasBreakdown ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Colored left accent strip */}
        <div className={`w-1 shrink-0 ${cfg.leftBar}`} />

        <div className={`flex-1 flex items-center gap-3 px-4 py-3.5 ${cfg.rowBg}`}>
          {/* Rank badge */}
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold border ${cfg.badge}`}>
            {isTop3 ? cfg.medal : <span className="text-xs">{entry.rank}</span>}
          </div>

          {/* Avatar */}
          <div className={`w-9 h-9 rounded-full ring-2 ${cfg.ring} flex items-center justify-center text-sm font-extrabold shrink-0 ${cfg.avatar}`}>
            {entry.user.name?.[0]?.toUpperCase()}
          </div>

          {/* Name + progress bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <p className="text-white text-sm font-semibold truncate">{entry.user.name}</p>
              <p className="text-gray-600 text-[11px] truncate hidden sm:block">@{entry.user.username}</p>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-[#252525] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Pts pills — desktop */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {entry.tournamentPoints > 0 && (
              <span className="text-[10px] font-medium text-gray-500 bg-[#222] border border-[#2F2F2F] px-2 py-1 rounded-full">
                🏏 {entry.tournamentPoints}
              </span>
            )}
            {entry.matchPoints > 0 && (
              <span className="text-[10px] font-medium text-gray-500 bg-[#222] border border-[#2F2F2F] px-2 py-1 rounded-full">
                ⚡ {entry.matchPoints}
              </span>
            )}
          </div>

          {/* Total points */}
          <div className="text-right shrink-0 min-w-[52px]">
            <p className={`text-2xl font-extrabold leading-none ${cfg.pts}`}>{entry.totalPoints}</p>
            <p className="text-gray-600 text-[10px] mt-0.5">pts</p>
          </div>

          {/* Chevron */}
          {hasBreakdown && (
            <svg className={`w-4 h-4 text-gray-600 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="border-t border-[#222] bg-[#131313] px-5 py-4">
          {/* Mobile pts summary */}
          <div className="flex gap-4 mb-4 sm:hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🏏</span>
              <div>
                <p className="text-gray-600 text-[10px] uppercase">Tournament</p>
                <p className="text-gray-200 text-sm font-bold">{entry.tournamentPoints} pts</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⚡</span>
              <div>
                <p className="text-gray-600 text-[10px] uppercase">Matches</p>
                <p className="text-gray-200 text-sm font-bold">{entry.matchPoints} pts</p>
              </div>
            </div>
          </div>

          <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mb-3">
            Category Breakdown
          </p>

          <div className="flex flex-col gap-3">
            {entry.breakdown.map((b) => {
              const catPct = entry.totalPoints > 0
                ? Math.min(100, Math.round((b.points / entry.totalPoints) * 100))
                : 0;
              return (
                <div key={b.categoryId}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-gray-300 text-xs font-semibold">{b.categoryName}</p>
                      {b.details && <DetailChips details={b.details} />}
                    </div>
                    <span className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded-full border ${
                      b.points > 0 ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-gray-600 bg-[#222] border-[#2A2A2A]'
                    }`}>
                      {b.points > 0 ? `+${b.points}` : '—'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${b.points > 0 ? cfg.bar : 'bg-[#2A2A2A]'}`} style={{ width: `${catPct}%` }} />
                  </div>
                </div>
              );
            })}

            {entry.matchPoints > 0 && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">⚡</span>
                    <p className="text-gray-300 text-xs font-semibold">Match Day Predictions</p>
                  </div>
                  <span className="text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                    +{entry.matchPoints}
                  </span>
                </div>
                <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(100, Math.round((entry.matchPoints / (entry.totalPoints || 1)) * 100))}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Leaderboard Page ──────────────────────────────────────────────────────────

export const Leaderboard = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();

  const { data: group, isLoading: groupLoading } = useGetGroupQuery(groupId!);

  const tournamentId =
    group?.tournament && typeof group.tournament === 'object'
      ? group.tournament._id
      : (group?.tournament as string | undefined);

  const { data, isLoading: lbLoading } = useGetLeaderboardQuery(
    { groupId: groupId!, tournamentId: tournamentId! },
    { skip: !groupId || !tournamentId }
  );

  const loading = groupLoading || lbLoading;
  const standings = data?.standings ?? [];
  const tournament = typeof group?.tournament === 'object' ? group.tournament : null;
  const maxPts = standings[0]?.totalPoints ?? 0;
  const showPodium = standings.length >= 3 && standings[2]?.totalPoints > 0;

  // Celebration state
  const celebrationKey = `winner_seen_${groupId}_${tournamentId}`;
  const isCompleted = (tournament as any)?.status === 'completed';
  const winner = standings[0];
  const isWinner = !!winner && (winner.user.id === user?.id || winner.user.id === (user as any)?._id);
  const [showBanner, setShowBanner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const celebrationTriggered = useRef(false);

  useEffect(() => {
    if (
      !loading &&
      isCompleted &&
      isWinner &&
      !localStorage.getItem(celebrationKey) &&
      !celebrationTriggered.current
    ) {
      celebrationTriggered.current = true;
      localStorage.setItem(celebrationKey, '1');
      setShowConfetti(true);
      setShowBanner(true);
    }
  }, [loading, isCompleted, isWinner, celebrationKey]);

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse flex flex-col gap-5">
          <div className="h-4 bg-[#222] rounded w-20" />
          <div className="h-8 bg-[#222] rounded w-1/3" />
          <div className="h-56 bg-[#111] rounded-2xl" />
          {[1, 2, 3, 4].map((n) => <div key={n} className="h-16 bg-[#1A1A1A] rounded-2xl" />)}
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <p className="text-gray-400">Group not found.</p>
          <Link to="/dashboard" className="text-[#FF6800] text-sm no-underline hover:text-[#ff8533]">← Dashboard</Link>
        </div>
      </Layout>
    );
  }

  return (
    <>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      {showBanner && <WinnerBanner name={winner?.user.name ?? 'You'} onClose={() => setShowBanner(false)} />}
    <Layout>
      <div className="flex flex-col gap-5">

        {/* Back */}
        <Link
          to={`/groups/${groupId}`}
          className="text-gray-500 hover:text-gray-300 text-sm no-underline flex items-center gap-1.5 w-fit transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {group.name}
        </Link>

        {/* Hero header */}
        <div className="relative rounded-2xl overflow-hidden border border-[#252525] bg-[#111] px-5 py-5">
          {/* Ambient orange glow */}
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#FF6800]/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-white text-2xl font-extrabold tracking-tight">Leaderboard</h1>
              <p className="text-gray-500 text-sm mt-0.5">{tournament?.name ?? group.name}</p>
              <div className="flex items-center gap-3 mt-2">
                {data?.totalParticipants != null && (
                  <span className="text-[11px] text-gray-500 bg-[#1E1E1E] border border-[#2A2A2A] px-2.5 py-1 rounded-full">
                    👥 {data.totalParticipants} members
                  </span>
                )}
                {data?.predictionsSubmitted != null && (
                  <span className="text-[11px] text-gray-500 bg-[#1E1E1E] border border-[#2A2A2A] px-2.5 py-1 rounded-full">
                    🎯 {data.predictionsSubmitted} submitted
                  </span>
                )}
              </div>
            </div>
            <span className="text-4xl">🏆</span>
          </div>
        </div>

        {/* Empty state */}
        {standings.length === 0 ? (
          <div className="border border-dashed border-[#2A2A2A] rounded-2xl p-14 text-center flex flex-col items-center gap-3">
            <span className="text-4xl">📊</span>
            <p className="text-gray-200 font-semibold">No standings yet</p>
            <p className="text-gray-500 text-sm">Points will appear once the admin enters results.</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {showPodium && <Podium standings={standings} />}

            {/* Separator */}
            {showPodium && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#222]" />
                <p className="text-gray-600 text-[10px] uppercase tracking-widest font-semibold">Full Standings</p>
                <div className="flex-1 h-px bg-[#222]" />
              </div>
            )}

            {/* Full list */}
            <div className="flex flex-col gap-2">
              {standings.map((entry) => (
                <EntryRow key={entry.user.id} entry={entry} maxPts={maxPts} />
              ))}
            </div>

            <p className="text-gray-700 text-xs text-center pb-2">
              Tap any row to see the points breakdown
            </p>
          </>
        )}

      </div>
    </Layout>
    </>
  );
};
