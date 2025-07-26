import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { useLogStore } from '@/store/logStore';
import { generateAiGoal, type AiGoalResponse } from '@/services/api/aiApi';
import { saveAiGoalsToUser } from '@/services/api/userApi';
import { awardBadgeToUser } from '@/services/api/notificationApi';

import Header from '@/components/common/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// ▼▼▼ 추가: Select 컴포넌트 import ▼▼▼
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, ArrowLeft, BarChart, Calendar, Target, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

// ▼▼▼ 추가: 선택 가능한 페르소나 목록 정의 ▼▼▼
const coachPersonas = [
  { value: '데이터를 중시하는 엄격한 트레이너', label: '엄격한 데이터 분석가' },
  { value: '다정하고 동기부여 넘치는 코치', label: '다정한 동기부여 코치' },
  { value: '재미와 습관 형성을 강조하는 친구 같은 코치', label: '재미있는 친구 코치' },
];

const GoalRecommendationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { pastLogs, fetchPastLogs } = useLogStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiGoalResponse | null>(null);
  const [hasFetchedLogs, setHasFetchedLogs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string>(coachPersonas[0].value);

  useEffect(() => {
    if (!user?.id) {
      toast.error("로그인이 필요합니다.");
      navigate('/login');
      return;
    }
    if (!hasFetchedLogs) {
      fetchPastLogs(user.id).then(() => setHasFetchedLogs(true));
    }
  }, [user, navigate, fetchPastLogs, hasFetchedLogs]);

  const handleSaveGoal = async () => {
  if (!user?.id || !result?.final_goals) {
    toast.error("저장할 목표가 없거나 로그인 상태가 아닙니다.");
    return;
  }

  setIsSaving(true);
  try {
    console.log("Saving goals for user ID:", user?.id);
    await saveAiGoalsToUser(user.id, result.final_goals);

    // ✅ 뱃지 정보가 있다면 백엔드에 전송 (뱃지 자동 수여)
    if (result.generated_badge) {
      const badgeName = result.generated_badge.badge_name ?? '';
      const badgeDescription = result.generated_badge.badge_description ?? '';

      if (badgeName && badgeDescription) {
        await awardBadgeToUser(user.id, badgeName, badgeDescription);
        toast.success(`🎉 새 뱃지 획득: ${badgeName}`);
      }
    }

    toast.success("새로운 목표가 성공적으로 저장되었습니다!");
  } catch (error) {
    toast.error("목표 저장 또는 뱃지 수여에 실패했습니다. 다시 시도해주세요.");
  } finally {
    setIsSaving(false);
  }
};

  const handleGenerateGoal = async () => {
    if (!user?.id) return;
    if (pastLogs.length < 3) {
      toast.info("AI가 분석하려면 최소 3일 이상의 운동 기록이 필요해요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // ▼▼▼ 변경점: API 호출 시 선택된 페르소나(selectedPersona) 전달 ▼▼▼
      const aiResult = await generateAiGoal(pastLogs, selectedPersona);
      setResult(aiResult);
      toast.success("AI 목표 추천이 완료되었습니다!");
    } catch (err: any) {
      setError(err.message || "알 수 없는 오류가 발생했습니다.");
      toast.error("AI 목표 추천 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderInitialState = () => (
    <Card className="shadow-lg text-center bg-background dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <Wand2 className="w-12 h-12 text-primary" />
        </div>
        <CardTitle className="text-2xl text-black dark:text-white">AI 코치 예측 목표 설정</CardTitle>
        <CardDescription className="pt-2 text-gray-700 dark:text-gray-300">
          AI 코치가 당신의 운동 기록을 분석하여 뱃지를 수여하고
          <br />
          개인화된 주간/월간 목표를 설정해줘요.
          <br /><br />
          원하는 코칭 스타일을 선택하고 시작해보세요!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ▼▼▼ 중앙 정렬 및 모던한 드롭다운 UI ▼▼▼ */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <label className="block text-center text-sm font-medium text-blue-500 mb-4">
              <UserCheck className="inline-block w-5 h-5 mr-2 text-blue-500" />
              AI 코치 스타일 선택
            </label>
            <Select value={selectedPersona} onValueChange={setSelectedPersona}>
              <SelectTrigger className="w-full bg-blue-50 dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-lg hover:from-blue-600 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-700">
                <SelectValue placeholder="코칭 스타일을 선택하세요..." />
              </SelectTrigger>
              <SelectContent className="bg-background dark:bg-gray-900 border border-blue-500 dark:border-blue-400 rounded-lg shadow-lg">
                {coachPersonas.map((persona) => (
                  <SelectItem
                    key={persona.value}
                    value={persona.value}
                    className="flex items-center px-4 py-2 hover:bg-blue-100 dark:hover:bg-blue-800 focus:bg-blue-200 dark:focus:bg-blue-900 text-black dark:text-white rounded-md transition-colors"
                  >
                    <UserCheck className="w-5 h-5 text-blue-500 mr-3" />
                    {persona.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 focus:ring-4 focus:ring-blue-300 rounded-lg shadow-md"
          onClick={handleGenerateGoal}
          disabled={!hasFetchedLogs || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 분석 중...
            </>
          ) : (
            "내 목표 생성하기"
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderResultState = () => {
    const weeklyGoal = result?.final_goals?.weekly_goal;
    const monthlyGoal = result?.final_goals?.monthly_goal;

    return (
      <div className="space-y-6">
        {/* AI 분석 리포트 카드 */}
        <Card className="shadow-lg bg-background/80 dark:bg-gray-900/80 backdrop-blur-md border border-white/20 dark:border-gray-700 rounded-lg">
          <CardHeader>
            <div className="flex items-center">
              <BarChart className="w-6 h-6 text-blue-500 mr-3" />
              <CardTitle className="text-black dark:text-white">AI 분석 리포트</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-black dark:text-white whitespace-pre-wrap">{result?.analysis_result}</p>
          </CardContent>
        </Card>

        {/* 주간 및 월간 목표 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg bg-background/80 dark:bg-gray-900/80 backdrop-blur-md border border-white/20 dark:border-gray-700 rounded-lg">
            <CardHeader>
              <div className="flex items-center">
                <Calendar className="w-6 h-6 text-green-700 mr-3" />
                <CardTitle className="text-black dark:text-white">새로운 주간 목표</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {weeklyGoal && (
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {`주 ${weeklyGoal.workouts}회, 달성률 ${weeklyGoal.completion_rate}%`}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-lg bg-background/80 dark:bg-gray-900/80 backdrop-blur-md border border-white/20 dark:border-gray-700 rounded-lg">
            <CardHeader>
              <div className="flex items-center">
                <Target className="w-6 h-6 text-blue-700 mr-3" />
                <CardTitle className="text-black dark:text-white">새로운 월간 목표</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyGoal && (
                <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                  {`월 ${monthlyGoal.workouts}회, 달성률 ${monthlyGoal.completion_rate}%`}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 버튼 영역 */}
        <div className="text-center space-x-4">
          <Button onClick={handleSaveGoal} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Target className="mr-2 h-4 w-4" />
            )}
            이 목표 저장하기
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 focus:ring-4 focus:ring-blue-300 rounded-lg shadow-md"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  };
  
  const renderErrorState = () => (
     <Card className="shadow-lg text-center border-destructive">
        <CardHeader>
          <CardTitle>오류 발생</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateGoal} variant="destructive">
            재시도
          </Button>
        </CardContent>
      </Card>
  );

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-charcoal to-deep-blue text-white"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.52), rgba(9, 13, 39, 0.28))',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Header />
      <main
        className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8"
        style={{
          paddingTop: '120px',
          background: 'rgba(176, 216, 252, 0.43)',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(211, 235, 255, 0.56)',
          border: '1px solid rgba(180, 196, 230, 0.54)',
        }}
      >
        {error ? renderErrorState() : result ? renderResultState() : renderInitialState()}
      </main>
    </div>
  );
};

export default GoalRecommendationPage;