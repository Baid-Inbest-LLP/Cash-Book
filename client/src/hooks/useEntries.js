import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { entriesApi } from '../api/entry.api';
import { queryKeys } from '../lib/queryKeys';
import { downloadBlobResponse, notifyExportError } from '../utils/download';

export const useEntries = (params) =>
  useQuery({
    queryKey: queryKeys.entries(params),
    queryFn: async () => {
      const { data } = await entriesApi.getAll(params);
      return {
        entries: data.data?.entries ?? [],
        pagination: data.data?.pagination ?? { page: 1, pages: 1, total: 0, limit: 50 },
      };
    },
    placeholderData: keepPreviousData,
  });

const invalidateEntries = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ['entries'] });
};

export const useCreateReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await entriesApi.createReceipt(payload)).data,
    onSuccess: () => invalidateEntries(queryClient),
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await entriesApi.createPayment(payload)).data,
    onSuccess: () => invalidateEntries(queryClient),
  });
};

export const useUpdateEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => (await entriesApi.update(id, data)).data,
    onSuccess: () => invalidateEntries(queryClient),
  });
};

export const useExcludeEntries = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids) => (await entriesApi.exclude(ids)).data,
    onSuccess: () => invalidateEntries(queryClient),
  });
};

export const useRestoreEntries = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids) => (await entriesApi.restore(ids)).data,
    onSuccess: () => invalidateEntries(queryClient),
  });
};

export const useDeleteEntriesPermanent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids) => (await entriesApi.deletePermanent(ids)).data,
    onSuccess: () => invalidateEntries(queryClient),
  });
};

export const useExportEntries = () =>
  useMutation({
    mutationFn: async (params) => {
      const response = await entriesApi.export(params);
      downloadBlobResponse(response, 'entries-export.xlsx');
    },
    onError: notifyExportError,
  });
