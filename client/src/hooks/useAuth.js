import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { queryKeys } from '../lib/queryKeys';
import { clearSession, getStoredUser, isAuthenticated, saveSession } from '../lib/session';

// The authenticated user. Source of truth for `user` across the app.
export const useMe = () =>
  useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => (await authApi.getMe()).data.data,
    enabled: isAuthenticated(),
    initialData: getStoredUser() ?? undefined,
    staleTime: 5 * 60 * 1000,
  });

// The current user's uploaded profile photo (data URI). Only fetched when the user has one.
export const useAvatar = () => {
  const { data: user } = useMe();
  return useQuery({
    queryKey: queryKeys.avatar,
    queryFn: async () => (await authApi.getAvatar()).data.data?.avatarPreview || '',
    enabled: isAuthenticated() && Boolean(user?.hasAvatar),
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await authApi.updateProfile(payload)).data.data,
    onSuccess: ({ user, avatarPreview }) => {
      saveSession({ user });
      queryClient.setQueryData(queryKeys.me, user);
      queryClient.setQueryData(queryKeys.avatar, avatarPreview || '');
    },
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials) => (await authApi.login(credentials)).data.data,
    onSuccess: (data) => {
      saveSession(data);
      queryClient.setQueryData(queryKeys.me, data.user);
      queryClient.setQueryData(queryKeys.avatar, '');
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        /* best-effort: clear the local session even if the call fails */
      }
    },
    onSuccess: () => {
      clearSession();
      queryClient.clear();
    },
  });
};

export const useRegister = () =>
  useMutation({ mutationFn: async (data) => (await authApi.register(data)).data.data });

export const useChangePassword = () =>
  useMutation({ mutationFn: async (data) => (await authApi.changePassword(data)).data });
