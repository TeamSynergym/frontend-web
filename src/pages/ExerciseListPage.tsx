import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Exercise, Routine, ProfileUser } from '@/types/index';
import type { RecommendationPayload } from '@/types/recommendation';
import { useUserStore } from '@/store/userStore';
import Header from '@/components/common/Header';
import ExerciseFilter from '@/components/exercise/ExerciseFilter'; // Redesigned Component
import ExerciseGrid from '@/components/exercise/ExerciseGrid'; // Redesigned Component
import AddToRoutineModal from '@/components/exercise/AddToRoutineModal'; // Redesigned Component
import RecommendedExercises from '@/components/exercise/RecommendedExercises'; // Redesigned Component
import RecommendedExercisesLoader from '@/components/exercise/RecommendedExercisesLoader'; // Redesigned Component
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"; // Will be restyled via className
import {
  fetchAllExercises,
  fetchUserLikes,
  fetchUserRoutines,
  addLikeApi,
  removeLikeApi,
  addExerciseToRoutineApi,
  fetchExerciseRecommendations,
} from '@/services/api/exerciseApi';
import { useRequireAuth } from "../hooks/useRequireAuth";
import { getLogsByUser } from '@/services/api/exerciseLogApi';
import { getPostureAnalysisHistory } from '@/services/api/analysisApi';
import { Bot } from 'lucide-react';

const CATEGORIES = ["전체", "전신", "다리", "옆구리", "허리", "허벅지", "엉덩이", "종아리", "팔", "가슴", "등", "어깨", "복부"] as const;
const EXERCISES_PER_PAGE = 12;

const ExerciseListPage: React.FC = () => {
  useRequireAuth("/exercises");

  const { user } = useUserStore();
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [likedExerciseIds, setLikedExerciseIds] = useState<Set<number>>(new Set());
  const [userRoutines, setUserRoutines] = useState<Routine[]>([]);

  const [recommendationData, setRecommendationData] = useState<{ exercises: Exercise[]; reason: string } | null>(null);
  const [isRecLoading, setIsRecLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>('전체');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exercisePage, setExercisePage] = useState(0);

  const hasFetched = useRef<Record<number, boolean>>({});

  useEffect(() => {
    // ... (Data fetching logic is preserved)
    if (!user?.id) {
      setIsLoading(false);
      setIsRecLoading(false);
      return;
    }

    if (hasFetched.current[user.id]) {
      return;
    }

    const loadAllData = async () => {
      hasFetched.current[user.id] = true;
      setIsLoading(true);
      setIsRecLoading(true);
      
      try {
        const [exercisesData, likesData, routinesData] = await Promise.all([
          fetchAllExercises(),
          fetchUserLikes(user.id),
          fetchUserRoutines(user.id),
        ]);
        
        setAllExercises(exercisesData);
        setLikedExerciseIds(new Set<number>((likesData as { exerciseId: number }[]).map((like: { exerciseId: number }) => like.exerciseId)));
        setUserRoutines(routinesData);
        setIsLoading(false);

        const recommendationKey = `ai_recommendations_${user.id}`;
        const timestampKey = `ai_recommendations_timestamp_${user.id}`;
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        const cachedRecs = localStorage.getItem(recommendationKey);
        const cachedTimestamp = localStorage.getItem(timestampKey);

        if (cachedRecs && cachedTimestamp && now - Number(cachedTimestamp) < oneDay) {
          setRecommendationData(JSON.parse(cachedRecs));
        } else {
          const postureHistory = await getPostureAnalysisHistory(user.id);
          const latestAnalysis = postureHistory.length > 0 ? postureHistory[0] : {};
          const exerciseHistory = await getLogsByUser(user.id);

          const payload: RecommendationPayload = {
            user_id: String(user.id),
            user_profile: user as ProfileUser,
            posture_analysis: latestAnalysis,
            exercise_history: exerciseHistory,
            liked_exercises: likesData,
            user_routines: routinesData,
          };

          const recResponse = await fetchExerciseRecommendations(payload);

          if (recResponse && recResponse.recommendations?.length > 0) {
            const enrichedRecommendations = recResponse.recommendations
              .map((recEx) => exercisesData.find((fullEx: Exercise) => fullEx.name === recEx.name))
              .filter(Boolean) as Exercise[];

            if (enrichedRecommendations.length > 0) {
              const newRecData = {
                exercises: enrichedRecommendations,
                reason: recResponse.reason,
              };
              setRecommendationData(newRecData);
              localStorage.setItem(recommendationKey, JSON.stringify(newRecData));
              localStorage.setItem(timestampKey, String(now));
            }
          }
        }
      } catch (error) {
        console.error("데이터 로딩 중 오류 발생:", error);
        setIsLoading(false);
      } finally {
        setIsRecLoading(false);
      }
    };

    loadAllData();
  }, [user]);

  // ... (Handler logic is preserved)
  const handleLikeToggle = async (exerciseId: number) => {
    if (!user?.id) return;
    const isLiked = likedExerciseIds.has(exerciseId);
    try {
      const api = isLiked ? removeLikeApi : addLikeApi;
      await api(user.id, exerciseId);
      setLikedExerciseIds((prev) => {
        const newSet = new Set(prev);
        isLiked ? newSet.delete(exerciseId) : newSet.add(exerciseId);
        return newSet;
      });
    } catch (error) {
      console.error("좋아요 처리 실패:", error);
    }
  };

  const handleOpenAddToRoutine = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsModalOpen(true);
  };

  const handleSelectRoutine = async (routineId: number) => {
    if (!selectedExercise || !user?.id) return;
    try {
      await addExerciseToRoutineApi(routineId, selectedExercise.id);
      alert(`'${selectedExercise.name}' 운동을 루틴에 추가했습니다.`);
      setIsModalOpen(false);
      setSelectedExercise(null);
    } catch (error) {
      console.error("루틴에 운동 추가 실패:", error);
      alert("운동 추가에 실패했습니다.");
    }
  };


  const filteredExercises = useMemo(() => {
    return allExercises.filter((ex) => {
      const matchesCategory = selectedCategory === '전체' || ex.bodyPart === selectedCategory;
      const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allExercises, selectedCategory, searchTerm]);

  useEffect(() => {
    setExercisePage(0);
  }, [searchTerm, selectedCategory]);

  const totalExercisePages = Math.ceil(filteredExercises.length / EXERCISES_PER_PAGE);
  const paginatedExercises = useMemo(() => {
    const startIndex = exercisePage * EXERCISES_PER_PAGE;
    return filteredExercises.slice(startIndex, startIndex + EXERCISES_PER_PAGE);
  }, [filteredExercises, exercisePage]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-screen bg-background text-foreground">페이지 로딩 중...</div>;
  }

  return (
    <div className="bg-slate-50 dark:bg-toss-navy/20 min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background dark:bg-toss-navy/80 rounded-2xl shadow-md" style={{ paddingTop: 'var(--header-height, 100px)' }}>
        <div className="mb-10">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">운동 둘러보기</h1>
            <p className="mt-2 text-lg text-toss-gray">나에게 맞는 운동을 찾아보고 루틴에 추가해 보세요.</p>
        </div>

        {isRecLoading ? (
          <RecommendedExercisesLoader />
        ) : recommendationData && recommendationData.exercises.length > 0 ? (
          <RecommendedExercises recommendedData={recommendationData} />
        ) : (
          <div className="text-center py-12 px-6 bg-background dark:bg-toss-navy/30 rounded-2xl mb-12">
            <Bot className="mx-auto h-12 w-12 text-toss-gray" />
            <p className="mt-4 font-semibold text-slate-700 dark:text-white">AI 추천을 준비 중입니다</p>
            <p className="mt-1 text-sm text-toss-gray">운동 기록이 쌓이면 더 정확한 추천을 받을 수 있어요.</p>
          </div>
        )}

        <div className="mt-12">
            <ExerciseFilter
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                selectedCategory={selectedCategory}
                onCategorySelect={(category) => setSelectedCategory(category as (typeof CATEGORIES)[number])}
                categories={CATEGORIES}
            />

            <ExerciseGrid
                exercises={paginatedExercises}
                likedExerciseIds={likedExerciseIds}
                onLikeToggle={handleLikeToggle}
                onAddToRoutine={handleOpenAddToRoutine}
            />
        </div>

        {totalExercisePages > 1 && (
          <div className="mt-12 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); setExercisePage((prev) => Math.max(0, prev - 1)); }}
                    className={exercisePage === 0 ? "pointer-events-none text-slate-400 dark:text-slate-600" : "hover:bg-slate-100 dark:hover:bg-slate-700"}
                  />
                </PaginationItem>
                {/* Show at most 10 page numbers, with ellipsis if needed */}
                {(() => {
                  const pageButtons = [];
                  let start = 0;
                  let end = totalExercisePages;
                  if (totalExercisePages > 10) {
                    if (exercisePage < 5) {
                      start = 0;
                      end = 10;
                    } else if (exercisePage > totalExercisePages - 6) {
                      start = totalExercisePages - 10;
                      end = totalExercisePages;
                    } else {
                      start = exercisePage - 4;
                      end = exercisePage + 6;
                    }
                  }
                  if (start > 0) {
                    pageButtons.push(
                      <PaginationItem key="start-ellipsis">
                        <span className="px-2">...</span>
                      </PaginationItem>
                    );
                  }
                  for (let pageIndex = start; pageIndex < end; pageIndex++) {
                    pageButtons.push(
                      <PaginationItem key={pageIndex}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => { e.preventDefault(); setExercisePage(pageIndex); }}
                          isActive={exercisePage === pageIndex}
                          className={exercisePage === pageIndex 
                            ? 'bg-toss-blue text-black dark:text-white hover:bg-toss-blue/90' 
                            : 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}
                        >
                          {pageIndex + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  if (end < totalExercisePages) {
                    pageButtons.push(
                      <PaginationItem key="end-ellipsis">
                        <span className="px-2">...</span>
                      </PaginationItem>
                    );
                  }
                  return pageButtons;
                })()}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); setExercisePage((prev) => Math.min(totalExercisePages - 1, prev + 1)); }}
                    className={exercisePage === totalExercisePages - 1 ? "pointer-events-none text-slate-400 dark:text-slate-600" : "hover:bg-slate-100 dark:hover:bg-slate-700"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        <AddToRoutineModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          routines={userRoutines}
          onSelectRoutine={handleSelectRoutine}
        />
      </main>
    </div>
  );
};

export default ExerciseListPage;