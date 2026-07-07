import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { masterApi } from '../api/master.api';
import { queryKeys } from '../lib/queryKeys';

// Dropdown data (companies, locations, roles, months, quarters).
export const useLookups = () =>
  useQuery({
    queryKey: queryKeys.lookups,
    queryFn: async () => (await masterApi.lookups()).data.data,
    staleTime: 5 * 60 * 1000,
  });

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
