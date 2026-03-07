import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Button } from '../components/common/Button';
import { fetchGroup, leaveGroup } from '../services/groups';
import { useAuth } from '../context/AuthContext';
import type { Group } from '../types/index';

const statusConfig = {
  upcoming: { label: 'Upcoming', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  live: { label: 'Live', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  completed: { label: 'Completed', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
  draft: { label: 'Draft', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  active: { label: 'Active', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
};

export const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchGroup(id)
      .then(({ group }) => setGroup(group))
      .catch(() => setError('Group not found or you are not a member.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyCode = async () => {
    if (!group) return;
    await navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    if (!group) return;
    setLeaveLoading(true);
    try {
      await leaveGroup(group._id);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to leave group';
      setError(msg);
      setShowLeaveConfirm(false);
    } finally {
      setLeaveLoading(false);
    }
  };

  if (loading) {
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

  if (error || !group) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <p className="text-gray-400">{error || 'Group not found.'}</p>
          <Link to="/dashboard" className="text-[#FF6800] text-sm no-underline hover:text-[#ff8533]">
            Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  
  const creatorId = typeof group.createdBy === 'object' ? group.createdBy?._id : group.createdBy;
  
  const isCreator = !!user?._id && String(creatorId) === user._id;
  const tournamentStatus = (group.tournament as any)?.status as keyof typeof statusConfig;
  const { label, color } = statusConfig[tournamentStatus] ?? statusConfig.upcoming;
  const tournament = typeof group.tournament === 'object' ? group.tournament : null;
  
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Back link */}
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
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-white text-2xl font-bold">{group.name}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>
                  {label}
                </span>
              </div>
              {group.description && (
                <p className="text-gray-500 text-sm mt-1">{group.description}</p>
              )}
              <p className="text-gray-600 text-xs mt-2">
                Created by <span className="text-gray-400">@{group.createdBy?.username}</span>
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-shrink-0">
              {!isCreator && (
                <Button
                  variant="secondary"
                  onClick={() => setShowLeaveConfirm(true)}
                >
                  Leave Group
                </Button>
              )}
            </div>
          </div>

          {/* Tournament info */}
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
                <p className="text-gray-600 text-xs mb-0.5">Matches</p>
                <p className="text-gray-300 text-sm font-medium">{tournament.totalMatches}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs mb-0.5">Members</p>
                <p className="text-gray-300 text-sm font-medium">{group.members.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Invite code (admin only) */}
        {isCreator && (
          <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5">
            <p className="text-gray-400 text-sm font-medium mb-3">Invite Code</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#111111] border border-[#2F2F2F] rounded-lg px-4 py-3">
                <span className="text-[#FF6800] font-mono text-xl font-bold tracking-[0.2em]">
                  {group.inviteCode}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="bg-[#2A2A2A] hover:bg-[#333] border border-[#3A3A3A] text-gray-300 text-sm px-4 py-3 rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-2">Share this code with friends to invite them to your group.</p>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to={`/groups/${group._id}/predictions`}
            className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 no-underline hover:border-[#FF6800]/40 hover:bg-[#242424] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FF6800]/10 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                🎯
              </div>
              <div>
                <p className="text-white font-semibold group-hover:text-[#FF6800] transition-colors">My Predictions</p>
                <p className="text-gray-500 text-sm">Make or edit your picks</p>
              </div>
              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#FF6800] ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            to={`/groups/${group._id}/leaderboard`}
            className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 no-underline hover:border-[#FF6800]/40 hover:bg-[#242424] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FF6800]/10 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                🏆
              </div>
              <div>
                <p className="text-white font-semibold group-hover:text-[#FF6800] transition-colors">Leaderboard</p>
                <p className="text-gray-500 text-sm">See how everyone ranks</p>
              </div>
              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#FF6800] ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Members list */}
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5">
          <p className="text-gray-400 text-sm font-medium mb-4">
            Members ({group.members.length})
          </p>
          <div className="flex flex-col gap-2">
            {group.members.map((member: any) => {
              const isAdmin = member._id === group.createdBy?._id;
              const isMe = member._id === user?.id;
              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-0"
                >
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
                    <span className="text-xs text-[#FF6800]/80 font-medium bg-[#FF6800]/10 border border-[#FF6800]/20 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5">
            {error}
          </div>
        )}
      </div>

      {/* Leave confirm modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLeaveConfirm(false)} />
          <div className="relative bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-6 w-full max-w-sm z-10">
            <h3 className="text-white font-semibold text-lg mb-2">Leave group?</h3>
            <p className="text-gray-500 text-sm mb-6">
              You'll need a new invite code to rejoin <span className="text-gray-300">{group.name}</span>.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setShowLeaveConfirm(false)}>
                Cancel
              </Button>
              <Button fullWidth loading={leaveLoading} onClick={handleLeave}>
                Leave
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
