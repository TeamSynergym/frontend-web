import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HiArrowLeft, HiCheckCircle, HiShare } from 'react-icons/hi';
import Header from '@/components/common/Header';
import { useUserStore } from '@/store/userStore';
import type { AnalysisHistoryItem } from '@/types/index';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { fetchAnalysisDetail as fetchAnalysisDetailApi } from '../services/api/analysisApi';
import ChatModal from '@/components/chat/ChatModal';

interface LocationState {
  frontPhoto: File;
  sidePhoto: File | null;
}

interface AnalysisResultPageProps {
  isReadOnly?: boolean;
}

// 점수별 진단 결과와 등급을 반환하는 헬퍼 함수 (4등급 체계)
const getDiagnosis = (score: number) => {
  if (score >= 85) return { label: '우수', color: 'text-green-700' };
  if (score >= 70) return { label: '보통', color: 'text-yellow-600' };
  if (score >= 60) return { label: '주의', color: 'text-orange-500' };
  return { label: '위험', color: 'text-red-600' };
};

const getOverallGrade = (score: number) => {
  if (score >= 85) return '우수';
  if (score >= 70) return '보통';
  if (score >= 60) return '주의';
  return '위험';
};

const AnalysisResultPage: React.FC<AnalysisResultPageProps> = ({ isReadOnly = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { historyId } = useParams<{ historyId: string }>();
  const { user } = useUserStore();
  const [analysis, setAnalysis] = useState<AnalysisHistoryItem | null>(null);
  const [status, setStatus] = useState<'loading' | 'completed' | 'result' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitType, setChatInitType] = useState<'video' | 'consult' | null>(null);
  const [chatInitPayload, setChatInitPayload] = useState<any>(null);
  const [initialUserMessage, setInitialUserMessage] = useState<string | undefined>(undefined);
  const [initialVideoUrl, setInitialVideoUrl] = useState<string | undefined>(undefined);

  // 사진 데이터 확인 (필요시 활용)
  const { frontPhoto, sidePhoto } = (location.state as LocationState) || {};

  console.log('AnalysisResultPage user:', user);
  console.log('AnalysisResultPage analysis:', analysis);
  console.log('URL historyId:', historyId);
  console.log('Analysis ID:', analysis?.id);
  
  useEffect(() => {
    if (!historyId) {
      setErrorMessage('분석 결과 ID가 없습니다.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    const start = Date.now();
    fetchAnalysisDetailApi(Number(historyId))
      .then((data) => {
        setAnalysis(data);
        const elapsed = Date.now() - start;
        const minLoading = 1000; // 최소 1초 로딩
        setTimeout(() => {
          setStatus('completed');
          setTimeout(() => {
            setStatus('result');
          }, 2000); // 2초 동안 '분석 완료!' 보여주기
        }, Math.max(0, minLoading - elapsed));
      })
      .catch((error) => {
        console.error(error);
        setErrorMessage('분석 결과를 불러오는 중 오류가 발생했습니다.');
        setStatus('error');
      });
  }, [historyId, frontPhoto, sidePhoto, user]);

  // 챗봇 오픈 트리거 - ChatModal에서 관리하는 전역 함수 사용
  const handleChatOpen = (type: 'video' | 'consult', payload?: any) => {
    setChatInitType(type);
    setChatInitPayload(payload);
    setIsChatOpen(true);
    setIsModalOpen(false);
    
    // 분석 결과를 바탕으로 더 구체적인 메시지 생성
    if (analysis) {
      const diagnosis = (() => {
        try {
          if (!analysis.diagnosis) return '자세 분석 결과가 없습니다.';
          
          // JSON 파싱 시도
          const parsed = JSON.parse(analysis.diagnosis);
          if (parsed && typeof parsed === 'object' && parsed.korean) {
            // korean 필드가 있으면 사용
            return parsed.korean;
          } else if (typeof parsed === 'string') {
            // 파싱된 결과가 문자열이면 그대로 사용
            return parsed;
          } else {
            // 객체이지만 korean 필드가 없으면 원본 사용
            return analysis.diagnosis;
          }
        } catch (e) {
          // JSON 파싱 실패 시 원본 문자열 사용
          return analysis.diagnosis || '자세 분석 결과가 없습니다.';
        }
      })();
      
      // 진단 내용 정리 (특수 문자 제거 및 정리)
      const cleanDiagnosis = diagnosis
        .replace(/\*\*/g, '') // ** 제거
        .replace(/\s+/g, ' ') // 연속된 공백을 하나로
        .trim(); // 앞뒤 공백 제거
      
      console.log('Original diagnosis:', analysis.diagnosis);
      console.log('Cleaned diagnosis:', cleanDiagnosis);
      
      if (type === 'consult') {
        setInitialUserMessage(`자세 분석 결과: ${cleanDiagnosis}. 이에 맞는 운동을 추천해주세요.`);
      } else if (type === 'video') {
        setInitialUserMessage(`자세 분석 결과: ${cleanDiagnosis}. 이에 맞는 운동 영상을 추천해주세요.`);
      }
    }
  };

  // 모달 닫기 핸들러
  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
    setChatInitType(null);
    setChatInitPayload(null);
    setInitialUserMessage(undefined);
    setInitialVideoUrl(undefined);
  };



  // 공유 기능
  const handleShare = async () => {
    if (!analysis) return;

    const shareUrl = `${window.location.origin}/analysis-share/${analysis.id}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'AI 자세 분석 결과',
          text: 'AI가 분석한 자세 결과를 확인해보세요!',
          url: shareUrl,
        });
        toast.success('공유가 완료되었습니다!');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('링크가 클립보드에 복사되었습니다!');
      }
    } catch (error) {
      console.error('공유 중 오류:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        // 사용자가 공유를 취소한 경우
        return;
      }
      toast.error('공유 중 오류가 발생했습니다.');
    }
  };

  const renderLoadingContent = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 min-h-[60vh]">
      <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin mb-6"></div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">AI가 분석 중입니다...</h2>
      <p className="text-gray-600 dark:text-gray-400 animate-pulse">잠시만 기다려주세요.</p>
    </div>
  );

  const renderCompletedContent = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 min-h-[60vh]">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">분석 완료!</h2>
      <div className="flex flex-col items-center justify-center">
        <HiCheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">결과를 확인해주세요.</p>
      </div>
    </div>
  );

  const renderErrorContent = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 min-h-[60vh]">
      <h2 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{errorMessage}</p>
      <Button onClick={() => navigate('/photoupload')} className="bg-blue-600 hover:bg-blue-700">
        다시 시도하기
      </Button>
    </div>
  );

  const renderResultContent = () => {
    if (!analysis) return null;

    // 전체 평균 점수 계산
    const scores = [analysis.spineCurvScore, analysis.spineScolScore, analysis.pelvicScore, analysis.neckScore, analysis.shoulderScore];
    const validScores = scores.filter(score => score !== 0);
    const averageScore = validScores.length > 0
      ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
      : 0;

    const feedback = analysis.feedback || {};
    const measurements = analysis.measurements || {};

    const diagnoses = [
      {
        part: "목목",
        score: analysis.neckScore,
        feedback: feedback.head_forward || feedback.neck_error,
        measurement: measurements.neck_forward_angle,
        unit: "°"
      },
      {
        part: "어깨",
        score: analysis.shoulderScore,
        feedback: feedback.shoulder_tilt,
        measurement: measurements.shoulder_tilt_angle,
        unit: "°"
      },
      {
        part: "척추(정면)",
        score: analysis.spineScolScore,
        feedback: feedback.torso_tilt,
        measurement: measurements.torso_tilt_angle,
        unit: "°"
      },
      {
        part: "척추(측면)",
        score: analysis.spineCurvScore,
        feedback: feedback.back_bend,
        measurement: measurements.back_angle,
        unit: "°"
      },
      {
        part: "골반",
        score: analysis.pelvicScore,
        feedback: feedback.hip_tilt,
        measurement: measurements.hip_tilt_angle,
        unit: "°"
      }
    ];

    return (
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <header className="relative flex items-center justify-center mb-6">
          {!isReadOnly && (
            <button 
              onClick={() => navigate(-1)} 
              className="absolute left-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="뒤로 가기"
            >
              <HiArrowLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-xl sm:text-2xl font-bold">AI 분석 결과</h1>
          {!isReadOnly && (
            <button 
              onClick={handleShare}
              className="absolute right-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="결과 공유하기"
            >
              <HiShare className="w-6 h-6" />
            </button>
          )}
        </header>

        {/* 자세 점수 + 부위별 진단 2-column */}
        <div className="flex flex-col md:flex-row gap-6 max-w-5xl mx-auto mb-6">
          {/* 자세 점수 카드 */}
          <Card className="text-center p-8 flex-1 mb-0">
            <p className="text-gray-500 mb-2">자세 점수</p>
            <p className="text-6xl font-bold text-blue-600 mb-4">{averageScore}점</p>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              {getOverallGrade(averageScore)}
            </span>
          </Card>
          {/* 부위별 진단 카드 */}
          <Card className="p-6 flex-1 mb-0">
            <h2 className="font-bold text-lg mb-4">부위별 진단</h2>
            <ul className="space-y-3">
              {diagnoses
                .filter(({ score }) => score !== 0)
                .map(({ part, score, measurement, unit }) => {
                  const { label, color } = getDiagnosis(score);
                  return (
                    <li key={part} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${color}`} style={{ minWidth: '90px', display: 'inline-block' }}>{part}</span>
                        <span className={`font-bold ${color}`}>{label}({score}점)</span>
                      </div>
                      <div>
                        {measurement !== undefined && measurement !== null ? (
                          <span className="text-gray-700">{`${Number(measurement).toFixed(1)}${unit} 기울어짐`}</span>
                        ) : (
                          <span className="text-gray-700">증상 있음</span>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </Card>
        </div>

        {/* Keypoint 분석 카드는 별도로 아래에 둠 */}
        <Card className="p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Keypoint 분석</h2>
          <div className="h-[32rem] bg-muted rounded-md flex items-center justify-center">
            {analysis?.radarChartUrl ? (
              <img
                src={analysis.radarChartUrl}
                alt="자세 분석 레이더 차트"
                className="max-h-[32rem] max-w-full object-contain"
              />
            ) : (
              <p className="text-gray-500">분석 이미지 표시 영역</p>
            )}
          </div>
        </Card>
        
        {/* AI 코치 소견 카드 */}
        <Card className="p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">AI 코치 소견</h2>
          <p className="text-gray-600 leading-relaxed">
            {(() => {
              try {
                if (!analysis.diagnosis) return 'AI 진단 정보가 없습니다.';
                
                // Try to parse as JSON first (in case it's a JSON string)
                const parsed = JSON.parse(analysis.diagnosis);
                if (parsed && typeof parsed === 'object' && parsed.korean) {
                  return parsed.korean;
                }
                
                // If not a JSON object or doesn't have korean key, return as is
                return analysis.diagnosis;
              } catch (e) {
                // If parsing fails, return as plain string
                return analysis.diagnosis || 'AI 진단 정보가 없습니다.';
              }
            })()}
          </p>
        </Card>

        {/* 맞춤 운동 추천 버튼 - 읽기 전용이 아닐 때만 표시 */}
        {!isReadOnly && (
          <Button
            className="w-full !py-4 !text-base !font-bold bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setIsModalOpen(true)}
          >
            맞춤 운동 추천 보기
          </Button>
        )}



        {/* 모달 */}
        <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
          <DialogContent className="max-w-md w-full">
            <DialogTitle>원하는 추천 방식을 선택하세요</DialogTitle>
            <DialogDescription>
              원하는 방식을 선택하면 챗봇이 바로 도와드립니다.
            </DialogDescription>
            <div className="flex flex-col gap-6 items-center p-4">
              <Button
                className="w-full py-3 text-lg bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => handleChatOpen('consult', {
                  message: 'OOO 운동을 추천드립니다. 루틴에 추가하시겠습니까?'
                })}
              >
                AI 운동 코치와 맞춤 운동 상담하기
              </Button>
              <Button
                className="w-full py-3 text-lg bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => handleChatOpen('video', {
                  videoUrl: 'https://www.youtube.com/watch?v=fFIL0rlRH78',
                  thumbnail: 'https://img.youtube.com/vi/fFIL0rlRH78/0.jpg',
                  message: '스크립트 요약과 댓글의 분석이 필요할 경우 요청주세요.'
                })}
              >
                추천 운동 영상 바로 시청
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {isChatOpen && user && analysis && (
          <ChatModal
            isOpen={isChatOpen}
            onClose={handleChatClose}
            userId={user.id}
            historyId={Number(historyId)}  // analysis.id 대신 URL의 historyId 사용
            initType={chatInitType}
            initPayload={chatInitPayload}
            initialUserMessage={initialUserMessage}
            initialVideoUrl={initialVideoUrl}
          />
        )}
      </div>
    );
  };

  return (
    <div className="bg-background min-h-screen">
      {!isReadOnly && <Header />}
      <main className={`max-w-4xl mx-auto ${!isReadOnly ? 'pt-32' : 'pt-8'} px-4 sm:px-8 lg:px-16 pb-8`}>
        {status === 'loading' && renderLoadingContent()}
        {status === 'completed' && renderCompletedContent()}
        {status === 'error' && renderErrorContent()}
        {status === 'result' && renderResultContent()}
      </main>
    </div>
  );
};

export default AnalysisResultPage;