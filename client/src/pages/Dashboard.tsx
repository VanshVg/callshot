import { useState, useEffect } from 'react';
import { Layout } from '../components/common/Layout';
import { Button } from '../components/common/Button';
import { GroupCard } from '../components/groups/GroupCard';
import { CreateGroupModal } from '../components/groups/CreateGroupModal';
import { JoinGroupModal } from '../components/groups/JoinGroupModal';
import { useAuth } from '../context/AuthContext';
import { fetchMyGroups } from '../services/groups';
import type { Group } from '../types/index';

const SkeletonCard = () => (
  <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 animate-pulse">
    <div className="h-5 bg-[#2A2A2A] rounded w-2/3 mb-2" />
    <div className="h-3 bg-[#2A2A2A] rounded w-full mb-4" />
    <div className="h-3 bg-[#2A2A2A] rounded w-1/2" />
  </div>
);

export const Dashboard = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    fetchMyGroups()
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (group: Group) => {
    setGroups((prev) => [group, ...prev]);
  };

  const handleJoined = (group: Group) => {
    setGroups((prev) => {
      if (prev.find((g) => g._id === group._id)) return prev;
      return [group, ...prev];
    });
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-white text-2xl font-bold">
              Hey, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {groups.length > 0
                ? `You're in ${groups.length} group${groups.length > 1 ? 's' : ''}`
                : 'Create or join a group to get started'}
            </p>
          </div>

          {/* Desktop action buttons */}
          {!loading && groups.length > 0 && (
            <div className="hidden sm:flex gap-2 flex-shrink-0">
              <Button variant="secondary" onClick={() => setJoinOpen(true)}>
                Join Group
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                Create Group
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-[#1E1E1E] border border-[#2F2F2F] border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="text-4xl">🏏</div>
            <p className="text-gray-300 font-semibold text-lg">No groups yet</p>
            <p className="text-gray-500 text-sm max-w-xs">
              Create a group or join one with an invite code to start making predictions.
            </p>
            <div className="flex gap-3 mt-2">
              <Button variant="secondary" onClick={() => setJoinOpen(true)}>
                Join Group
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                Create Group
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <GroupCard key={group._id} group={group} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {!loading && groups.length > 0 && (
        <div className="sm:hidden fixed bottom-6 right-6 flex flex-col gap-2 items-end">
          <button
            onClick={() => setJoinOpen(true)}
            className="bg-[#2A2A2A] border border-[#3A3A3A] text-gray-300 text-sm font-medium px-4 py-2.5 rounded-full shadow-lg"
          >
            Join Group
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-[#FF6800] hover:bg-[#e05e00] text-white text-sm font-bold px-5 py-3 rounded-full shadow-lg transition-colors"
          >
            + Create
          </button>
        </div>
      )}

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <JoinGroupModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={handleJoined}
      />
    </Layout>
  );
};
