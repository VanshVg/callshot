import { useState } from 'react';
import { Layout } from '../components/common/Layout';
import { Button } from '../components/common/Button';
import { GroupCard } from '../components/groups/GroupCard';
import { CreateGroupModal } from '../components/groups/CreateGroupModal';
import { JoinGroupModal } from '../components/groups/JoinGroupModal';
import { useAuth } from '../context/AuthContext';
import {
  useGetMyGroupsQuery,
  useGetPublicGroupsQuery,
  useJoinPublicGroupMutation,
} from '../store/api';
import type { Group } from '../types/index';

const SkeletonCard = () => (
  <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 animate-pulse">
    <div className="h-5 bg-[#2A2A2A] rounded w-2/3 mb-2" />
    <div className="h-3 bg-[#2A2A2A] rounded w-full mb-4" />
    <div className="h-3 bg-[#2A2A2A] rounded w-1/2" />
  </div>
);

type Tab = 'mine' | 'discover';

export const Dashboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('mine');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // RTK Query — auto-deduplicates, caches, no duplicate calls
  const { data: groups = [], isLoading } = useGetMyGroupsQuery();
  const { data: publicGroups = [], isLoading: discoverLoading } = useGetPublicGroupsQuery(undefined, {
    skip: tab !== 'discover',
  });
  const [joinPublicGroup] = useJoinPublicGroupMutation();

  const handleJoinPublic = async (group: Group) => {
    setJoiningId(group._id);
    try {
      await joinPublicGroup(group._id).unwrap();
      // RTK invalidates MyGroups + PublicGroups tags — lists update automatically
    } catch {
      // silently fail
    } finally {
      setJoiningId(null);
    }
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
              {tab === 'mine'
                ? groups.length > 0
                  ? `You're in ${groups.length} group${groups.length > 1 ? 's' : ''}`
                  : 'Create or join a group to get started'
                : 'Browse public groups you can join'}
            </p>
          </div>

          {!isLoading && tab === 'mine' && (
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

        {/* Tabs */}
        <div className="flex gap-1 bg-[#1A1A1A] border border-[#2F2F2F] rounded-xl p-1 w-fit">
          {(['mine', 'discover'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                tab === t ? 'bg-[#FF6800] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'mine' ? 'My Groups' : 'Discover'}
            </button>
          ))}
        </div>

        {/* My Groups tab */}
        {tab === 'mine' && (
          isLoading ? (
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
                <Button variant="secondary" onClick={() => setJoinOpen(true)}>Join Group</Button>
                <Button onClick={() => setCreateOpen(true)}>Create Group</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => <GroupCard key={group._id} group={group} />)}
            </div>
          )
        )}

        {/* Discover tab */}
        {tab === 'discover' && (
          discoverLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
            </div>
          ) : publicGroups.length === 0 ? (
            <div className="bg-[#1E1E1E] border border-[#2F2F2F] border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
              <div className="text-4xl">🔍</div>
              <p className="text-gray-300 font-semibold text-lg">No public groups</p>
              <p className="text-gray-500 text-sm max-w-xs">
                There are no public groups available right now. Check back later or create your own!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicGroups.map((group) => (
                <GroupCard
                  key={group._id}
                  group={group}
                  onJoin={handleJoinPublic}
                  joining={joiningId === group._id}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Mobile FAB */}
      {!isLoading && tab === 'mine' && groups.length > 0 && (
        <div className="sm:hidden fixed bottom-6 right-6 flex flex-col gap-2 items-end">
          <button
            onClick={() => setJoinOpen(true)}
            className="bg-[#2A2A2A] border border-[#3A3A3A] text-gray-300 text-sm font-medium px-4 py-2.5 rounded-full shadow-lg cursor-pointer"
          >
            Join Group
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-[#FF6800] hover:bg-[#e05e00] text-white text-sm font-bold px-5 py-3 rounded-full shadow-lg transition-colors cursor-pointer"
          >
            + Create
          </button>
        </div>
      )}

      {/* Modals — mutations inside them auto-invalidate the groups list */}
      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinGroupModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </Layout>
  );
};
