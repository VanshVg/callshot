import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Category, Group, Tournament, Prediction, GroupPrediction, Notification, Match, MatchPrediction, MatchPicks, LeaderboardEntry, ActualResult, StrategyCards, Sport } from '../types/index';

export interface AdminCardEntry {
  type: 'swap' | 'joker';
  used: boolean;
  usedAt: string | null;
  details: Record<string, unknown> | null;
}
export interface AdminMemberSummary {
  _id: string;
  name: string;
  username: string;
  cards: AdminCardEntry[];
}
export interface AdminGroupSummary {
  _id: string;
  name: string;
  members: AdminMemberSummary[];
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || '/api',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('accessToken');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['MyGroups', 'Group', 'PublicGroups', 'Notification', 'Prediction', 'Cards', 'Match', 'MatchPrediction', 'Leaderboard', 'ActualResult', 'AdminTournament', 'AdminCategory'],
  endpoints: (builder) => ({

    // ── Groups ────────────────────────────────────────────────────────────────

    getMyGroups: builder.query<Group[], void>({
      query: () => '/groups',
      transformResponse: (res: { groups: Group[] }) => res.groups,
      providesTags: ['MyGroups'],
    }),

    getGroup: builder.query<Group, string>({
      query: (id) => `/groups/${id}`,
      transformResponse: (res: { group: Group }) => res.group,
      providesTags: (_res, _err, id) => [{ type: 'Group', id }],
    }),

    getGroupMemberCards: builder.query<AdminMemberSummary[], { groupId: string; tournamentId: string }>({
      query: ({ groupId, tournamentId }) => `/groups/${groupId}/member-cards?tournamentId=${tournamentId}`,
      transformResponse: (res: { members: AdminMemberSummary[] }) => res.members,
    }),

    getPublicGroups: builder.query<Group[], void>({
      query: () => '/groups/public',
      transformResponse: (res: { groups: Group[] }) => res.groups,
      providesTags: ['PublicGroups'],
    }),

    createGroup: builder.mutation<Group, {
      name: string; description: string; tournamentId: string;
      visibility: 'public' | 'private'; maxMembers: number;
      enabledCategories: string[]; enableMatchPredictions: boolean;
    }>({
      query: (body) => ({ url: '/groups', method: 'POST', body }),
      transformResponse: (res: { group: Group }) => res.group,
      invalidatesTags: ['MyGroups'],
    }),

    updateGroup: builder.mutation<Group, { id: string; body: {
      name?: string; description?: string; visibility?: 'public' | 'private';
      maxMembers?: number; enabledCategories?: string[]; enableMatchPredictions?: boolean;
    } }>({
      query: ({ id, body }) => ({ url: `/groups/${id}`, method: 'PUT', body }),
      transformResponse: (res: { group: Group }) => res.group,
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Group', id }, 'MyGroups'],
    }),

    joinGroup: builder.mutation<Group, string>({
      query: (inviteCode) => ({ url: '/groups/join', method: 'POST', body: { inviteCode } }),
      transformResponse: (res: { group: Group }) => res.group,
      invalidatesTags: ['MyGroups'],
    }),

    joinPublicGroup: builder.mutation<Group, string>({
      query: (id) => ({ url: `/groups/${id}/join`, method: 'POST' }),
      transformResponse: (res: { group: Group }) => res.group,
      invalidatesTags: ['MyGroups', 'PublicGroups'],
    }),

    leaveGroup: builder.mutation<void, string>({
      query: (id) => ({ url: `/groups/${id}/leave`, method: 'DELETE' }),
      invalidatesTags: ['MyGroups'],
    }),

    addGroupMember: builder.mutation<Group, { id: string; username: string }>({
      query: ({ id, username }) => ({ url: `/groups/${id}/members`, method: 'POST', body: { username } }),
      transformResponse: (res: { group: Group }) => res.group,
      invalidatesTags: (_result, _err, arg) => [{ type: 'Group', id: arg.id }],
    }),

    // ── Tournaments ───────────────────────────────────────────────────────────

    getTournaments: builder.query<Tournament[], void>({
      query: () => '/tournaments',
      transformResponse: (res: { tournaments: Tournament[] }) => res.tournaments,
    }),

    getTournamentCategories: builder.query<Category[], string>({
      query: (id) => `/tournaments/${id}`,
      transformResponse: (res: { categories: Category[] }) => res.categories,
    }),

    getCategories: builder.query<Category[], Sport>({
      query: (sport) => `/categories?sport=${sport}`,
      transformResponse: (res: { categories: Category[] }) => res.categories,
    }),

    getTournamentOptions: builder.query<{ players: string[]; teams: string[]; squads: Record<string, string[]> }, string>({
      query: (id) => `/tournaments/${id}/options`,
    }),

    // ── Predictions ───────────────────────────────────────────────────────────

    getMyPrediction: builder.query<Prediction | null, { groupId: string; tournamentId: string }>({
      queryFn: async ({ groupId, tournamentId }, _api, _extra, baseQuery) => {
        const result = await baseQuery(`/predictions/${groupId}/${tournamentId}`);
        if (result.error) {
          if ((result.error as { status: number }).status === 404) return { data: null };
          return { error: result.error };
        }
        return { data: (result.data as { prediction: Prediction }).prediction };
      },
      providesTags: (_res, _err, { groupId, tournamentId }) => [
        { type: 'Prediction', id: `${groupId}-${tournamentId}` },
      ],
    }),

    getGroupPredictions: builder.query<GroupPrediction[], { groupId: string; tournamentId: string }>({
      query: ({ groupId, tournamentId }) => `/predictions/${groupId}/${tournamentId}/all`,
      transformResponse: (res: { predictions: GroupPrediction[] }) => res.predictions,
    }),

    getSubmissionStatus: builder.query<{
      status: { userId: string; name: string; username: string; submitted: boolean }[];
      totalMembers: number;
      submitted: number;
    }, string>({
      query: (groupId) => `/predictions/${groupId}/submission-status`,
      providesTags: (_res, _err, groupId) => [{ type: 'Prediction', id: `status-${groupId}` }],
    }),

    submitPrediction: builder.mutation<Prediction, {
      groupId: string; tournamentId: string;
      picks: { category: string; selections: string[] }[];
    }>({
      query: ({ groupId, tournamentId, picks }) => ({
        url: '/predictions',
        method: 'POST',
        body: { groupId, tournamentId, picks },
      }),
      transformResponse: (res: { prediction: Prediction }) => res.prediction,
      invalidatesTags: (_res, _err, { groupId, tournamentId }) => [
        { type: 'Prediction', id: `${groupId}-${tournamentId}` },
      ],
    }),

    // ── Strategy Cards ────────────────────────────────────────────────────────

    getMyCards: builder.query<StrategyCards | null, { groupId: string; tournamentId: string }>({
      queryFn: async ({ groupId, tournamentId }, _api, _extra, baseQuery) => {
        const result = await baseQuery(`/cards/${groupId}/${tournamentId}`);
        if (result.error) {
          if ((result.error as { status: number }).status === 404) return { data: null };
          return { error: result.error };
        }
        return { data: (result.data as { cards: StrategyCards }).cards };
      },
      providesTags: (_res, _err, { groupId, tournamentId }) => [
        { type: 'Cards', id: `${groupId}-${tournamentId}` },
      ],
    }),

    swapCard: builder.mutation<{ prediction: Prediction; cards: StrategyCards }, {
      groupId: string; tournamentId: string;
      categoryId: string; oldSelection: string; newSelection: string;
    }>({
      query: (body) => ({ url: '/cards/swap', method: 'POST', body }),
      invalidatesTags: (_res, _err, { groupId, tournamentId }) => [
        { type: 'Cards', id: `${groupId}-${tournamentId}` },
        { type: 'Prediction', id: `${groupId}-${tournamentId}` },
      ],
    }),

    jokerCard: builder.mutation<{ cards: StrategyCards }, {
      groupId: string; tournamentId: string;
      categoryId: string; player: string; predictedPosition: number;
    }>({
      query: (body) => ({ url: '/cards/joker', method: 'POST', body }),
      invalidatesTags: (_res, _err, { groupId, tournamentId }) => [
        { type: 'Cards', id: `${groupId}-${tournamentId}` },
      ],
    }),

    // ── Notifications ─────────────────────────────────────────────────────────

    getNotifications: builder.query<Notification[], void>({
      query: () => '/notifications',
      transformResponse: (res: { notifications: Notification[] }) => res.notifications,
      providesTags: ['Notification'],
    }),

    markNotificationsRead: builder.mutation<void, void>({
      query: () => ({ url: '/notifications/read', method: 'PUT' }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          api.util.updateQueryData('getNotifications', undefined, (draft) => {
            draft.forEach((n) => { n.read = true; });
          })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
    }),

    // ── Matches ───────────────────────────────────────────────────────────────

    getMatches: builder.query<Match[], string>({
      query: (tournamentId) => `/matches?tournamentId=${tournamentId}`,
      transformResponse: (res: { matches: Match[] }) => res.matches,
      providesTags: ['Match'],
    }),

    createMatch: builder.mutation<Match, {
      tournamentId: string; matchNumber: number; teamA: string; teamB: string;
      venue?: string; scheduledAt: string;
    }>({
      query: (body) => ({ url: '/matches', method: 'POST', body }),
      transformResponse: (res: { match: Match }) => res.match,
      invalidatesTags: ['Match'],
    }),

    updateMatch: builder.mutation<Match, { id: string; body: {
      status?: 'upcoming' | 'live' | 'completed';
      teamA?: string; teamB?: string; venue?: string; scheduledAt?: string;
      result?: {
        winner?: string; topBatter?: string[]; topBowler?: string[];
        playerOfMatch?: string[]; powerplayScoreA?: number; powerplayScoreB?: number;
      };
    } }>({
      query: ({ id, body }) => ({ url: `/matches/${id}`, method: 'PUT', body }),
      transformResponse: (res: { match: Match }) => res.match,
      invalidatesTags: ['Match', 'MatchPrediction'],
    }),

    getMyMatchPrediction: builder.query<MatchPrediction | null, { matchId: string; groupId: string }>({
      queryFn: async ({ matchId, groupId }, _api, _extra, baseQuery) => {
        const result = await baseQuery(`/matches/${matchId}/my-prediction?groupId=${groupId}`);
        if (result.error) {
          if ((result.error as { status: number }).status === 404) return { data: null };
          return { error: result.error };
        }
        return { data: (result.data as { prediction: MatchPrediction }).prediction };
      },
      providesTags: (_res, _err, { matchId, groupId }) => [
        { type: 'MatchPrediction', id: `${matchId}-${groupId}` },
      ],
    }),

    submitMatchPrediction: builder.mutation<MatchPrediction, {
      matchId: string; groupId: string; picks: MatchPicks;
    }>({
      query: ({ matchId, groupId, picks }) => ({
        url: `/matches/${matchId}/predict`,
        method: 'POST',
        body: { groupId, picks },
      }),
      transformResponse: (res: { prediction: MatchPrediction }) => res.prediction,
      invalidatesTags: (_res, _err, { matchId, groupId }) => [
        { type: 'MatchPrediction', id: `${matchId}-${groupId}` },
      ],
    }),

    getMatchPredictions: builder.query<MatchPrediction[], { matchId: string; groupId: string }>({
      query: ({ matchId, groupId }) => `/matches/${matchId}/predictions?groupId=${groupId}`,
      transformResponse: (res: { predictions: MatchPrediction[] }) => res.predictions,
      providesTags: (_res, _err, { matchId }) => [{ type: 'MatchPrediction', id: matchId }],
    }),

    // ── Leaderboard ───────────────────────────────────────────────────────────

    getLeaderboard: builder.query<{
      standings: LeaderboardEntry[];
      totalParticipants: number;
      predictionsSubmitted: number;
    }, { groupId: string; tournamentId: string }>({
      query: ({ groupId, tournamentId }) => `/leaderboard/${groupId}/${tournamentId}`,
      providesTags: ['Leaderboard'],
    }),

    // ── Admin ─────────────────────────────────────────────────────────────────

    getAdminCategories: builder.query<Category[], string>({
      query: (sport) => `/admin/categories?sport=${sport}`,
      transformResponse: (res: { categories: Category[] }) => res.categories,
      providesTags: ['AdminCategory'],
    }),

    updateAdminCategory: builder.mutation<Category, { id: string; body: {
      name?: string; description?: string;
      type?: 'player_stat' | 'team_position' | 'single_player';
      selectionCount?: number; scoringType?: 'positional' | 'exact_match'; order?: number;
    } }>({
      query: ({ id, body }) => ({ url: `/admin/categories/${id}`, method: 'PUT', body }),
      transformResponse: (res: { category: Category }) => res.category,
      invalidatesTags: ['AdminCategory'],
    }),

    getAdminTournaments: builder.query<Tournament[], void>({
      query: () => '/admin/tournaments',
      transformResponse: (res: { tournaments: Tournament[] }) => res.tournaments,
      providesTags: ['AdminTournament'],
    }),

    createAdminTournament: builder.mutation<Tournament, {
      name: string; sport?: string; type: string; season: string;
      totalMatches: number; startDate: string; endDate: string;
    }>({
      query: (body) => ({ url: '/admin/tournaments', method: 'POST', body }),
      transformResponse: (res: { tournament: Tournament }) => res.tournament,
      invalidatesTags: ['AdminTournament'],
    }),

    updateAdminTournament: builder.mutation<Tournament, { id: string; body: {
      name?: string; sport?: string; type?: string; season?: string;
      totalMatches?: number; startDate?: string; endDate?: string; cardsEnabled?: boolean;
    } }>({
      query: ({ id, body }) => ({ url: `/admin/tournaments/${id}`, method: 'PUT', body }),
      transformResponse: (res: { tournament: Tournament }) => res.tournament,
      invalidatesTags: ['AdminTournament'],
    }),

    deleteAdminTournament: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/tournaments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminTournament'],
    }),

    updateTournamentSquads: builder.mutation<Tournament, { id: string; teams: string[]; squads: Record<string, string[]> }>({
      query: ({ id, teams, squads }) => ({ url: `/admin/tournaments/${id}/squads`, method: 'PUT', body: { teams, squads } }),
      transformResponse: (res: { tournament: Tournament }) => res.tournament,
      invalidatesTags: ['AdminTournament'],
    }),

    createAdminMatch: builder.mutation<Match, {
      tournamentId: string; matchNumber: number; teamA: string; teamB: string;
      venue?: string; scheduledAt: string;
    }>({
      query: (body) => ({ url: '/admin/matches', method: 'POST', body }),
      transformResponse: (res: { match: Match }) => res.match,
      invalidatesTags: ['Match'],
    }),

    bulkCreateMatches: builder.mutation<{ count: number }, {
      tournamentId: string;
      matches: { matchNumber: number; teamA: string; teamB: string; venue?: string; scheduledAt: string }[];
    }>({
      query: (body) => ({ url: '/admin/matches/bulk', method: 'POST', body }),
      invalidatesTags: ['Match'],
    }),

    deleteAdminMatch: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/matches/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Match'],
    }),

    getAdminResults: builder.query<ActualResult[], string>({
      query: (tournamentId) => `/admin/results/${tournamentId}`,
      transformResponse: (res: { results: ActualResult[] }) => res.results,
      providesTags: ['ActualResult'],
    }),

    setTournamentStatus: builder.mutation<void, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/admin/tournaments/${id}/status`, method: 'PUT', body: { status } }),
    }),

    setActualResult: builder.mutation<void, { tournamentId: string; categoryId: string; rankings: { position: number; name: string }[] }>({
      query: (body) => ({ url: '/admin/results', method: 'POST', body }),
      invalidatesTags: ['ActualResult', 'Leaderboard'],
    }),

  }),
});

export const {
  useGetCategoriesQuery,
  useGetMyCardsQuery,
  useSwapCardMutation,
  useJokerCardMutation,
  useGetMyGroupsQuery,
  useGetGroupQuery,
  useGetPublicGroupsQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useJoinGroupMutation,
  useJoinPublicGroupMutation,
  useLeaveGroupMutation,
  useAddGroupMemberMutation,
  useGetTournamentsQuery,
  useGetTournamentCategoriesQuery,
  useGetTournamentOptionsQuery,
  useGetMyPredictionQuery,
  useGetGroupPredictionsQuery,
  useGetSubmissionStatusQuery,
  useSubmitPredictionMutation,
  useGetNotificationsQuery,
  useMarkNotificationsReadMutation,
  useGetMatchesQuery,
  useCreateMatchMutation,
  useUpdateMatchMutation,
  useGetMyMatchPredictionQuery,
  useSubmitMatchPredictionMutation,
  useGetMatchPredictionsQuery,
  useGetLeaderboardQuery,
  useGetGroupMemberCardsQuery,
  useGetAdminCategoriesQuery,
  useUpdateAdminCategoryMutation,
  useGetAdminTournamentsQuery,
  useGetAdminResultsQuery,
  useSetTournamentStatusMutation,
  useSetActualResultMutation,
  useCreateAdminTournamentMutation,
  useUpdateAdminTournamentMutation,
  useDeleteAdminTournamentMutation,
  useUpdateTournamentSquadsMutation,
  useCreateAdminMatchMutation,
  useBulkCreateMatchesMutation,
  useDeleteAdminMatchMutation,
} = api;
