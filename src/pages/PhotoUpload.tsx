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
import { uploadToCloudinary } from '@/services/api/cloudinaryApi';
import { requestAnalysis, requestMergedAnalysis } from '@/services/api/analysisApi';

const LOADING_MIN_TIME = 1000; // 최소 1초 로딩 보장

const PhotoUpload: React.FC = () => {
  useRequireAuth("/photoupload"); // 페이지 최상단에서 인증 체크

  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [sidePhoto, setSidePhoto] = useState<File | null>(null);
  const [includeSidePhoto, setIncludeSidePhoto] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
          <input
            type="file"
            accept="image/*"
            className="hidden"
            capture="environment"
            onChange={e => {
              e.target.files && setPhoto(e.target.files[0]);
            }}
          />
        </label>
      </Button>
    </div>
  );

  // 분석 시작 가능 여부 확인
  const canStartAnalysis = frontPhoto && (includeSidePhoto ? sidePhoto : true);

  const handleStartAnalysis = async () => {
    console.log('분석 시작하기 클릭됨');
    if (!frontPhoto) return;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    setIsAnalyzing(true);
    const start = Date.now();
    try {
      const frontUrl = await uploadToCloudinary(frontPhoto);
      console.log('Cloudinary 업로드 결과 frontUrl:', frontUrl);
      let sideUrl = null;
      if (includeSidePhoto && sidePhoto) {
        sideUrl = await uploadToCloudinary(sidePhoto);
        console.log('Cloudinary 업로드 결과 sideUrl:', sideUrl);
      }
      let analysisResult;
      if (includeSidePhoto && sideUrl) {
        // 정면+측면 모두 있을 때 merge API 호출
        analysisResult = await requestMergedAnalysis(user.id, frontUrl, sideUrl);
      } else {
        // 기존 단일 분석 API 호출
        analysisResult = await requestAnalysis(user.id, frontUrl, 'front');
      }
      console.log('분석 요청 결과:', analysisResult);
      // 결과 페이지로 이동 (state로 분석 결과 전달)
      navigate(`/analysis-result/merged`, { state: { analysis: analysisResult } });
    } catch (error) {
      alert('업로드 또는 분석 요청 실패');
      console.error(error);
    } finally {
      const elapsed = Date.now() - start;
      const remain = Math.max(0, LOADING_MIN_TIME - elapsed);
      setTimeout(() => setIsAnalyzing(false), remain);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto pt-32 px-4 sm:px-8 lg:px-16 pb-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">AI 자세 분석</h1>
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">AI가 분석 중입니다...</h2>
            <p className="text-gray-600 dark:text-gray-400 animate-pulse">사진 업로드 및 분석이 완료될 때까지 잠시만 기다려주세요.</p>
          </div>
        ) : (
          <Card className="p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">사진 업로드</h2>
            <p className="text-gray-600 dark:text-gray-400">정확한 분석을 위해 앞모습 사진을 업로드해주세요.</p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">카메라 정면을 향해 앉거나 서신 후, 머리부터 발끝까지 전신이 화면에 완전히 들어오도록 촬영해주세요. 정확한 진단을 위해 본인만 단독으로 나오도록 해주시면 됩니다.</p>
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
              onClick={handleStartAnalysis}
              disabled={!canStartAnalysis || !user}
              className="w-full text-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            >
              분석 시작하기
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PhotoUpload;
