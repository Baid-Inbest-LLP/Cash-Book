import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { masterApi } from '../api/master.api';
import { queryKeys } from '../lib/queryKeys';

export const useUsers = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => (await masterApi.users()).data.data ?? [],
    enabled,
  });

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => (await masterApi.updateUser(id, data)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await masterApi.deleteUser(id);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });
};

export const useResetUserPassword = () =>
  useMutation({
    mutationFn: async (id) => (await masterApi.resetUserPassword(id)).data.data.password,
  });
