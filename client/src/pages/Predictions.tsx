import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Button } from '../components/common/Button';
import { CelebrationOverlay } from '../components/common/CelebrationOverlay';
import {
  useGetGroupQuery,
  useGetTournamentOptionsQuery,
  useGetMyPredictionQuery,
  useSubmitPredictionMutation,
} from '../store/api';
import type { Category } from '../types/index';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ── SlotDropdown — searchable dropdown for a single pick slot ─────────────────

interface SlotDropdownProps {
  position: number;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  onClear: () => void;
  disabled: boolean;
  isTeam?: boolean;
  playerToTeam?: Record<string, string>;
  isDragging?: boolean;
  isDragOver?: boolean;
}

const SlotDropdown = ({
  position, options, value, onSelect, onClear,
  disabled, isTeam, playerToTeam, isDragging, isDragOver,
}: SlotDropdownProps) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()) ||
    (playerToTeam?.[o] ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const select = useCallback((name: string) => {
    onSelect(name);
    setSearch('');
    setOpen(false);
  }, [onSelect]);

  const team = value ? playerToTeam?.[value] : undefined;

  return (
    <div className={`relative transition-all duration-150 ${isDragging ? 'opacity-40 scale-[0.98]' : ''} ${isDragOver ? 'ring-2 ring-[#FF6800]/50 rounded-lg scale-[1.01]' : ''}`}>
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
        value
          ? 'bg-[#FF6800]/5 border-[#FF6800]/25'
          : disabled
          ? 'bg-[#111111] border-[#2A2A2A] border-dashed'
          : 'bg-[#111111] border-[#2A2A2A] focus-within:border-[#FF6800]'
      }`}>
        {/* Ordinal label */}
        <span className={`text-xs font-bold w-7 shrink-0 ${value ? 'text-[#FF6800]' : 'text-gray-600'}`}>
          {ordinal(position)}
        </span>

        {value ? (
          /* ── Filled: show name + team + clear ── */
          <>
            <div className="flex-1 min-w-0">
              <span className="text-gray-200 text-sm block truncate">{value}</span>
              {team && <span className="text-[11px] text-gray-500 truncate block">{team}</span>}
            </div>
            {!disabled && (
              <button
                onClick={onClear}
                className="text-gray-600 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                aria-label="Remove"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </>
        ) : disabled ? (
          <span className="text-gray-600 text-sm italic">
            {isTeam ? `Pick ${ordinal(position)} team` : `Pick ${ordinal(position)} player`}
          </span>
        ) : (
          <>
            <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={isTeam ? 'Search teams…' : 'Search players…'}
              className="bg-transparent text-white text-sm outline-none flex-1 placeholder-gray-600"
            />
            {search && (
              <button
                onMouseDown={(e) => { e.preventDefault(); setSearch(''); }}
                className="text-gray-600 hover:text-gray-400 cursor-pointer shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg overflow-hidden z-20 shadow-2xl max-h-52 overflow-y-auto">
          {filtered.map((name) => {
            const t = playerToTeam?.[name];
            return (
              <button
                key={name}
                onMouseDown={() => select(name)}
                className="w-full text-left px-3 py-2.5 hover:bg-[#FF6800]/10 transition-colors cursor-pointer border-b border-[#2A2A2A] last:border-0 flex items-center justify-between gap-2"
              >
                <span className="text-sm text-gray-200 truncate">{name}</span>
                {t && (
                  <span className="text-[11px] text-gray-500 bg-[#2A2A2A] px-1.5 py-0.5 rounded shrink-0">
                    {t}
                  </span>
                )}
              </button>
            );
          })}
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

// ── CategoryCard ──────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: Category;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled: boolean;
  playerToTeam?: Record<string, string>;
}

const CategoryCard = ({ category, options, value, onChange, disabled, playerToTeam }: CategoryCardProps) => {
  const isTeam = category.type === 'team_position';
  const count = category.selectionCount;
  const isFull = value.length >= count;
  const complete = value.length === count;

  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const toggleTeam = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((v) => v !== name));
    } else if (!isFull) {
      onChange([...value, name]);
    }
  };

  const setSlot = (idx: number, name: string) => {
    const next = [...value];
    next[idx] = name;
    onChange(next);
  };

  const clearSlot = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleDragStart = (idx: number) => {
    dragIdx.current = idx;
    setDraggingIdx(idx);
  };

  const handleDrop = (targetIdx: number) => {
    const src = dragIdx.current;
    if (src === null || src === targetIdx) return;
    const next = [...value];
    // Extend array to cover both indices with empty strings if needed
    while (next.length <= Math.max(src, targetIdx)) next.push('');
    [next[src], next[targetIdx]] = [next[targetIdx], next[src]];
    // Remove trailing empty strings
    while (next.length > 0 && next[next.length - 1] === '') next.pop();
    onChange(next);
    dragIdx.current = null;
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className={`bg-[#1E1E1E] border rounded-xl p-5 flex flex-col gap-4 transition-colors ${
      complete ? 'border-[#FF6800]/30' : 'border-[#2F2F2F]'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold text-base">{category.name}</h3>
          {category.description && (
            <p className="text-gray-500 text-xs mt-0.5">{category.description}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${
          complete
            ? 'bg-green-400/10 text-green-400 border-green-400/20'
            : 'bg-[#2A2A2A] text-gray-500 border-[#3A3A3A]'
        }`}>
          {value.length}/{count}
        </span>
      </div>

      {isTeam ? (
        /* ── Team chip grid ── */
        <div className="flex flex-wrap gap-2">
          {options.map((team) => {
            const idx = value.indexOf(team);
            const selected = idx !== -1;
            return (
              <button
                key={team}
                onClick={() => !disabled && toggleTeam(team)}
                disabled={disabled || (!selected && isFull)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  selected
                    ? 'bg-[#FF6800]/10 border-[#FF6800]/40 text-[#FF6800]'
                    : disabled || isFull
                    ? 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-600 opacity-40 cursor-not-allowed'
                    : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:border-[#FF6800]/40 hover:text-white'
                }`}
              >
                {selected && <span className="mr-1 font-bold">{idx + 1}.</span>}
                {team}
              </button>
            );
          })}
        </div>
      ) : (
        /* ── Per-slot player dropdowns with drag-to-reorder ── */
        <div className="flex flex-col gap-2">
          {complete && !disabled && (
            <p className="text-[11px] text-gray-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Drag to reorder
            </p>
          )}
          {Array.from({ length: count }).map((_, i) => {
            const otherPicks = value.filter((_, j) => j !== i);
            const slotOptions = options.filter((o) => !otherPicks.includes(o));
            const isFilled = !!value[i];
            const canDrag = !disabled && isFilled;
            return (
              <div
                key={i}
                draggable={canDrag}
                onDragStart={canDrag ? () => handleDragStart(i) : undefined}
                onDragOver={canDrag || dragIdx.current !== null ? (e) => { e.preventDefault(); setDragOverIdx(i); } : undefined}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                {/* Drag handle */}
                <div className={`shrink-0 transition-opacity ${canDrag ? 'opacity-30 hover:opacity-70' : 'opacity-0'}`}>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
                <div className="flex-1">
                  <SlotDropdown
                    position={i + 1}
                    options={slotOptions}
                    value={value[i] ?? ''}
                    onSelect={(name) => setSlot(i, name)}
                    onClear={() => clearSlot(i)}
                    disabled={disabled}
                    isTeam={false}
                    playerToTeam={playerToTeam}
                    isDragging={draggingIdx === i}
                    isDragOver={dragOverIdx === i && draggingIdx !== i}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Predictions Page ──────────────────────────────────────────────────────────

export const Predictions = () => {
  const { groupId } = useParams<{ groupId: string }>();

  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [error, setError] = useState('');

  const { data: group, isLoading: groupLoading, isError } = useGetGroupQuery(groupId!);

  const tournamentId =
    group?.tournament && typeof group.tournament === 'object'
      ? group.tournament._id
      : (group?.tournament as string | undefined);

  const { data: options, isLoading: optionsLoading } = useGetTournamentOptionsQuery(
    tournamentId!,
    { skip: !tournamentId },
  );

  const { data: predictionData, isLoading: predictionLoading } = useGetMyPredictionQuery(
    { groupId: groupId!, tournamentId: tournamentId! },
    { skip: !tournamentId },
  );

  const [submitPrediction, { isLoading: submitting }] = useSubmitPredictionMutation();

  // Pre-populate picks from existing prediction
  useEffect(() => {
    if (!predictionData) return;
    const map: Record<string, string[]> = {};
    for (const pick of predictionData.picks) {
      const catId =
        typeof pick.category === 'object'
          ? (pick.category as unknown as { _id: string })._id
          : (pick.category as unknown as string);
      map[catId] = pick.selections;
    }
    setPicks(map);
  }, [predictionData]);

  const categories = (group?.enabledCategories ?? []) as Category[];
  const players = options?.players ?? [];
  const teams = options?.teams ?? [];

  // Build player → team lookup from squads
  const playerToTeam: Record<string, string> = {};
  if (options?.squads) {
    for (const [team, squad] of Object.entries(options.squads)) {
      for (const player of squad) {
        playerToTeam[player] = team;
      }
    }
  }

  const tournamentStatus =
    group?.tournament && typeof group.tournament === 'object'
      ? (group.tournament as { status: string }).status
      : null;

  const hasExisting = predictionData != null;
  const isLocked = tournamentStatus === 'live' || tournamentStatus === 'completed';

  const completedCount = categories.filter(
    (c) => (picks[c._id]?.length ?? 0) === c.selectionCount,
  ).length;
  const allFilled = completedCount === categories.length && categories.length > 0;

  const handleSubmit = async () => {
    if (!allFilled || !tournamentId) return;
    setError('');
    try {
      await submitPrediction({
        groupId: groupId!,
        tournamentId,
        picks: categories.map((cat) => ({ category: cat._id, selections: picks[cat._id] ?? [] })),
      }).unwrap();
      setSubmitted(true);
      setShowCelebration(true);
    } catch (err: unknown) {
      setError(
        (err as { data?: { message?: string } })?.data?.message || 'Failed to submit predictions',
      );
    }
  };

  const loading = groupLoading || optionsLoading || predictionLoading;

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse flex flex-col gap-5">
          <div className="h-4 bg-[#2A2A2A] rounded w-20" />
          <div className="h-8 bg-[#2A2A2A] rounded w-1/3" />
          <div className="h-3 bg-[#2A2A2A] rounded w-1/4" />
          {[1, 2, 3].map((n) => <div key={n} className="h-48 bg-[#1E1E1E] rounded-xl" />)}
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

  return (
    <Layout>
      {showCelebration && (
        <CelebrationOverlay
          headline="Shot Called!"
          subline={hasExisting ? 'Predictions updated. May the best call win!' : 'Your picks are locked in. May the best prediction win!'}
          onDone={() => setShowCelebration(false)}
        />
      )}

      <div className="flex flex-col gap-6 pb-28">

        <Link
          to={`/groups/${groupId}`}
          className="text-gray-500 hover:text-gray-300 text-sm no-underline flex items-center gap-1.5 w-fit transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {group.name}
        </Link>

        <div>
          <h1 className="text-white text-2xl font-bold">Tournament Predictions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tournament?.name} · {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </p>
        </div>

        {submitted && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {hasExisting ? 'Predictions updated successfully!' : 'Predictions submitted! Good luck.'}
          </div>
        )}

        {!submitted && hasExisting && tournamentStatus === 'upcoming' && (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl px-4 py-3 text-sm">
            You have already submitted predictions. You can edit and resubmit them until the tournament starts.
          </div>
        )}

        {(tournamentStatus === 'live' || tournamentStatus === 'completed') && (
          <div className="bg-[#FF6800]/10 border border-[#FF6800]/20 text-[#FF6800] rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {tournamentStatus === 'live' ? 'Tournament is live — picks are locked.' : 'Tournament is over — picks are locked.'}
          </div>
        )}

        {categories.map((cat) => (
          <CategoryCard
            key={cat._id}
            category={cat}
            options={cat.type === 'team_position' ? teams : players}
            value={picks[cat._id] ?? []}
            onChange={(v) => setPicks((p) => ({ ...p, [cat._id]: v }))}
            disabled={isLocked}
            playerToTeam={playerToTeam}
          />
        ))}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {!isLocked && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#111111]/95 backdrop-blur-sm border-t border-[#2F2F2F] px-4 py-4 z-30">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-white text-sm font-medium">
                {completedCount}/{categories.length} categories done
              </p>
              {!allFilled && (
                <p className="text-gray-500 text-xs mt-0.5">Fill all categories to submit</p>
              )}
            </div>
            <Button onClick={handleSubmit} loading={submitting} disabled={!allFilled}>
              {hasExisting ? 'Update Predictions' : 'Submit Predictions'}
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
};
