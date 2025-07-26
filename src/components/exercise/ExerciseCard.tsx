import React from 'react';
import type { Exercise } from '@/types/index';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ExerciseCardProps {
  exercise: Exercise;
  isLiked: boolean;
  onLikeToggle: (e: React.MouseEvent) => void;
  onAddToRoutine: (e: React.MouseEvent) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, isLiked, onLikeToggle, onAddToRoutine }) => {
  // 카드 클릭 시 페이지 이동을 위해 Link 컴포넌트로 감쌉니다.
  // 버튼 클릭 이벤트가 Link의 내비게이션을 방해하지 않도록 각 버튼 핸들러에서 e.stopPropagation()을 호출합니다.
  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLikeToggle(e);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToRoutine(e);
  };

  return (
    <Link to={`/exercises/${exercise.id}`} className="block group">
      <Card className="flex flex-col h-full bg-background dark:bg-toss-navy/40 rounded-2xl overflow-hidden shadow-md border-transparent hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
        {/* 썸네일 이미지 영역 */}
        <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
          {exercise.thumbnailUrl ? (
            <img
              src={exercise.thumbnailUrl}
              alt={`${exercise.name} thumbnail`}
              className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<h3 class="text-toss-navy dark:text-toss-blue text-xl font-bold px-4 text-center">이미지를 불러올 수 없습니다</h3>';
                }
              }}
            />
          ) : (
            <h3 className="text-toss-navy dark:text-toss-blue text-xl font-bold px-4 text-center">
              {exercise.name}
            </h3>
          )}
          <div className="absolute top-3 right-3">
            <button
              onClick={handleLikeClick}
              aria-label={isLiked ? 'Unlike' : 'Like'}
              className="p-2 rounded-full bg-white/70 dark:bg-toss-navy/70 backdrop-blur-sm text-toss-gray hover:text-red-500 transition-all duration-200 active:scale-90"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current text-red-500' : 'fill-transparent'}`} />
            </button>
          </div>
        </div>

        {/* 운동 정보 영역 */}
        <CardContent className="p-4 flex-grow flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 truncate group-hover:text-toss-blue transition-colors">
              {exercise.name}
            </h3>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-toss-blue/10 text-toss-blue dark:bg-toss-blue/20 dark:text-toss-blue/80 border-0 font-medium">
                {exercise.bodyPart}
              </Badge>
              <Badge variant="outline" className="text-toss-gray border-slate-200 dark:border-slate-600 dark:text-slate-400 font-normal">
                {exercise.posture}
              </Badge>
            </div>
          </div>
        </CardContent>

        {/* 카드 푸터 및 루틴 추가 버튼 */}
        <CardFooter className="p-4 pt-0">
          <button
            onClick={handleAddClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-100 dark:bg-toss-navy/80 text-sm font-bold text-toss-blue dark:text-white hover:bg-toss-blue hover:text-white dark:hover:bg-toss-blue transition-all duration-300 group/add"
          >
            <PlusCircle className="w-5 h-5 transition-transform duration-300 group-hover/add:rotate-90" />
            <span>루틴에 추가</span>
          </button>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default ExerciseCard;