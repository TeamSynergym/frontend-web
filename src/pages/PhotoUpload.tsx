import React, { useState } from 'react';
import Header from '@/components/common/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { HiUpload } from 'react-icons/hi';
import { useUserStore } from '@/store/userStore';
import { useRequireAuth } from "../hooks/useRequireAuth";

const PhotoUpload: React.FC = () => {
  useRequireAuth("/photoupload"); // 페이지 최상단에서 인증 체크

  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [sidePhoto, setSidePhoto] = useState<File | null>(null);
  const [includeSidePhoto, setIncludeSidePhoto] = useState(false);
  const navigate = useNavigate();
  const { user } = useUserStore();

  const PhotoUploader = ({ photo, setPhoto, title, exampleUrl }: { photo: File | null, setPhoto: (f: File) => void, title: string, exampleUrl: string }) => (
    <div className="text-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 h-full flex flex-col justify-center">
      {photo ? (
        <img src={URL.createObjectURL(photo)} alt={`${title} preview`} className="w-full h-48 object-contain rounded-lg mb-2" />
      ) : (
        <img src={exampleUrl} alt={`${title} example`} className="w-full h-48 object-contain rounded-lg mb-2 opacity-50" />
      )}
      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{title}</h4>
      <Button asChild variant="secondary" className="w-full cursor-pointer">
        <label>
          <HiUpload className="w-5 h-5 inline-block mr-1" /> {photo ? "사진 변경" : "사진 선택"}
          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setPhoto(e.target.files[0])} />
        </label>
      </Button>
    </div>
  );

  // 분석 시작 가능 여부 확인
  const canStartAnalysis = frontPhoto && (includeSidePhoto ? sidePhoto : true);

  const dummyAnalysis = {
    id: 10,
    createdAt: new Date().toISOString(),
    spineCurvScore: 75,
    spineScolScore: 82,
    pelvicScore: 78,
    neckScore: 65,
    shoulderScore: 70
  };

  const getAnalysisIdForUser = (userId?: number) => {
    if (userId === 204) return 7;
    if (userId === 215) return 9;
    return 10;
  };

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto pt-32 px-4 sm:px-8 lg:px-16 pb-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">AI 자세 분석</h1>
        <Card className="p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">사진 업로드</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">정확한 분석을 위해 앉은 자세에서 앞모습 사진을 업로드해주세요.</p>
          
          <div className="flex flex-col gap-6 mb-6">
            <PhotoUploader photo={frontPhoto} setPhoto={setFrontPhoto} title="앞모습 사진 (필수)" exampleUrl="https://placehold.co/300x400/BFDBFE/1E40AF?text=Front+View" />
            
            {/* 측면사진 토글 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-md border dark:border-gray-700">
              <div>
                <Label className="text-sm font-medium">측면사진 포함</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  측면사진을 포함하면 더 정확한 분석 결과를 얻을 수 있습니다.
                </p>
              </div>
              <Switch
                checked={includeSidePhoto}
                onCheckedChange={setIncludeSidePhoto}
              />
            </div>

            {includeSidePhoto && (
              <PhotoUploader photo={sidePhoto} setPhoto={setSidePhoto} title="옆모습 사진 (선택)" exampleUrl="https://placehold.co/300x400/BFDBFE/1E40AF?text=Side+View" />
            )}
          </div>

          <Button
            onClick={() => {
              if (canStartAnalysis) {
                const analysisId = getAnalysisIdForUser(user?.id);
                navigate(`/analysis-result/${analysisId}`, { state: { analysis: dummyAnalysis } });
              }
            }}
            disabled={!canStartAnalysis}
            className="w-full text-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            분석 시작하기
          </Button>
        </Card>
      </main>
    </div>
  );
};

export default PhotoUpload;
