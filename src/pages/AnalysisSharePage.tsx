import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { fetchAnalysisDetail as fetchAnalysisDetailApi } from '../services/api/analysisApi';
import type { AnalysisHistoryItem } from '@/types/index';

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

const AnalysisSharePage: React.FC = () => {
  const { historyId } = useParams<{ historyId: string }>();
  const [analysis, setAnalysis] = useState<AnalysisHistoryItem | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'result'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!historyId) {
      setErrorMessage('분석 결과 ID가 없습니다.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    fetchAnalysisDetailApi(Number(historyId))
      .then((data) => {
        setAnalysis(data);
        setStatus('result');
      })
      .catch((error) => {
        setErrorMessage('분석 결과를 불러오는 중 오류가 발생했습니다.');
        setStatus('error');
      });
  }, [historyId]);

  if (!analysis) return null;

  // 전체 평균 점수 계산 (0이 아닌 점수만으로)
  const scores = [analysis.spineCurvScore, analysis.spineScolScore, analysis.pelvicScore, analysis.neckScore, analysis.shoulderScore];
  const validScores = scores.filter(score => score !== 0);
  const averageScore = validScores.length > 0
    ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
    : 0;

  const feedback = analysis.feedback || {};
  const measurements = analysis.measurements || {};

  const diagnoses = [
    { part: "목", score: analysis.neckScore, feedback: feedback.head_forward || feedback.neck_error, measurement: measurements.neck_forward_angle, unit: "°" },
    { part: "어깨", score: analysis.shoulderScore, feedback: feedback.shoulder_tilt, measurement: measurements.shoulder_tilt_angle, unit: "°" },
    { part: "척추(정면)", score: analysis.spineScolScore, feedback: feedback.torso_tilt, measurement: measurements.torso_tilt_angle, unit: "°" },
    { part: "척추(측면)", score: analysis.spineCurvScore, feedback: feedback.back_bend, measurement: measurements.back_angle, unit: "°" },
    { part: "골반", score: analysis.pelvicScore, feedback: feedback.hip_tilt, measurement: measurements.hip_tilt_angle, unit: "°" }
  ];

  // AI 코치 소견 파싱 (JSON or string)
  let aiOpinion = 'AI 진단 정보가 없습니다.';
  try {
    if (analysis.diagnosis) {
      const parsed = JSON.parse(analysis.diagnosis);
      if (parsed && typeof parsed === 'object' && parsed.korean) {
        aiOpinion = parsed.korean;
      } else {
        aiOpinion = analysis.diagnosis;
      }
    }
  } catch {
    aiOpinion = analysis.diagnosis || 'AI 진단 정보가 없습니다.';
  }

  return (
    <div className="bg-background min-h-screen">
      <main className="max-w-4xl mx-auto pt-32 px-4 sm:px-8 lg:px-16 pb-8">
        <div className="max-w-3xl mx-auto">
          {/* 헤더 */}
          <header className="relative flex items-center justify-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold">AI 분석 결과 (공유용)</h1>
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
                {diagnoses.filter(({ score }) => score !== 0).map(({ part, score, measurement, unit }) => {
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

          {/* Keypoint 분석 카드 */}
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
              {aiOpinion}

              <p className="text-gray-600 dark:text-gray-400 mb-6 mt-6">🚨 본 진단 결과는 AI 기반 분석으로 참고용이며, 개인차나 촬영 환경에 따라 실제와 다를 수 있습니다. 정확한 진단이 필요하시면 전문의와 상담하시기 바랍니다. 🚨</p>

            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AnalysisSharePage;