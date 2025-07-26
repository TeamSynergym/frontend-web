import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Exercise, Routine } from '@/types/index';
import { useUserStore } from '@/store/userStore';
import { fetchExerciseById, fetchUserLikes, addLikeApi, removeLikeApi, fetchExerciseLikeCount } from '@/services/api/exerciseApi';
import { fetchUserRoutines, addExerciseToRoutineApi } from '@/services/api/exerciseApi';
import Header from '@/components/common/Header';
import AddToRoutineModal from '@/components/exercise/AddToRoutineModal'; // Redesigned Component
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Heart, Dumbbell, BarChart, User } from 'lucide-react';

// 상세 정보 아이템을 시각적으로 표현하는 컴포넌트
const DetailPill = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-toss-navy/40 rounded-xl text-center">
        <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4 text-toss-gray" />
            <span className="text-sm font-semibold text-toss-gray">{label}</span>
        </div>
        <p className="font-bold text-base text-slate-800 dark:text-white">{value || '정보 없음'}</p>
    </div>
);

const ExerciseDetailPage: React.FC = () => {
    const { exerciseId } = useParams<{ exerciseId: string }>();
    const navigate = useNavigate();
    const { user } = useUserStore();

    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [userRoutines, setUserRoutines] = useState<Routine[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isLikeLoading, setIsLikeLoading] = useState(false);

    // ... (Data fetching and handler logic is preserved)
    useEffect(() => {
        if (!exerciseId) {
          setError('유효하지 않은 접근입니다.');
          setIsLoading(false);
          return;
        }
    
        const loadData = async () => {
          try {
            const exerciseData = await fetchExerciseById(Number(exerciseId));
            setExercise(exerciseData);
            
            try {
              const likeCountData = await fetchExerciseLikeCount(Number(exerciseId));
              const finalLikeCount = likeCountData.likeCount ?? 0;
              setLikeCount(finalLikeCount);
            } catch (likeError) {
              console.error('좋아요 수 로드 실패:', likeError);
              setLikeCount(0);
            }
            
            if (user?.id) {
              const routinesData = await fetchUserRoutines(user.id);
              setUserRoutines(routinesData);
              
              const userLikes = await fetchUserLikes(user.id);
              const isCurrentExerciseLiked = userLikes.some((like: any) => like.exerciseId === Number(exerciseId));
              setIsLiked(isCurrentExerciseLiked);
            }
          } catch (err) {
            setError('데이터를 불러오는 데 실패했습니다.');
            console.error(err);
          } finally {
            setIsLoading(false);
          }
        };
        loadData();
      }, [exerciseId, user]);
    
      useEffect(() => {
        if (notification) {
          const timer = setTimeout(() => setNotification(null), 3000);
          return () => clearTimeout(timer);
        }
      }, [notification]);
    
      const handleSelectRoutine = async (routineId: number) => {
        if (!exercise) return;
        try {
          await addExerciseToRoutineApi(routineId, exercise.id);
          setNotification(`'${exercise.name}' 운동이 루틴에 추가되었습니다.`);
        } catch (error) {
          setNotification("오류: 운동 추가에 실패했습니다.");
        } finally {
          setIsModalOpen(false);
        }
      };
    
      const handleLikeToggle = async () => {
        if (!user || !exercise) return;
        
        setIsLikeLoading(true);
        try {
          if (isLiked) {
            await removeLikeApi(user.id, exercise.id);
            setNotification("좋아요를 취소했습니다.");
          } else {
            await addLikeApi(user.id, exercise.id);
            setNotification("이 운동을 좋아합니다!");
          }
          // Optimistic update for UI responsiveness
          setIsLiked(!isLiked);
          setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

          // Fetch the latest count from server to sync
          const updatedLikeCount = await fetchExerciseLikeCount(exercise.id);
          setLikeCount(updatedLikeCount.likeCount ?? 0);
          
        } catch (error) {
          console.error('좋아요 처리 실패:', error);
          setNotification("좋아요 처리에 실패했습니다.");
          // Revert optimistic update on error
          setIsLiked(isLiked);
          setLikeCount(likeCount);
        } finally {
          setIsLikeLoading(false);
        }
      };


    if (isLoading) return <div className="flex justify-center items-center h-screen bg-background text-foreground">운동 정보를 불러오는 중...</div>;
    if (error) return <div className="flex justify-center items-center h-screen bg-background text-red-500">{error}</div>;
    if (!exercise) return <div className="flex justify-center items-center h-screen bg-background text-foreground">운동 정보를 찾을 수 없습니다.</div>;

    return (
        <div className="bg-slate-50 dark:bg-toss-navy/20 min-h-screen">
            <Header />
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background dark:bg-toss-navy/80 rounded-2xl shadow-md" style={{ paddingTop: 'var(--header-height, 100px)' }}>
                {/* 뒤로가기 버튼 */}
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-toss-gray hover:bg-slate-200 dark:hover:bg-toss-navy/50">
                    <ArrowLeft className="mr-2 h-4 w-4" /> 목록으로 돌아가기
                </Button>

                <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                    {/* 왼쪽: 이미지 */}
                    <div className="w-full h-auto bg-background dark:bg-toss-navy/40 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
                        <img
                            src={exercise.thumbnailUrl || 'https://via.placeholder.com/600x400'}
                            alt={exercise.name}
                            className="w-full h-auto max-h-96 object-contain p-4"
                        />
                    </div>

                    {/* 오른쪽: 상세 정보 */}
                    <div className="flex flex-col space-y-6">
                        <div>
                            {exercise.category && <p className="font-semibold text-toss-blue">{exercise.category}</p>}
                            <div className="flex items-start justify-between mt-1">
                                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">{exercise.name}</h1>
                                {user && (
                                    <button
                                        onClick={handleLikeToggle}
                                        disabled={isLikeLoading}
                                        className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${
                                            isLiked
                                                ? 'bg-red-500/10 text-red-500'
                                                : 'bg-slate-200 dark:bg-toss-navy/50 text-toss-gray hover:bg-red-500/10 hover:text-red-500'
                                        }`}
                                    >
                                        <Heart className={`h-5 w-5 transition-all ${isLiked ? 'fill-current' : 'fill-transparent'}`} />
                                        <span className="font-bold text-sm min-w-[20px] text-center">
                                            {likeCount}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 상세 정보 Pills */}
                        <div className="grid grid-cols-3 gap-3">
                            <DetailPill icon={Dumbbell} label="운동 부위" value={exercise.bodyPart} />
                            <DetailPill icon={BarChart} label="난이도" value={exercise.difficulty} />
                            <DetailPill icon={User} label="자세" value={exercise.posture} />
                        </div>

                        {/* 운동 설명 카드 */}
                        <div className="p-6 bg-background dark:bg-toss-navy/40 rounded-xl shadow-lg">
                            <h2 className="text-lg font-bold mb-2 text-slate-800 dark:text-white">운동 설명</h2>
                            <p className="text-toss-gray leading-relaxed">{exercise.description || '이 운동에 대한 설명이 아직 없습니다.'}</p>
                        </div>

                        {user && (
                            <Button onClick={() => setIsModalOpen(true)} size="lg" className="w-full py-3 bg-blue-100 hover:bg-toss-blue/90 text-black font-bold text-base rounded-xl shadow-lg hover:shadow-toss-blue/40 transition-all transform hover:-translate-y-0.5">
                                <PlusCircle className="mr-2 h-5 w-5" /> 루틴에 추가하기
                            </Button>
                        )}
                    </div>
                </div>
            </main>

            <AddToRoutineModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                routines={userRoutines}
                onSelectRoutine={handleSelectRoutine}
            />

            {/* 알림 토스트 (Notification Toast) */}
            {notification && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full shadow-lg z-50 animate-in fade-in-0 slide-in-from-bottom-5">
                    {notification}
                </div>
            )}
        </div>
    );
};

export default ExerciseDetailPage;