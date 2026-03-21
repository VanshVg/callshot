import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Button } from '../components/common/Button';
import {
  useGetGroupQuery,
  useGetMyCardsQuery,
  useGetMyPredictionQuery,
  useGetTournamentOptionsQuery,
  useSwapCardMutation,
  useJokerCardMutation,
} from '../store/api';
import type { Card } from '../types/index';

// ── Searchable dropdown ───────────────────────────────────────────────────────

const SearchDrop = ({
  options, value, onChange, placeholder, disabled,
}: {
  options: string[]; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  const select = (name: string) => { onChange(name); setSearch(''); setOpen(false); };

  if (value) {
    return (
      <div className="flex items-center gap-3 bg-[#FF6800]/5 border border-[#FF6800]/25 rounded-lg px-3 py-2.5">
        <span className="text-gray-200 text-sm flex-1 truncate">{value}</span>
        {!disabled && (
          <button onClick={() => onChange('')} className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-[#111111] border border-[#2F2F2F] focus-within:border-[#FF6800] rounded-lg px-3 py-2.5 transition-colors">
        <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder ?? 'Search…'}
          disabled={disabled}
          className="bg-transparent text-white text-sm outline-none flex-1 placeholder-gray-600 disabled:text-gray-600"
        />
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
  );
};

// ── Swap form ─────────────────────────────────────────────────────────────────

const SwapForm = ({
  picks, options, groupId, tournamentId, onDone, onCancel,
}: {
  picks: { categoryId: string; categoryName: string; type: string; selections: string[] }[];
  options: { players: string[]; teams: string[] };
  groupId: string; tournamentId: string;
  onDone: () => void; onCancel: () => void;
}) => {
  const [swapMode, setSwapMode] = useState<'replace' | 'reorder'>('replace');
  const [categoryId, setCategoryId] = useState('');
  const [oldSelection, setOldSelection] = useState('');
  const [newSelection, setNewSelection] = useState('');
  const [error, setError] = useState('');
  const [swapCard, { isLoading }] = useSwapCardMutation();

  const selectedCat = picks.find((p) => p.categoryId === categoryId);
  const isTeam = selectedCat?.type === 'team_position';
  const currentPicks = selectedCat?.selections ?? [];
  const playerPool = isTeam ? options.teams : options.players;

  // Replace mode: exclude current picks (except the one being swapped out)
  const replaceOptions = playerPool.filter(
    (p) => !currentPicks.includes(p) || p === oldSelection,
  ).filter((p) => p !== oldSelection);

  // Reorder mode: second pick must be different from first
  const reorderSecondOptions = currentPicks.filter((p) => p !== oldSelection);

  const handleSubmit = async () => {
    if (!categoryId || !oldSelection || !newSelection) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    try {
      await swapCard({ groupId, tournamentId, categoryId, oldSelection, newSelection }).unwrap();
      onDone();
    } catch (err: unknown) {
      setError((err as { data?: { message?: string } })?.data?.message || 'Failed to use swap card');
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-[#2F2F2F]">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-[#111] rounded-lg p-0.5">
        {(['replace', 'reorder'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setSwapMode(m); setOldSelection(''); setNewSelection(''); setError(''); }}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              swapMode === m ? 'bg-[#2A2A2A] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {m === 'replace' ? '🔄 Replace a Pick' : '↕️ Reorder Picks'}
          </button>
        ))}
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">Category</label>
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setOldSelection(''); setNewSelection(''); }}
          className="bg-[#111111] border border-[#2F2F2F] text-gray-200 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#FF6800] cursor-pointer"
        >
          <option value="">Select a category…</option>
          {picks.map((p) => (
            <option key={p.categoryId} value={p.categoryId}>{p.categoryName}</option>
          ))}
        </select>
      </div>

      {swapMode === 'replace' ? (
        <>
          {/* Player to replace */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">Replace</label>
            <select
              value={oldSelection}
              onChange={(e) => { setOldSelection(e.target.value); setNewSelection(''); }}
              disabled={!categoryId}
              className="bg-[#111111] border border-[#2F2F2F] text-gray-200 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#FF6800] cursor-pointer disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              <option value="">Select current pick…</option>
              {currentPicks.map((sel) => (
                <option key={sel} value={sel}>{sel}</option>
              ))}
            </select>
          </div>

          {/* New player */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">With</label>
            <SearchDrop
              options={replaceOptions}
              value={newSelection}
              onChange={setNewSelection}
              placeholder={isTeam ? 'Search teams…' : 'Search players…'}
              disabled={!oldSelection}
            />
          </div>
        </>
      ) : (
        <>
          {/* Reorder: pick first player */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">Move</label>
            <select
              value={oldSelection}
              onChange={(e) => { setOldSelection(e.target.value); setNewSelection(''); }}
              disabled={!categoryId}
              className="bg-[#111111] border border-[#2F2F2F] text-gray-200 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#FF6800] cursor-pointer disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              <option value="">Select a pick…</option>
              {currentPicks.map((sel, i) => (
                <option key={sel} value={sel}>#{i + 1} {sel}</option>
              ))}
            </select>
          </div>

          {/* Reorder: pick second player to swap with */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">Swap position with</label>
            <select
              value={newSelection}
              onChange={(e) => setNewSelection(e.target.value)}
              disabled={!oldSelection}
              className="bg-[#111111] border border-[#2F2F2F] text-gray-200 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#FF6800] cursor-pointer disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              <option value="">Select a pick to swap with…</option>
              {reorderSecondOptions.map((sel) => {
                const idx = currentPicks.indexOf(sel);
                return <option key={sel} value={sel}>#{idx + 1} {sel}</option>;
              })}
            </select>
            <p className="text-gray-600 text-xs">Their positions will be swapped — no player is removed.</p>
          </div>
        </>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
        <Button fullWidth loading={isLoading} onClick={handleSubmit}>Confirm Swap</Button>
      </div>
    </div>
  );
};

// ── Joker form ────────────────────────────────────────────────────────────────

const JokerForm = ({
  picks, groupId, tournamentId, onDone, onCancel,
}: {
  picks: { categoryId: string; categoryName: string; type: string; selections: string[] }[];
  groupId: string; tournamentId: string;
  onDone: () => void; onCancel: () => void;
}) => {
  const [categoryId, setCategoryId] = useState('');
  const [player, setPlayer] = useState('');
  const [predictedPosition, setPredictedPosition] = useState(0);
  const [error, setError] = useState('');
  const [jokerCard, { isLoading }] = useJokerCardMutation();

  // Joker only makes sense for player categories (positional scoring)
  const playerPicks = picks.filter((p) => p.type !== 'team_position');
  const selectedCat = playerPicks.find((p) => p.categoryId === categoryId);
  const currentPicks = selectedCat?.selections ?? [];

  const handleSubmit = async () => {
    if (!categoryId || !player || predictedPosition < 1) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    try {
      await jokerCard({ groupId, tournamentId, categoryId, player, predictedPosition }).unwrap();
      onDone();
    } catch (err: unknown) {
      setError((err as { data?: { message?: string } })?.data?.message || 'Failed to use joker card');
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-[#2F2F2F]">
      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">Category</label>
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPlayer(''); setPredictedPosition(0); }}
          className="bg-[#111111] border border-[#2F2F2F] text-gray-200 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#FF6800] cursor-pointer"
        >
          <option value="">Select a category…</option>
          {playerPicks.map((p) => (
            <option key={p.categoryId} value={p.categoryId}>{p.categoryName}</option>
          ))}
        </select>
      </div>

      {/* Player to joker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">Player</label>
        <select
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
          disabled={!categoryId}
          className="bg-[#111111] border border-[#2F2F2F] text-gray-200 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#FF6800] cursor-pointer disabled:text-gray-600 disabled:cursor-not-allowed"
        >
          <option value="">Select from your picks…</option>
          {currentPicks.map((sel) => (
            <option key={sel} value={sel}>{sel}</option>
          ))}
        </select>
        <p className="text-gray-600 text-xs">Choose one of your current picks for this category.</p>
      </div>

      {/* Predicted position */}
      <div className="flex flex-col gap-2">
        <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">
          Exact Position <span className="text-[#FF6800]">+30 pts if correct</span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((pos) => (
            <button
              key={pos}
              onClick={() => setPredictedPosition(pos)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors cursor-pointer ${
                predictedPosition === pos
                  ? 'bg-[#FF6800] border-[#FF6800] text-white'
                  : 'bg-[#111111] border-[#2F2F2F] text-gray-400 hover:border-[#FF6800]/40 hover:text-white'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
        <p className="text-gray-600 text-xs">Pick the exact finishing position you predict for this player.</p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
        <Button fullWidth loading={isLoading} onClick={handleSubmit}>Place Joker</Button>
      </div>
    </div>
  );
};

// ── Card tile ─────────────────────────────────────────────────────────────────

const CardTile = ({
  card, index, canUse, picks, options, groupId, tournamentId, categoryMap,
}: {
  card: Card; index: number; canUse: boolean;
  picks: { categoryId: string; categoryName: string; type: string; selections: string[] }[];
  options: { players: string[]; teams: string[] };
  groupId: string; tournamentId: string;
  categoryMap: Record<string, string>;
}) => {
  const [mode, setMode] = useState<'idle' | 'swap' | 'joker'>('idle');

  const details = card.details as Record<string, unknown> | null;
  const cardNum = index + 1;

  // For used cards, show the actual type used
  const usedAsSwap = card.used && card.type === 'swap';

  return (
    <div className={`bg-[#1E1E1E] border rounded-xl p-5 flex flex-col gap-3 transition-colors ${
      card.used
        ? 'border-[#2F2F2F] opacity-75'
        : mode !== 'idle'
        ? 'border-[#FF6800]/50'
        : 'border-[#2F2F2F]'
    }`}>
      {/* Card header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">
            {card.used ? (usedAsSwap ? '🔄' : '🃏') : '🎴'}
          </span>
          <div>
            <p className="text-white font-semibold text-sm">
              {card.used
                ? (usedAsSwap ? 'Swap Card' : 'Joker Card')
                : `Card #${cardNum}`}
            </p>
            {card.used && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${
                usedAsSwap
                  ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                  : 'text-purple-400 bg-purple-400/10 border-purple-400/20'
              }`}>
                {card.type}
              </span>
            )}
          </div>
        </div>
        {card.used ? (
          <span className="text-xs font-medium text-gray-500 bg-[#2A2A2A] border border-[#3A3A3A] px-2 py-0.5 rounded-full">
            Used
          </span>
        ) : (
          <span className="text-xs font-medium text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
            Available
          </span>
        )}
      </div>

      {/* Used details */}
      {card.used && details && (
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-xs text-gray-400 flex flex-col gap-1">
          {usedAsSwap ? (
            <>
              <p><span className="text-gray-600">Category:</span> {categoryMap[details.categoryId as string] ?? details.categoryId as string}</p>
              <p><span className="text-gray-600">Replaced:</span> <span className="text-red-400">{details.oldSelection as string}</span> → <span className="text-green-400">{details.newSelection as string}</span></p>
            </>
          ) : (
            <>
              <p><span className="text-gray-600">Category:</span> {categoryMap[details.categoryId as string] ?? details.categoryId as string}</p>
              <p><span className="text-gray-600">Player:</span> {details.player as string} at position <span className="text-[#FF6800] font-bold">#{details.predictedPosition as number}</span></p>
            </>
          )}
          {card.usedAt && (
            <p className="text-gray-600 mt-0.5">
              Used {new Date(card.usedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
      )}

      {/* Unused — two action buttons */}
      {!card.used && canUse && mode === 'idle' && (
        <>
          <p className="text-gray-500 text-xs">Choose how to use this card:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('swap')}
              className="flex flex-col items-center gap-1.5 bg-[#111111] border border-[#2F2F2F] hover:border-blue-400/50 hover:bg-blue-400/5 rounded-xl px-3 py-4 text-center transition-colors cursor-pointer"
            >
              <span className="text-2xl">🔄</span>
              <p className="text-blue-400 font-semibold text-sm">Swap</p>
              <p className="text-gray-600 text-[11px] leading-tight">Replace a pick with someone else</p>
            </button>
            <button
              onClick={() => setMode('joker')}
              className="flex flex-col items-center gap-1.5 bg-[#111111] border border-[#2F2F2F] hover:border-purple-400/50 hover:bg-purple-400/5 rounded-xl px-3 py-4 text-center transition-colors cursor-pointer"
            >
              <span className="text-2xl">🃏</span>
              <p className="text-purple-400 font-semibold text-sm">Joker</p>
              <p className="text-gray-600 text-[11px] leading-tight">Bet on exact position for +30 pts</p>
            </button>
          </div>
        </>
      )}

      {/* Locked — tournament not live */}
      {!card.used && !canUse && mode === 'idle' && (
        <p className="text-gray-600 text-xs">Choose swap or joker once the tournament starts.</p>
      )}

      {/* Inline form */}
      {mode === 'swap' && (
        <SwapForm
          picks={picks}
          options={options}
          groupId={groupId}
          tournamentId={tournamentId}
          onDone={() => setMode('idle')}
          onCancel={() => setMode('idle')}
        />
      )}
      {mode === 'joker' && (
        <JokerForm
          picks={picks}
          groupId={groupId}
          tournamentId={tournamentId}
          onDone={() => setMode('idle')}
          onCancel={() => setMode('idle')}
        />
      )}
    </div>
  );
};

// ── Cards Page ────────────────────────────────────────────────────────────────

export const Cards = () => {
  const { groupId } = useParams<{ groupId: string }>();

  const { data: group, isLoading: groupLoading } = useGetGroupQuery(groupId!);

  const tournamentId =
    group?.tournament && typeof group.tournament === 'object'
      ? group.tournament._id
      : (group?.tournament as string | undefined);

  const tournamentStatus =
    group?.tournament && typeof group.tournament === 'object'
      ? (group.tournament as { status: string }).status
      : null;

  const { data: cards, isLoading: cardsLoading } = useGetMyCardsQuery(
    { groupId: groupId!, tournamentId: tournamentId! },
    { skip: !tournamentId },
  );

  const { data: predictionData, isLoading: predLoading } = useGetMyPredictionQuery(
    { groupId: groupId!, tournamentId: tournamentId! },
    { skip: !tournamentId },
  );

  const { data: options } = useGetTournamentOptionsQuery(tournamentId!, { skip: !tournamentId });

  const loading = groupLoading || cardsLoading || predLoading;

  // Build picks summary for the forms
  const picks = (predictionData?.picks ?? []).map((pick) => {
    const cat = typeof pick.category === 'object' ? pick.category : null;
    return {
      categoryId: cat?._id ?? '',
      categoryName: cat?.name ?? '',
      type: cat?.type ?? '',
      selections: pick.selections,
    };
  }).filter((p) => p.categoryId);

  // Map categoryId → name for display in used card details
  const categoryMap: Record<string, string> = {};
  for (const p of picks) categoryMap[p.categoryId] = p.categoryName;

  const canUse = tournamentStatus === 'live';
  const unusedCount = cards ? cards.cards.filter((c) => !c.used).length : 0;

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse flex flex-col gap-5">
          <div className="h-4 bg-[#2A2A2A] rounded w-20" />
          <div className="h-8 bg-[#2A2A2A] rounded w-1/3" />
          {[1, 2, 3, 4].map((n) => <div key={n} className="h-36 bg-[#1E1E1E] rounded-xl" />)}
        </div>
      </Layout>
    );
  }

  const tournament = typeof group?.tournament === 'object' ? group.tournament : null;

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
          {group?.name ?? 'Group'}
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-white text-2xl font-bold">Strategy Cards</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tournament?.name ?? ''} · {unusedCount} unused card{unusedCount !== 1 ? 's' : ''} = {unusedCount * 4} bonus pts
          </p>
        </div>

        {/* Info box */}
        <div className="bg-[#1A1A1A] border border-[#2F2F2F] rounded-xl p-5 flex flex-col gap-3">
          <p className="text-gray-300 text-sm font-semibold">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500">
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">🔄</span>
              <p><span className="text-gray-300 font-medium">Swap</span> — replace one of your picks mid-tournament with someone else.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">🃏</span>
              <p><span className="text-gray-300 font-medium">Joker</span> — bet on a player finishing at an exact position for +30 bonus points.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">✨</span>
              <p><span className="text-gray-300 font-medium">Unused</span> — each unused card earns you 4 points at the end.</p>
            </div>
          </div>
        </div>

        {/* Status banners */}
        {tournamentStatus === 'upcoming' && (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cards unlock once the tournament starts. Submit your predictions first.
          </div>
        )}

        {tournamentStatus === 'completed' && (
          <div className="bg-gray-500/10 border border-gray-500/20 text-gray-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Tournament is over — cards can no longer be used. Unused cards count toward your score.
          </div>
        )}

        {/* No prediction yet */}
        {!predictionData && (
          <div className="bg-[#FF6800]/10 border border-[#FF6800]/20 text-[#FF6800] rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            You need to submit tournament predictions before cards are issued.{' '}
            <Link to={`/groups/${groupId}/predictions`} className="underline text-[#FF6800] font-medium">Make picks →</Link>
          </div>
        )}

        {/* Card grid */}
        {cards ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.cards.map((card, i) => (
              <CardTile
                key={i}
                card={card}
                index={i}
                canUse={canUse && !!predictionData}
                picks={picks}
                options={{ players: options?.players ?? [], teams: options?.teams ?? [] }}
                groupId={groupId!}
                tournamentId={tournamentId!}
                categoryMap={categoryMap}
              />
            ))}
          </div>
        ) : predictionData ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            Cards will appear after your predictions are confirmed.
          </div>
        ) : null}

      </div>
    </Layout>
  );
};
