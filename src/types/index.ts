export interface User {
    id: number; 
    name: string;
    goal: string;
    role?: 'MEMBER' | 'ADMIN';
    profileImageUrl: string | null;
}

export interface ProfileUser {
  id: number;
  email: string;
  name: string;
  role: 'MEMBER' | 'ADMIN';
  goal: string | null;
  birthday: string | null;
  gender: string | null;
  weight: number | null;
  height: number | null;
  profileImageUrl: string | null;

  // AI가 생성한 목표 (JSON 문자열 형태)
  weeklyGoal: string | null;
  monthlyGoal: string | null;
}

export interface RoutineExercise {
  exerciseId: number;
  exerciseName: string;
  order: number;
}

export interface Routine {
  id: number;
  name: string;
  description: string | null;
  userId: number;         
  exercises: RoutineExercise[];
}

export interface Exercise {
  id: number;
  name: string;
  type: string | null;
  description: string | null;
  difficulty: string | null;
  posture: string | null;
  bodyPart: string | null;
  thumbnailUrl: string | null;
  url: string | null;
  liked?: boolean;
  likeCount?: number;
}

export interface AnalysisHistoryItem {
  id: number;
  createdAt: string; // 날짜
  // 각 부위별 점수
  spineCurvScore: number;
  spineScolScore: number;
  pelvicScore: number;
  neckScore: number;
  shoulderScore: number;
  // 추가: 진단, 차트, 이미지 등
  diagnosis?: string;
  radarChartUrl?: string;
  frontImageUrl?: string;
  sideImageUrl?: string;
  feedback?: Record<string, any>;
  measurements?: Record<string, any>;
  recommendedExercise?: Record<string, any>;

}
export interface ExerciseLog {
  // Response용 필드
  id?: number;
  createdAt?: string; // ISO 8601 형식의 날짜 문자열 (예: "2025-07-03T15:30:00")
  updatedAt?: string;
  useYn?: 'Y' | 'N';

  // Request/Response 공통 필드
  userId: number;
  exerciseDate: string; // "YYYY-MM-DD" 형식
  completionRate: number;
  memo: string;
  routineIds: number[];
  routineNames?: string[]; // BE에서 조회 시 채워주는 필드
}

// 사용자 작성 글
export interface UserPost {
  id: number;
  title: string;
  content: string;
  authorId: number;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  category: string;
}

// 사용자 작성 댓글
export interface UserComment {
  id: number;
  content: string;
  postId: number;
  postTitle: string;
  authorId: number;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

// 알림
export interface Notification {
  id: number;
  type: 'POST_COMMENT' | 'POST_LIKE' | 'COMMENT_REPLY' | 'COMMENT' | 'LIKE' | 'REPLY';
  message: string;
  referenceId?: number; // postId에 해당
  postTitle?: string;
  read: boolean; // isRead에 해당
  createdAt: string;
  updatedAt: string;
  senderId: number;
  senderName: string;
  userId: number;
  userName: string;
  useYn: 'Y' | 'N';
  
  // 호환성을 위한 계산된 속성들 (게터로 처리)
  title?: string;
  postId?: number;
  isRead?: boolean;
}


/** 감성의 종류 */
export type EmotionType = 'JOY' | 'SAD' | 'ANGER' | 'ANXIETY' | 'HATRED' | 'NEUTRAL';

/** * 감성 기록 데이터 전송 객체 (DTO) 인터페이스.
 * 백엔드의 EmotionLogDTO와 형식을 맞춥니다.
 */
export interface EmotionLogDTO {
  id: number;
  userId: number;
  exerciseDate: Date | string;
  emotion: EmotionType;
  memo: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** 획득한 뱃지 정보 */
export interface Badge {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  createdAt: string;
}

// AI가 설정한 목표의 구조를 정의합니다.
export interface Goal {
  workouts: number; // 목표 운동 횟수
  completion_rate: number; // AI가 예측한 달성률
}