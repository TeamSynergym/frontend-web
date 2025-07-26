import axiosInstance from '@/api/axiosInstance';
import type { AnalysisHistoryItem } from '@/types/index';

/**
 * ID로 특정 분석 기록의 상세 정보를 가져옵니다.
 * @param analysisId - 분석 기록 ID
 */
export const fetchAnalysisDetail = async (analysisId: number): Promise<AnalysisHistoryItem> => {
  const res = await axiosInstance.get(`/analysis-histories/${analysisId}`);
  return res.data;
};

/**
 * 특정 사용자의 전체 체형 분석 기록 목록을 가져옵니다.
 * @param userId - 기록을 조회할 사용자의 ID
 * @returns {Promise<AnalysisHistoryItem[]>} 사용자의 모든 분석 기록 배열을 포함하는 Promise
 */
export const getPostureAnalysisHistory = async (userId: number): Promise<AnalysisHistoryItem[]> => {
  try {
    const response = await axiosInstance.get(`/analysis-histories/user/${userId}`);
    // 데이터가 배열 형태가 아닐 경우를 대비하여 방어 코드 추가
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(`사용자(ID: ${userId})의 분석 기록을 불러오는 데 실패했습니다.`, error);
    // 에러 발생 시 빈 배열을 반환하여 앱의 비정상적인 종료를 방지
    return [];
  }
};

/**
 * Cloudinary URL을 이용해 분석을 요청합니다.
 * @param userId - 사용자 ID
 * @param imageUrl - Cloudinary 이미지 URL
 * @param mode - 분석 모드 (예: 'front', 'side')
 * @returns 분석 결과 DTO
 */
export const requestAnalysis = async (
  userId: number,
  imageUrl: string,
  mode: string
): Promise<AnalysisHistoryItem> => {
  console.log('requestAnalysis 호출됨', userId, imageUrl, mode);
  const res = await axiosInstance.post(`/analysis-histories/user/${userId}`, {
    imageUrl,
    mode
  });
  return res.data;
};

/**
 * 정면/측면 Cloudinary URL을 이용해 오각형 분석을 요청합니다.
 * @param userId - 사용자 ID (백엔드 저장용, merge API에는 직접 사용하지 않음)
 * @param frontImageUrl - 정면 Cloudinary 이미지 URL
 * @param sideImageUrl - 측면 Cloudinary 이미지 URL
 * @returns 분석 결과 DTO
 */
export const requestMergedAnalysis = async (
  userId: number,
  frontImageUrl: string,
  sideImageUrl: string
): Promise<any> => {
  // Spring 백엔드의 merge 분석 엔드포인트로 요청
  const res = await axiosInstance.post(`/analysis-histories/merge/user/${userId}`, {
    front_image_url: frontImageUrl,
    side_image_url: sideImageUrl
  });
  return res.data;
};

/**
 * 분석 기록을 삭제합니다.
 * @param analysisId - 삭제할 분석 기록 ID
 */
export const deleteAnalysisHistory = async (analysisId: number): Promise<void> => {
  await axiosInstance.delete(`/analysis-histories/${analysisId}`);
};

/**
 * 댓글 요약을 요청합니다.
 * @param userId - 사용자 ID
 * @param historyId - 분석 기록 ID
 * @param message - 사용자 메시지
 * @param videoUrl - YouTube 영상 URL
 */
export const requestCommentSummary = async (
  userId: number,
  historyId: number,
  message: string,
  videoUrl?: string
): Promise<any> => {
  const res = await axiosInstance.post('/chatbot/comment-summary', {
    userId,
    historyId,
    message,
    videoUrl
  });
  return res.data;
};