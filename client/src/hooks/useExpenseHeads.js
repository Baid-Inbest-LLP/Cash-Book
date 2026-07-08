import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expenseHeadsApi } from '../api/expenseHead.api';
import { queryKeys } from '../lib/queryKeys';

export const useExpenseHeads = (params) =>
  useQuery({
    queryKey: queryKeys.expenseHeads(params),
    queryFn: async () => {
      const { data } = await expenseHeadsApi.getAll(params);
      return {
        expenseHeads: data.data ?? [],
        pagination: data.pagination ?? { page: 1, pages: 1, total: data.data?.length ?? 0 },
      };
    },
    placeholderData: keepPreviousData,
  });

const invalidateExpenseHeads = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ['expenseHeads'] });
};

export const useCreateExpenseHead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await expenseHeadsApi.create(payload)).data,
    onSuccess: () => invalidateExpenseHeads(queryClient),
  });
};

export const useUpdateExpenseHead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => (await expenseHeadsApi.update(id, data)).data,
    onSuccess: () => invalidateExpenseHeads(queryClient),
  });
};

export const useDeleteExpenseHead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await expenseHeadsApi.delete(id);
      return id;
    },
    onSuccess: () => invalidateExpenseHeads(queryClient),
  });
};
