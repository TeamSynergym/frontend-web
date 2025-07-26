import React from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from 'lucide-react';

interface ExerciseFilterProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  categories: readonly string[];
}

const ExerciseFilter: React.FC<ExerciseFilterProps> = ({
  searchTerm,
  onSearchTermChange,
  selectedCategory,
  onCategorySelect,
  categories,
}) => {
  return (
    <div className="mb-8 space-y-6">
      {/* 운동 검색 입력 필드 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-toss-gray" />
        <Input
          type="search"
          placeholder="찾고 있는 운동을 검색해보세요..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-background dark:bg-toss-navy/40 border-slate-200 dark:border-slate-700 rounded-xl h-12 text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-toss-blue focus:border-toss-blue"
        />
      </div>

      {/* 운동 카테고리 필터 (Tabs UI) */}
      <Tabs value={selectedCategory} onValueChange={onCategorySelect} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-2 h-auto bg-transparent p-0">
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="w-full py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 rounded-lg transition-all duration-300 data-[state=active]:bg-toss-blue data-[state=active]:text-black data-[state=active]:shadow-md data-[state=active]:scale-105 hover:bg-slate-100 dark:hover:bg-toss-navy/50"
            >
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default ExerciseFilter;