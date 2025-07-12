import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { fetchAnalysisDetail as fetchAnalysisDetailApi } from '../services/api/analysisApi';
import type { AnalysisHistoryItem } from '@/types/index';

// 점수별 진단 결과와 등급을 반환하는 헬퍼 함수
const getDiagnosis = (score: number) => {
  if (score >= 80) return { label: '양호', color: 'text-green-600' };
  if (score >= 60) return { label: '경고', color: 'text-yellow-600' };
  return { label: '주의', color: 'text-red-600' };
};

const getOverallGrade = (score: number) => {
  if (score >= 80) return '우수 등급';
  if (score >= 60) return '보통 등급';
  return '개선 필요';
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

  // 전체 평균 점수 계산
  const scores = [analysis.spineCurvScore, analysis.spineScolScore, analysis.pelvicScore, analysis.neckScore, analysis.shoulderScore];
  const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  const diagnoses = [
    { part: "거북목", score: analysis.neckScore },
    { part: "어깨 불균형", score: analysis.shoulderScore },
    { part: "척추 측만", score: analysis.spineScolScore },
    { part: "척추 만곡", score: analysis.spineCurvScore },
    { part: "골반 불균형", score: analysis.pelvicScore }
  ];

  return (
    <div className="bg-background min-h-screen">
      <main className="max-w-3xl mx-auto pt-16 px-4 sm:px-8 lg:px-16 pb-8">
        <h1 className="text-2xl font-bold mb-8 text-center">AI 분석 결과 (공유용)</h1>
        {/* 전체 점수 카드 */}
        <Card className="text-center p-8 mb-6">
          <p className="text-gray-500 mb-2">자세 점수</p>
          <p className="text-6xl font-bold text-blue-600 mb-4">{averageScore}점</p>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            {getOverallGrade(averageScore)}
          </span>
        </Card>
        {/* Keypoint 분석 카드 */}
        <Card className="p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Keypoint 분석</h2>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <p className="text-gray-500">분석 이미지 표시 영역</p>
          </div>
        </Card>
        {/* 부위별 진단 카드 */}
        <Card className="p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">부위별 진단</h2>
          <ul className="space-y-3">
            {diagnoses.map(({ part, score }) => {
              const { label, color } = getDiagnosis(score);
              return (
                <li key={part} className="flex justify-between items-center">
                  <div>
                    <span className={`font-bold ${color} mr-2`}>{label}</span>
                    <span className="text-gray-700">{part} 증상이 보입니다.</span>
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{score}점</span>
                </li>
              );
            })}
          </ul>
        </Card>
        {/* AI 코치 소견 카드 */}
        <Card className="p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">AI 코치 소견</h2>
          <p className="text-gray-600 leading-relaxed">
            전반적으로 양호한 자세이지만, 장시간 앉아있는 습관으로 인해 거북목이 진행될 수 있습니다. 어깨 불균형 개선을 위한 스트레칭을 꾸준히 하는 것을 추천합니다.
          </p>
        </Card>
      </main>
    </div>
  );
};

export default AnalysisSharePage;