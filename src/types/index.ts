export interface User {
    id: number; 
    name: string;
    goal: string;
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
  category: string | null;
  description: string | null;
  difficulty: string | null;
  posture: string | null;
  bodyPart: string | null;
  thumbnailUrl: string | null;
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
  type: 'COMMENT' | 'LIKE' | 'REPLY';
  title: string;
  message: string;
  postId?: number;
  postTitle?: string;
  isRead: boolean;
  createdAt: string;
}