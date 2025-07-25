import axiosInstance from '../../api/axiosInstance';
import type { ExerciseLog } from '../../types/index'; // 1번에서 만든 타입


/**
 * @description 사용자 ID와 날짜로 운동 기록 조회
 * @param userId 사용자 ID
 * @param date 'YYYY-MM-DD' 형식의 날짜 문자열
 */
export const getLogsByUserAndDate = async (userId: number, date: string): Promise<ExerciseLog[]> => {
  const response = await axiosInstance.get(`/logs/user/${userId}/date`, {
    params: { dateStr: date }, // BE의 @RequestParam("date")와 이름 일치
  });
  return response.data;
};

/**
 * @description 새로운 운동 기록 생성
 * @param logData 생성할 운동 기록 데이터
 */
export const createLog = async (logData: ExerciseLog): Promise<number> => {
  try {
    console.log('로그 생성 API 호출:', logData);
    const response = await axiosInstance.post('/logs', logData); // POST /api/logs
    console.log('로그 생성 API 성공, 생성된 ID:', response.data);
    return response.data; // 생성된 log_id 반환
  } catch (error) {
    console.error('로그 생성 API 실패:', error);
    throw error;
  }
};

/**
 * @description ID로 운동 기록 삭제
 * @param logId 삭제할 운동 기록 ID
 */
export const deleteLog = async (logId: number): Promise<void> => {
  if (!logId || logId <= 0) {
    console.warn('유효하지 않은 로그 ID:', logId);
    throw new Error('유효하지 않은 로그 ID입니다.');
  }
  
  try {
    await axiosInstance.delete(`/logs/${logId}`); // DELETE /api/logs/{id}
    console.log('로그 삭제 성공:', logId);
  } catch (error) {
    console.error('로그 삭제 실패:', logId, error);
    throw error;
  }
};

/**
 * @description 사용자 ID로 모든 운동 기록 조회
 * @param userId 사용자 ID
 */
export const getLogsByUser = async (userId: number): Promise<ExerciseLog[]> => {
    const response = await axiosInstance.get(`/logs/user/${userId}`); // GET /api/logs/user/{userId}
    return response.data;
}

/**
 * @description 기존 운동 기록의 달성률 등을 수정합니다. (PATCH /api/logs/{id})
 * @param logId 수정할 운동 기록의 ID
 * @param logData 수정할 데이터 (e.g., completionRate)
 */
export const updateLog = async (logId: number, logData: Partial<ExerciseLog>): Promise<void> => {
  await axiosInstance.patch(`/logs/${logId}`, logData);
};

/**
 * @description 운동 기록의 메모를 저장/수정합니다.
 * @param logId 운동 기록 ID
 * @param memo 저장할 메모
 */
export const updateMemo = async (logId: number, memo: string): Promise<void> => {
  try {
    console.log('메모 업데이트 API 호출:', { logId, memo });
    await axiosInstance.patch(`/logs/${logId}`, { memo });
    console.log('메모 업데이트 API 성공');
  } catch (error) {
    console.error('메모 업데이트 API 실패:', error);
    throw error;
  }
};