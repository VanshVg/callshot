import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Category, Group, Tournament, Prediction, GroupPrediction, Notification } from '../types/index';

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
  tagTypes: ['MyGroups', 'Group', 'PublicGroups', 'Notification', 'Prediction'],
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

    getPublicGroups: builder.query<Group[], void>({
      query: () => '/groups/public',
      transformResponse: (res: { groups: Group[] }) => res.groups,
      providesTags: ['PublicGroups'],
    }),

    createGroup: builder.mutation<Group, {
      name: string; description: string; tournamentId: string;
      visibility: 'public' | 'private'; maxMembers: number; enabledCategories: string[];
    }>({
      query: (body) => ({ url: '/groups', method: 'POST', body }),
      transformResponse: (res: { group: Group }) => res.group,
      invalidatesTags: ['MyGroups'],
    }),

    updateGroup: builder.mutation<Group, { id: string; body: {
      name?: string; description?: string; visibility?: 'public' | 'private';
      maxMembers?: number; enabledCategories?: string[];
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

    // ── Tournaments ───────────────────────────────────────────────────────────

    getTournaments: builder.query<Tournament[], void>({
      query: () => '/tournaments',
      transformResponse: (res: { tournaments: Tournament[] }) => res.tournaments,
    }),

    getTournamentCategories: builder.query<Category[], string>({
      query: (id) => `/tournaments/${id}`,
      transformResponse: (res: { categories: Category[] }) => res.categories,
    }),

    getTournamentOptions: builder.query<{ players: string[]; teams: string[] }, string>({
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

  }),
});

export const {
  useGetMyGroupsQuery,
  useGetGroupQuery,
  useGetPublicGroupsQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useJoinGroupMutation,
  useJoinPublicGroupMutation,
  useLeaveGroupMutation,
  useGetTournamentsQuery,
  useGetTournamentCategoriesQuery,
  useGetTournamentOptionsQuery,
  useGetMyPredictionQuery,
  useGetGroupPredictionsQuery,
  useSubmitPredictionMutation,
  useGetNotificationsQuery,
  useMarkNotificationsReadMutation,
} = api;
