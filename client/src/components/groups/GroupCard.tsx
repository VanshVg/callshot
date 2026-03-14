import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Group } from '../../types/index';
import { useAuth } from '../../context/AuthContext';

const statusConfig = {
  upcoming: { label: 'Upcoming', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  live: { label: 'Live', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  completed: { label: 'Completed', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
  draft: { label: 'Draft', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  active: { label: 'Active', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
};

interface Props {
  group: Group;
  onJoin?: (group: Group) => void;
  joining?: boolean;
}

export const GroupCard = ({ group, onJoin, joining }: Props) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  // createdBy can be a populated object { _id, name, username } or a raw ObjectId string
  const creatorId = typeof group.createdBy === 'object' ? group.createdBy?._id : group.createdBy;
  const isCreator = !!user?.id && String(creatorId) === user.id;

  const handleCopyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const copy = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(group.inviteCode).then(copy);
    } else {
      const el = document.createElement('textarea');
      el.value = group.inviteCode;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      copy();
    }
  };
  const tournamentStatus = (group.tournament as any)?.status as keyof typeof statusConfig;
  const groupStatus = group.status as keyof typeof statusConfig;
  const displayStatus = tournamentStatus || groupStatus;
  const { label, color } = statusConfig[displayStatus] ?? statusConfig.upcoming;
  const isFull = group.members.length >= group.maxMembers;

  console.log(group,"!!!!!!!!!!!!!!!")

  const cardBody = (
    <>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base truncate group-hover:text-[#FF6800] transition-colors">
            {group.name}
          </h3>
          {group.description && (
            <p className="text-gray-500 text-xs mt-0.5 truncate">{group.description}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>
          {label}
        </span>
      </div>

      {/* Tournament */}
      <div className="flex items-center gap-1.5 mb-4">
        <span className="text-lg">🏏</span>
        <span className="text-gray-400 text-sm">
          {typeof group.tournament === 'object' ? group.tournament.name : 'Tournament'}
        </span>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-gray-500 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{group.members.length}/{group.maxMembers} members</span>
        </div>

        {onJoin ? (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJoin(group); }}
            disabled={joining || isFull}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              isFull
                ? 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'
                : 'bg-[#FF6800] hover:bg-[#e05e00] text-white'
            }`}
          >
            {joining ? 'Joining…' : isFull ? 'Full' : 'Join'}
          </button>
        ) : isCreator ? (
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 text-xs cursor-pointer transition-colors hover:opacity-80"
            title="Copy invite code"
          >
            {copied ? (
              <>
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <span className="text-[#FF6800]/60">Admin</span>
                <span className="font-mono tracking-wider text-gray-600">{group.inviteCode}</span>
              </>
            )}
          </button>
        ) : null}
      </div>
    </>
  );

  if (onJoin) {
    return (
      <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 group">
        {cardBody}
      </div>
    );
  }

  return (
    <Link
      to={`/groups/${group._id}`}
      className="block bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 no-underline hover:border-[#FF6800]/40 hover:bg-[#242424] transition-all group"
    >
      {cardBody}
    </Link>
  );
};
