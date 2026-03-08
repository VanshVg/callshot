import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/common/Layout';
import { useGetGroupQuery, useGetGroupPredictionsQuery } from '../store/api';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const GroupPredictions = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: group, isLoading: groupLoading, isError } = useGetGroupQuery(groupId!);

  const tournamentId =
    group?.tournament && typeof group.tournament === 'object'
      ? group.tournament._id
      : (group?.tournament as string | undefined);

  const tournamentStatus =
    group?.tournament && typeof group.tournament === 'object'
      ? (group.tournament as { status: string }).status
      : null;

  const isRevealed = tournamentStatus === 'live' || tournamentStatus === 'completed';

  const { data: predictions = [], isLoading: predsLoading } = useGetGroupPredictionsQuery(
    { groupId: groupId!, tournamentId: tournamentId! },
    { skip: !tournamentId || !isRevealed },
  );

  const loading = groupLoading || (isRevealed && predsLoading);

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse flex flex-col gap-5">
          <div className="h-4 bg-[#2A2A2A] rounded w-20" />
          <div className="h-8 bg-[#2A2A2A] rounded w-1/3" />
          {[1, 2, 3].map((n) => <div key={n} className="h-20 bg-[#1E1E1E] rounded-xl" />)}
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
          <h1 className="text-white text-2xl font-bold">Member Predictions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tournament?.name}
            {isRevealed
              ? ` · ${predictions.length} submission${predictions.length !== 1 ? 's' : ''}`
              : ' · Picks are hidden until the tournament starts'}
          </p>
        </div>

        {/* Locked state */}
        {!isRevealed && (
          <div className="bg-[#1E1E1E] border border-[#2F2F2F] border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center gap-3">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-gray-300 font-semibold">Predictions are sealed</p>
            <p className="text-gray-500 text-sm max-w-xs">
              Everyone's picks will be revealed once the tournament goes live. No peeking!
            </p>
          </div>
        )}

        {/* No submissions yet */}
        {isRevealed && predictions.length === 0 && (
          <div className="bg-[#1E1E1E] border border-[#2F2F2F] border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-gray-300 font-semibold">No predictions submitted</p>
            <p className="text-gray-500 text-sm">No members submitted predictions for this tournament.</p>
          </div>
        )}

        {/* Prediction cards */}
        {isRevealed && predictions.map((pred) => {
          const isMe = pred.user._id === user?._id || pred.user._id === user?.id;
          const open = expanded === pred._id;

          return (
            <div
              key={pred._id}
              className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl overflow-hidden"
            >
              {/* Card header — click to expand */}
              <button
                onClick={() => setExpanded(open ? null : pred._id)}
                className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#242424] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#2A2A2A] flex items-center justify-center text-sm font-bold text-gray-400 flex-shrink-0">
                    {pred.user.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-gray-200 text-sm font-medium">
                      {pred.user.name}
                      {isMe && <span className="text-gray-500 text-xs ml-1.5">(you)</span>}
                    </p>
                    <p className="text-gray-600 text-xs">@{pred.user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs hidden sm:block">
                    {pred.picks.length} {pred.picks.length === 1 ? 'category' : 'categories'}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded picks */}
              {open && (
                <div className="border-t border-[#2A2A2A] px-5 py-4 flex flex-col gap-4">
                  {pred.picks.map((pick) => (
                    <div key={pick.category._id}>
                      <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
                        {pick.category.name}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {pick.selections.map((sel, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-2"
                          >
                            <span className="text-[#FF6800] text-xs font-bold w-7 shrink-0">
                              {ordinal(i + 1)}
                            </span>
                            <span className="text-gray-300 text-sm">{sel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
};
