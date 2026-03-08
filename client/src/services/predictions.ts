import api from './api';
import type { Prediction } from '../types/index';

export const fetchMyPrediction = async (
  groupId: string,
  tournamentId: string,
): Promise<Prediction | null> => {
  try {
    const { data } = await api.get(`/predictions/${groupId}/${tournamentId}`);
    return data.prediction;
  } catch (err: unknown) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
};

export const submitPrediction = async (
  groupId: string,
  tournamentId: string,
  picks: { category: string; selections: string[] }[],
): Promise<Prediction> => {
  const { data } = await api.post('/predictions', { groupId, tournamentId, picks });
  return data.prediction;
};

export const fetchTournamentOptions = async (
  tournamentId: string,
): Promise<{ players: string[]; teams: string[] }> => {
  const { data } = await api.get(`/tournaments/${tournamentId}/options`);
  return data;
};
