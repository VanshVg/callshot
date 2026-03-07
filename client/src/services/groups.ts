import api from './api';
import type { Group, Tournament } from '../types/index';

export const fetchMyGroups = async (): Promise<Group[]> => {
  const { data } = await api.get('/groups');
  return data.groups;
};

export const fetchGroup = async (id: string): Promise<{ group: Group }> => {
  const { data } = await api.get(`/groups/${id}`);
  return data;
};

export const createGroup = async (payload: { name: string; description: string; tournamentId: string }): Promise<Group> => {
  const { data } = await api.post('/groups', payload);
  return data.group;
};

export const joinGroup = async (inviteCode: string): Promise<Group> => {
  const { data } = await api.post('/groups/join', { inviteCode });
  return data.group;
};

export const leaveGroup = async (id: string): Promise<void> => {
  await api.delete(`/groups/${id}/leave`);
};

export const fetchTournaments = async (): Promise<Tournament[]> => {
  const { data } = await api.get('/tournaments');
  return data.tournaments;
};
