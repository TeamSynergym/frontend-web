import axiosInstance from '@/api/axiosInstance';
import type { AnalysisHistoryItem } from '@/types/index';

export const fetchAnalysisDetail = async (analysisId: number): Promise<AnalysisHistoryItem> => {
  const res = await axiosInstance.get(`/analysis-histories/${analysisId}`);
  return res.data;
}; 