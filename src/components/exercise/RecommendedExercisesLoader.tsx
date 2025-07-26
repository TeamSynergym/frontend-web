import React from 'react';

const RecommendedExercisesLoader: React.FC = () => {
  return (
    <section className="p-6 bg-slate-50 dark:bg-toss-navy/20 rounded-2xl animate-pulse">
      <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded-md w-1/3 mb-6"></div>
      <div className="mb-8 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-full"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-5/6"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-background dark:bg-slate-800/60 rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="h-40 bg-slate-300 dark:bg-slate-700 rounded-lg"></div>
            <div className="space-y-3">
              <div className="h-5 bg-slate-300 dark:bg-slate-700 rounded-md w-3/4"></div>
              <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded-md w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecommendedExercisesLoader;