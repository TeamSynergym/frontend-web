import React from 'react';
import type { Routine } from '@/types/index';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface AddToRoutineModalProps {
  isOpen: boolean;
  routines: Routine[];
  onClose: () => void;
  onSelectRoutine: (routineId: number) => void;
}

const AddToRoutineModal: React.FC<AddToRoutineModalProps> = ({ isOpen, routines, onClose, onSelectRoutine }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background dark:bg-toss-navy/80 p-6 rounded-2xl shadow-xl w-full max-w-md transform transition-all duration-300 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">루틴에 추가</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 text-toss-gray hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 루틴 목록 */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
          {routines.length > 0 ? (
            routines.map(routine => (
              <button
                key={routine.id}
                onClick={() => onSelectRoutine(routine.id)}
                className="w-full text-left p-4 rounded-lg font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-toss-navy/60 hover:bg-toss-blue/10 dark:hover:bg-toss-blue/20 hover:text-toss-blue dark:hover:text-white transition-all duration-200"
              >
                {routine.name}
              </button>
            ))
          ) : (
            <div className="text-center py-8 px-4 bg-slate-50 dark:bg-toss-navy/40 rounded-lg">
                <p className="text-toss-gray">아직 생성된 루틴이 없어요.</p>
                <p className="text-sm text-slate-400 mt-1">새로운 루틴을 만들고 운동을 추가해보세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddToRoutineModal;