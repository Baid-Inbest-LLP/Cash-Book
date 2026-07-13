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

export const useExportMonthwiseExcel = () =>
  useMutation({
    mutationFn: async (params) => {
      const response = await reportsApi.monthwiseExportExcel(params);
      downloadBlobResponse(response, 'monthwise-report.xlsx');
    },
    onError: notifyExportError,
  });

export const useExportMonthwisePdf = () =>
  useMutation({
    mutationFn: async (params) => {
      const response = await reportsApi.monthwiseExportPdf(params);
      downloadBlobResponse(response, 'monthwise-report.pdf');
    },
    onError: notifyExportError,
  });

export const useExportExpenseHeadsExcel = () =>
  useMutation({
    mutationFn: async (params) => {
      const response = await reportsApi.expenseHeadsExportExcel(params);
      downloadBlobResponse(response, 'expense-head-report.xlsx');
    },
    onError: notifyExportError,
  });

export const useExportExpenseHeadsPdf = () =>
  useMutation({
    mutationFn: async (params) => {
      const response = await reportsApi.expenseHeadsExportPdf(params);
      downloadBlobResponse(response, 'expense-head-report.pdf');
    },
    onError: notifyExportError,
  });

export const useExportCompaniesExcel = () =>
  useMutation({
    mutationFn: async (params) => {
      const response = await reportsApi.companiesExportExcel(params);
      downloadBlobResponse(response, 'company-report.xlsx');
    },
    onError: notifyExportError,
  });

export const useExportCompaniesPdf = () =>
  useMutation({
    mutationFn: async (params) => {
      const response = await reportsApi.companiesExportPdf(params);
      downloadBlobResponse(response, 'company-report.pdf');
    },
    onError: notifyExportError,
  });
