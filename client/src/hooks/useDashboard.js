import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';
import { queryKeys } from '../lib/queryKeys';

export const useExpenseByCompany = (params) =>
  useQuery({
    queryKey: queryKeys.expenseByCompany(params),
    queryFn: async () => (await dashboardApi.expenseByCompany(params)).data.data,
  });

export const useExpenseByExpenseHead = (params) =>
  useQuery({
    queryKey: queryKeys.expenseByExpenseHead(params),
    queryFn: async () => (await dashboardApi.expenseByExpenseHead(params)).data.data,
  });

export const useExpenseByMonth = (params) =>
  useQuery({
    queryKey: queryKeys.expenseByMonth(params),
    queryFn: async () => (await dashboardApi.expenseByMonth(params)).data.data,
  });
