import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import {
  useGetGroupQuery,
  useGetTournamentCategoriesQuery,
  useUpdateGroupMutation,
  useLeaveGroupMutation,
  useGetGroupMemberCardsQuery,
  useAddGroupMemberMutation,
} from '../store/api';
import type { AdminCardEntry, AdminMemberSummary } from '../store/api';
import type { Category, Group } from '../types/index';

// ── Strategy card history ─────────────────────────────────────────────────────

const CardChip = ({ card }: { card: AdminCardEntry }) => {
  const isSwap = card.type === 'swap';
  const d = card.details ?? {};
  const usedColor = isSwap
    ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    : 'text-purple-400 bg-purple-400/10 border-purple-400/20';

  let desc = '';
  if (card.used) {
    if (isSwap && d.oldSelection && d.newSelection)
      desc = `${d.oldSelection as string} → ${d.newSelection as string}`;
    else if (!isSwap && d.player)
      desc = `${d.player as string} @ #${d.predictedPosition as number}`;
  }
  const time = card.usedAt
    ? new Date(card.usedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${card.used ? usedColor : 'text-gray-600 bg-[#1A1A1A] border-[#2A2A2A]'}`}>
      <span className="font-semibold shrink-0">{isSwap ? 'Swap' : 'Joker'}</span>
      {card.used ? (
        <div className="flex flex-col min-w-0">
          {desc && <span className="truncate">{desc}</span>}
          {time && <span className="opacity-60 text-[10px]">{time}</span>}
        </div>
      ) : (
        <span>Unused</span>
      )}
    </div>
  );
};

const MemberCardHistory = ({ member }: { member: AdminMemberSummary }) => {
  const [open, setOpen] = useState(false);
  const used = member.cards.filter((c) => c.used).length;
  const total = member.cards.length;

  return (
    <div className="border border-[#2A2A2A] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-[#1A1A1A] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#2A2A2A] flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
            {member.name[0]?.toUpperCase()}
          </div>
          <span className="text-gray-200 text-sm font-medium truncate">{member.name}</span>
          <span className="text-gray-600 text-xs shrink-0">@{member.username}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {total > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${used > 0 ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' : 'text-gray-600 bg-[#1A1A1A] border-[#2A2A2A]'}`}>
              {used}/{total} used
            </span>
          )}
          <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-2 border-t border-[#2A2A2A] grid grid-cols-1 sm:grid-cols-2 gap-2">
          {total === 0
            ? <p className="text-gray-600 text-xs col-span-2">No cards allocated yet.</p>
            : member.cards.map((card, i) => <CardChip key={i} card={card} />)
          }
        </div>
      )}
    </div>
  );
};

const statusConfig = {
  upcoming: { label: 'Upcoming', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  live: { label: 'Live', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  completed: { label: 'Completed', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
  draft: { label: 'Draft', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  active: { label: 'Active', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
};

// ── Edit Settings Panel ───────────────────────────────────────────────────────

interface EditPanelProps {
  group: Group;
  allCategories: Category[];
  onClose: () => void;
}

const EditPanel = ({ group, allCategories, onClose }: EditPanelProps) => {
  const [form, setForm] = useState({
    name: group.name,
    description: group.description,
    visibility: group.visibility,
    maxMembers: group.maxMembers,
    enableMatchPredictions: group.enableMatchPredictions ?? false,
  });
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(
      group.enabledCategories?.length
        ? group.enabledCategories.map((c) => c._id)
        : allCategories.map((c) => c._id)
    )
  );
  const [error, setError] = useState('');
  const [updateGroup, { isLoading }] = useUpdateGroupMutation();

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Group name is required'); return; }
    if (selectedCategories.size === 0) { setError('At least one category must be enabled'); return; }
    setError('');
    try {
      await updateGroup({
        id: group._id,
        body: {
          name: form.name.trim(),
          description: form.description,
          visibility: form.visibility,
          maxMembers: form.maxMembers,
          enabledCategories: Array.from(selectedCategories),
          enableMatchPredictions: form.enableMatchPredictions,
        },
      }).unwrap();
      // RTK invalidates Group + MyGroups tags — detail auto-refreshes
      onClose();
    } catch (err: unknown) {
      setError((err as { data?: { message?: string } })?.data?.message || 'Failed to save');
    }
  };

  return (
    <div className="bg-[#1E1E1E] border border-[#FF6800]/30 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-white font-semibold text-sm">Edit Group Settings</p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">Group Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="bg-[#111111] border border-[#2F2F2F] focus:border-[#FF6800] rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">Description</label>
        <input
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Optional"
          className="bg-[#111111] border border-[#2F2F2F] focus:border-[#FF6800] rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors placeholder-gray-600"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Visibility</label>
        <div className="grid grid-cols-2 gap-2">
          {(['private', 'public'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setForm((f) => ({ ...f, visibility: v }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                form.visibility === v
                  ? 'border-[#FF6800] bg-[#FF6800]/10 text-[#FF6800]'
                  : 'border-[#2F2F2F] text-gray-400 hover:border-[#3A3A3A]'
              }`}
            >
              {v === 'private' ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">
          Max Members <span className="text-gray-500 font-normal">({form.maxMembers})</span>
        </label>
        <input
          type="range"
          min={group.members.length}
          max={100}
          value={form.maxMembers}
          onChange={(e) => setForm((f) => ({ ...f, maxMembers: Number(e.target.value) }))}
          className="w-full accent-[#FF6800]"
        />
        <div className="flex justify-between text-xs text-gray-600">
          <span>{group.members.length} (current)</span><span>100</span>
        </div>
      </div>

      {allCategories.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">
              Categories <span className="text-gray-600 font-normal">({selectedCategories.size}/{allCategories.length})</span>
            </label>
            <button
              type="button"
              onClick={() =>
                selectedCategories.size === allCategories.length
                  ? setSelectedCategories(new Set([allCategories[0]._id]))
                  : setSelectedCategories(new Set(allCategories.map((c) => c._id)))
              }
              className="text-xs text-[#FF6800] hover:text-[#ff8533] transition-colors cursor-pointer"
            >
              {selectedCategories.size === allCategories.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
            {allCategories.map((cat) => {
              const checked = selectedCategories.has(cat._id);
              return (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => toggleCategory(cat._id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    checked
                      ? 'border-[#FF6800]/40 bg-[#FF6800]/5 text-gray-200'
                      : 'border-[#2F2F2F] text-gray-500 hover:border-[#3A3A3A]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                    checked ? 'bg-[#FF6800] border-[#FF6800]' : 'border-[#3A3A3A]'
                  }`}>
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-match predictions toggle */}
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium text-gray-300">Match Day Predictions</p>
          <p className="text-gray-600 text-xs mt-0.5">Members predict match winners, top players, and powerplay scores</p>
        </div>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, enableMatchPredictions: !f.enableMatchPredictions }))}
          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
            form.enableMatchPredictions ? 'bg-[#FF6800]' : 'bg-[#2A2A2A]'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            form.enableMatchPredictions ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
        <Button fullWidth loading={isLoading} onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
};

// ── GroupDetail ───────────────────────────────────────────────────────────────

export const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [actionError, setActionError] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addGroupMember] = useAddGroupMemberMutation();

  const { data: group, isLoading, isError } = useGetGroupQuery(id!, { skip: !id });
  const tournamentId =
    group && typeof group.tournament === 'object' ? group.tournament._id : undefined;
  const { data: allCategories = [] } = useGetTournamentCategoriesQuery(tournamentId!, {
    skip: !tournamentId,
  });
  const { data: memberCards = [], isLoading: cardsLoading } = useGetGroupMemberCardsQuery(
    { groupId: id!, tournamentId: tournamentId! },
    { skip: !id || !tournamentId }
  );
  const [leaveGroupMutation] = useLeaveGroupMutation();

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };

  const handleCopyCode = async () => {
    if (!group) return;
    await copyToClipboard(group.inviteCode);
    setCopied('code');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyLink = async () => {
    if (!group) return;
    await copyToClipboard(`${window.location.origin}/join/${group.inviteCode}`);
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAddMember = async () => {
    if (!group || !addUsername.trim()) return;
    setAddError('');
    setAddLoading(true);
    try {
      await addGroupMember({ id: group._id, username: addUsername.trim() }).unwrap();
      setAddUsername('');
    } catch (err: unknown) {
      setAddError((err as { data?: { message?: string } })?.data?.message || 'Failed to add member');
    } finally {
      setAddLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!group) return;
    setLeaveLoading(true);
    try {
      await leaveGroupMutation(group._id).unwrap();
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message || 'Failed to leave group';
      setActionError(msg);
      setShowLeaveConfirm(false);
    } finally {
      setLeaveLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse flex flex-col gap-6">
          <div className="h-8 bg-[#2A2A2A] rounded w-1/3" />
          <div className="h-32 bg-[#1E1E1E] rounded-xl" />
          <div className="h-48 bg-[#1E1E1E] rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (isError || !group) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <p className="text-gray-400">Group not found or you are not a member.</p>
          <Link to="/dashboard" className="text-[#FF6800] text-sm no-underline hover:text-[#ff8533]">
            Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  const creatorId = typeof group.createdBy === 'object' ? group.createdBy?._id : group.createdBy;
  const isCreator = !!user && String(creatorId) === (user._id ?? user.id);
  const tournamentStatus = (group.tournament as any)?.status as keyof typeof statusConfig;
  const canEdit = isCreator && tournamentStatus === 'upcoming';
  const canLeave = !isCreator && tournamentStatus === 'upcoming';
  const { label, color } = statusConfig[tournamentStatus] ?? statusConfig.upcoming;
  const tournament = typeof group.tournament === 'object' ? group.tournament : null;
  const enabledCategories: Category[] = group.enabledCategories?.length
    ? group.enabledCategories
    : allCategories;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <Link to="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm no-underline flex items-center gap-1.5 w-fit transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>

        {/* Group header */}
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-white text-2xl font-bold">{group.name}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  group.visibility === 'public'
                    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    : 'text-gray-400 bg-gray-400/10 border-gray-400/20'
                }`}>
                  {group.visibility === 'public' ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                  {group.visibility === 'public' ? 'Public' : 'Private'}
                </span>
              </div>
              {group.description && <p className="text-gray-500 text-sm mt-1">{group.description}</p>}
              <p className="text-gray-600 text-xs mt-2">
                Created by <span className="text-gray-400">@{group.createdBy?.username}</span>
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {canEdit && !showEdit && (
                <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit Settings</Button>
              )}
              {canLeave && (
                <Button variant="secondary" onClick={() => setShowLeaveConfirm(true)}>Leave Group</Button>
              )}
            </div>
          </div>

          {tournament && (
            <div className="mt-5 pt-5 border-t border-[#2F2F2F] grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-600 text-xs mb-0.5">Tournament</p>
                <p className="text-gray-300 text-sm font-medium">{tournament.name}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs mb-0.5">Season</p>
                <p className="text-gray-300 text-sm font-medium">{tournament.season}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs mb-0.5">Members</p>
                <p className="text-gray-300 text-sm font-medium">{group.members.length} / {group.maxMembers}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs mb-0.5">Categories</p>
                <p className="text-gray-300 text-sm font-medium">{enabledCategories.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Edit panel */}
        {showEdit && (
          <EditPanel
            group={group}
            allCategories={allCategories}
            onClose={() => setShowEdit(false)}
          />
        )}

        {/* Invite section (admin only, only while tournament is upcoming) */}
        {isCreator && tournamentStatus === 'upcoming' && (
          <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 flex flex-col gap-4">
            <p className="text-gray-400 text-sm font-medium">Invite Members</p>

            {/* Invite code + copy buttons */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#111111] border border-[#2F2F2F] rounded-lg px-4 py-3 min-w-0">
                <span className="text-[#FF6800] font-mono text-xl font-bold tracking-[0.2em]">{group.inviteCode}</span>
              </div>
              <button
                onClick={handleCopyCode}
                className="bg-[#2A2A2A] hover:bg-[#333] border border-[#3A3A3A] text-gray-300 text-sm px-3 py-3 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer whitespace-nowrap"
              >
                {copied === 'code' ? (
                  <><svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="hidden sm:inline">Copied!</span></>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg><span className="hidden sm:inline">Code</span></>
                )}
              </button>
              <button
                onClick={handleCopyLink}
                className="bg-[#FF6800]/10 hover:bg-[#FF6800]/20 border border-[#FF6800]/20 text-[#FF6800] text-sm px-3 py-3 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer whitespace-nowrap"
              >
                {copied === 'link' ? (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="hidden sm:inline">Copied!</span></>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg><span className="hidden sm:inline">Link</span></>
                )}
              </button>
            </div>

            {/* Add by username */}
            <div className="border-t border-[#2A2A2A] pt-4 flex flex-col gap-2">
              <p className="text-gray-500 text-xs">Or add directly by username</p>
              <div className="flex gap-2">
                <input
                  value={addUsername}
                  onChange={(e) => { setAddUsername(e.target.value); setAddError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                  placeholder="@username"
                  className="flex-1 bg-[#111] border border-[#2F2F2F] focus:border-[#FF6800]/50 outline-none rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-colors"
                />
                <Button loading={addLoading} onClick={handleAddMember} disabled={!addUsername.trim()}>Add</Button>
              </div>
              {addError && <p className="text-red-400 text-xs">{addError}</p>}
            </div>
          </div>
        )}

        {/* Enabled categories */}
        {enabledCategories.length > 0 && (
          <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5">
            <p className="text-gray-400 text-sm font-medium mb-3">Prediction Categories ({enabledCategories.length})</p>
            <div className="flex flex-wrap gap-2">
              {enabledCategories.map((cat) => (
                <span key={cat._id} className="text-xs text-gray-300 bg-[#2A2A2A] border border-[#3A3A3A] px-2.5 py-1 rounded-full">
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to={`/groups/${group._id}/predictions`} className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 no-underline hover:border-[#FF6800]/40 hover:bg-[#242424] transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FF6800]/10 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🎯</div>
              <div>
                <p className="text-white font-semibold group-hover:text-[#FF6800] transition-colors">Tournament Predictions</p>
                <p className="text-gray-500 text-sm">Make or edit your picks</p>
              </div>
              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#FF6800] ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </Link>
          <Link to={`/groups/${group._id}/predictions/all`} className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 no-underline hover:border-[#FF6800]/40 hover:bg-[#242424] transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FF6800]/10 rounded-lg flex items-center justify-center text-xl flex-shrink-0">👥</div>
              <div>
                <p className="text-white font-semibold group-hover:text-[#FF6800] transition-colors">Member Predictions</p>
                <p className="text-gray-500 text-sm">
                  {tournamentStatus === 'upcoming' ? 'Revealed when tournament starts' : 'See everyone\'s picks'}
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#FF6800] ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </Link>
          {group.enableMatchPredictions && (
            <Link to={`/groups/${group._id}/matches`} className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 no-underline hover:border-[#FF6800]/40 hover:bg-[#242424] transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#FF6800]/10 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🏏</div>
                <div>
                  <p className="text-white font-semibold group-hover:text-[#FF6800] transition-colors">Match Day Predictions</p>
                  <p className="text-gray-500 text-sm">Predict each match's results</p>
                </div>
                <svg className="w-5 h-5 text-gray-600 group-hover:text-[#FF6800] ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>
          )}
          <Link to={`/groups/${group._id}/cards`} className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 no-underline hover:border-[#FF6800]/40 hover:bg-[#242424] transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FF6800]/10 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🃏</div>
              <div>
                <p className="text-white font-semibold group-hover:text-[#FF6800] transition-colors">Strategy Cards</p>
                <p className="text-gray-500 text-sm">
                  {tournamentStatus === 'live' ? 'Use swap or joker cards' : 'Swap & joker cards'}
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#FF6800] ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </Link>
          <Link to={`/groups/${group._id}/leaderboard`} className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 no-underline hover:border-[#FF6800]/40 hover:bg-[#242424] transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FF6800]/10 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🏆</div>
              <div>
                <p className="text-white font-semibold group-hover:text-[#FF6800] transition-colors">Leaderboard</p>
                <p className="text-gray-500 text-sm">See how everyone ranks</p>
              </div>
              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#FF6800] ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </Link>
        </div>

        {/* Members list */}
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5">
          <p className="text-gray-400 text-sm font-medium mb-4">Members ({group.members.length}/{group.maxMembers})</p>
          <div className="flex flex-col gap-2">
            {group.members.map((member: any) => {
              const isAdmin = String(member._id) === String(creatorId);
              const isMe = String(member._id) === user?.id;
              return (
                <div key={member._id} className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center text-sm font-bold text-gray-400 flex-shrink-0">
                      {member.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-gray-200 text-sm font-medium">
                        {member.name}
                        {isMe && <span className="text-gray-600 text-xs ml-1.5">(you)</span>}
                      </p>
                      <p className="text-gray-600 text-xs">@{member.username}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <span className="text-xs text-[#FF6800]/80 font-medium bg-[#FF6800]/10 border border-[#FF6800]/20 px-2 py-0.5 rounded-full">Admin</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Strategy card history — only relevant after tournament starts */}
        {tournamentId && (
          <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5">
            <p className="text-gray-400 text-sm font-medium mb-3">Strategy Card History</p>
            {cardsLoading ? (
              <div className="flex flex-col gap-2">{[1,2,3].map((n) => <div key={n} className="h-12 bg-[#2A2A2A] rounded-lg animate-pulse" />)}</div>
            ) : memberCards.length === 0 ? (
              <p className="text-gray-600 text-sm">No card data yet — cards are allocated when the tournament starts.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {memberCards.map((m) => <MemberCardHistory key={m._id} member={m} />)}
              </div>
            )}
          </div>
        )}

        {actionError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5">{actionError}</div>
        )}
      </div>

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLeaveConfirm(false)} />
          <div className="relative bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-6 w-full max-w-sm z-10">
            <h3 className="text-white font-semibold text-lg mb-2">Leave group?</h3>
            <p className="text-gray-500 text-sm mb-6">
              You'll need a new invite code to rejoin <span className="text-gray-300">{group.name}</span>.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setShowLeaveConfirm(false)}>Cancel</Button>
              <Button fullWidth loading={leaveLoading} onClick={handleLeave}>Leave</Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
