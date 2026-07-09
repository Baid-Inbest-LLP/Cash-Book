import { useMutation, useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/report.api';
import { queryKeys } from '../lib/queryKeys';
import { downloadBlobResponse, notifyExportError } from '../utils/download';

export const useMonthwiseReport = (params) =>
  useQuery({
    queryKey: queryKeys.monthwiseReport(params),
    queryFn: async () => (await reportsApi.monthwise(params)).data.data,
  });

export const useExpenseHeadReport = (params) =>
  useQuery({
    queryKey: queryKeys.expenseHeadReport(params),
    queryFn: async () => (await reportsApi.expenseHeads(params)).data.data,
  });

export const useCompanyReport = (params) =>
  useQuery({
    queryKey: queryKeys.companyReport(params),
    queryFn: async () => (await reportsApi.companies(params)).data.data,
  });

export const useExportMonthwise = () =>
  useMutation({
    mutationFn: async (params) => {
      const response = await reportsApi.monthwiseExport(params);
      downloadBlobResponse(response, 'monthwise-report.xlsx');
    },
    onError: notifyExportError,
  });

export const useExportExpenseHeads = () =>
  useMutation({
    mutationFn: async (params) => {
      const response = await reportsApi.expenseHeadsExport(params);
      downloadBlobResponse(response, 'expense-head-report.xlsx');
    },
    onError: notifyExportError,
  });

export const useExportCompanies = () =>
  useMutation({
    mutationFn: async (params) => {
      const response = await reportsApi.companiesExport(params);
      downloadBlobResponse(response, 'company-report.xlsx');
    },
    onError: notifyExportError,
  });
