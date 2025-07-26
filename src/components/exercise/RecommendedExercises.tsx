import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import type { Exercise } from '@/types/index';
import { Card } from '@/components/ui/card';

interface RecommendedExercisesProps {
  recommendedData: {
    exercises: Exercise[];
    reason: string;
  };
}

const RecommendedExercises: React.FC<RecommendedExercisesProps> = ({ recommendedData }) => {
  if (!recommendedData || recommendedData.exercises.length === 0) {
    return null;
  }

  return (
    <section className="mb-12 p-6 bg-toss-blue/10 dark:bg-toss-navy/30 rounded-2xl">
      <h2 className="text-2xl font-bold mb-3 text-toss-navy dark:text-toss-blue">
        ✨ AI-Powered Recommendations
      </h2>
      <div className="prose prose-sm dark:prose-invert max-w-none mb-8 text-slate-600 dark:text-slate-300">
        <ReactMarkdown>{recommendedData.reason}</ReactMarkdown>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendedData.exercises.map((exercise, index) => (
          <Link
            to={`/exercises/${exercise.id}`}
            key={exercise.id}
            className="group block animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Card className="h-full bg-background/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                {exercise.thumbnailUrl ? (
                  <img
                    src={exercise.thumbnailUrl}
                    alt={exercise.name}
                    className="max-w-full max-h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-sm text-center font-semibold text-toss-navy dark:text-toss-gray p-2">
                    {exercise.name}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-bold text-base text-slate-800 dark:text-white truncate group-hover:text-toss-blue transition-colors">
                  {exercise.name}
                </h4>
                <p className="text-sm text-toss-gray mt-1 h-10 overflow-hidden">
                  {exercise.description || 'No description available for this exercise.'}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RecommendedExercises;