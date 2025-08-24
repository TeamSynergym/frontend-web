import { X } from "lucide-react";
import { HiUser } from "react-icons/hi";
import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import {
  getActiveSession,
  getChatHistory,
  sendAiCoachMessage,
  sendYoutubeMessage,
  type ChatMessageDTO,
  type ChatRequestDTO,
  type ChatResponseDTO
} from "../../services/api/chatbotApi";
import { useUserStore } from "../../store/userStore";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchExerciseByExactName } from '@/services/api/exerciseApi';
import { createRoutineWithExercise, addExerciseToRoutineApi, getRoutinesByUser, fetchExercisesInRoutine } from '@/services/api/routineApi';
import type { AnalysisHistoryItem } from '@/types/index';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initType?: 'video' | 'consult' | null;
  initPayload?: any;
  onInputFocus?: () => void;
  userId?: number;
}

interface ChatMessage {
  type: "user" | "bot";
  content: React.ReactNode;
  timestamp?: string;
}

const CHATBOT_CONFIG = {
  VIDEO_URL: 'https://www.youtube.com/watch?v=fFIL0rlRH78',
  THUMBNAIL_URL: 'https://img.youtube.com/vi/fFIL0rlRH78/0.jpg',
  VIDEO_MESSAGE: '스크립트 요약과 댓글의 분석이 필요할 경우 요청주세요.',
  CONSULT_MESSAGE: 'OOO 운동을 추천드립니다. 루틴에 추가하시겠습니까?'
} as const;

function getYoutubeId(url: string) {
  const match = url.match(/(?:v=|be\/|embed\/|googleusercontent.com\/youtube.com\/)([\w-]{11}|\d+)/);
  return match ? match[1] : '';
}

const ChatModal = forwardRef<any, Props>(({ isOpen, onClose, initType, initPayload, onInputFocus, userId }, ref) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const { user } = useUserStore();
  const [isMinimized, setIsMinimized] = useState(true);
  const initialRequestSentRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // initPayload에서 모든 필요한 데이터 추출
  const analysis = initPayload?.analysis;
  const historyId = initPayload?.historyId;
  const initialUserMessage = initPayload?.initialUserMessage;
  const initialVideoUrl = initPayload?.initialVideoUrl;
  
  // analysis에서 직접 추천운동명 가져오기
  const recommendedExerciseName = analysis?.recommendedExercise?.name || null;
  const [showRoutineSelect, setShowRoutineSelect] = useState(false);
  const [userRoutines, setUserRoutines] = useState<any[]>([]); // Routine 타입으로 교체 가능
  const [routinesLoaded, setRoutinesLoaded] = useState(false); // 루틴 로드 상태 추적

  // handleCommentSummary를 ChatModal 함수 내부에 선언
  const handleCommentSummary = async (videoUrl: string) => {
    if (!userId || !historyId) return;
    
    const userMessage: ChatMessage = { type: "user", content: `댓글 요약해주세요: ${videoUrl}` };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    const payload: ChatRequestDTO = {
      type: 'comment_summary',
      userId,
      historyId,
      message: `댓글 요약해주세요: ${videoUrl}`,
      videoUrl,
    };
    
    try {
      const aiRes = await sendYoutubeMessage(payload);
      setIsLoading(false);
      
      if (aiRes.type === 'error') {
        setMessages(prev => [
          ...prev,
          { type: "bot", content: aiRes.response }
        ]);
        return;
      }
      
      // 댓글 요약 응답 처리
      let botContent: React.ReactNode;
      
      if (aiRes.youtubeSummary?.comment_summary) {
        // 댓글 요약이 있는 경우
        botContent = (
          <div>
            <div className="mb-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
              <h4 className="font-semibold text-yellow-800 mb-2">📊 댓글 요약</h4>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiRes.youtubeSummary.comment_summary}</ReactMarkdown>
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiRes.response}</ReactMarkdown>
          </div>
        );
      } else {
        // 댓글 요약이 없는 경우 (댓글 수 부족 등)
        botContent = <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiRes.response}</ReactMarkdown>;
      }
      
      const botMessage: ChatMessage = { type: "bot", content: botContent };
      setMessages(prev => [...prev, botMessage]);
    } catch (e) {
      setIsLoading(false);
      setMessages(prev => [
        ...prev,
        { type: "bot", content: "댓글 요약 중 오류가 발생했습니다. 다시 시도해 주세요." }
      ]);
    }
  };

  // 신규 루틴에 추가
  const handleAddToNewRoutine = async () => {
    if (!userId || !recommendedExerciseName) return;
    const exercise = await fetchExerciseByExactName(recommendedExerciseName);
    if (!exercise) {
      alert('해당 이름의 운동이 존재하지 않습니다.');
      return;
    }
    const routineName = "AI 추천 루틴";
    const routineDescription = "AI가 추천한 맞춤 루틴입니다.";
    const order = 1;
    try {
      const createdRoutine = await createRoutineWithExercise(userId, {
        routineDTO: { name: routineName, description: routineDescription },
        exerciseId: exercise.id,
        order
      });
      alert('신규 루틴에 운동이 추가되었습니다!');
      navigate(`/routines/${createdRoutine.id}`); // 상세페이지로 이동
    } catch (e) {
      alert('신규 루틴 추가에 실패했습니다.');
    }
  };

  // 기존 루틴에 추가 버튼 클릭 시 루틴 목록 로드 및 모달 노출 (캐싱 적용)
  const handleShowRoutineSelect = async () => {
    if (!userId) return;
    
    // 이미 루틴을 로드했다면 캐시된 데이터 사용
    if (!routinesLoaded) {
      try {
        const routines = await getRoutinesByUser(userId);
        console.log('[FRONTEND DEBUG] 기존 루틴 목록 로드:', routines);
        setUserRoutines(routines);
        setRoutinesLoaded(true);
      } catch (error) {
        console.error('[FRONTEND ERROR] 루틴 목록 로드 실패:', error);
        setUserRoutines([]);
      }
    }
    
    setShowRoutineSelect(true);
  };

  // 기존 루틴에 운동 추가
  const handleAddToExistingRoutine = async (routineId: number) => {
    if (!recommendedExerciseName) return;
    const exercise = await fetchExerciseByExactName(recommendedExerciseName);
    if (!exercise) {
      alert('해당 이름의 운동이 존재하지 않습니다.');
      return;
    }
    try {
      // 1. 해당 루틴의 운동 목록 조회
      const exercisesInRoutine = await fetchExercisesInRoutine(routineId);
      // 2. 이미 포함되어 있는지 확인
      const isDuplicate = exercisesInRoutine.some((ex: any) => ex.exerciseId === exercise.id);
      if (isDuplicate) {
        alert('이미 해당 루틴에 추가된 운동입니다.');
        return;
      }
      // 3. 중복이 아니면 추가 진행
      await addExerciseToRoutineApi(routineId, exercise.id); // order 파라미터 제거
      alert('기존 루틴에 운동이 추가되었습니다!');
      setShowRoutineSelect(false);
      navigate(`/routines/${routineId}`); // 상세페이지로 이동
    } catch (e) {
      alert('기존 루틴 추가에 실패했습니다.');
    }
  };

  // getChatHistory 응답용 변환 함수 (이미 변환된 메시지 배열 처리)
  const convertHistoryMessageToFrontend = (historyMsg: any): ChatMessage => {
    if (historyMsg.videoUrl) {
      // 유튜브 영상 메시지 처리
      const videoId = getYoutubeId(historyMsg.videoUrl);
      const iframeSrc = `https://www.youtube.com/embed/${videoId}`;
      
      return {
        type: "bot",
        content: (
          <div>
            <iframe
              width="320"
              height="180"
              src={iframeSrc}
              title="추천 영상"
              style={{ border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded mb-2"
            ></iframe>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{historyMsg.content}</ReactMarkdown>
          </div>
        )
      };
    } else {
      // 일반 텍스트 메시지 처리
      return {
        type: historyMsg.type as "user" | "bot",
        content: <ReactMarkdown remarkPlugins={[remarkGfm]}>{historyMsg.content}</ReactMarkdown>
      };
    }
  };

  // convertBackendMessageToFrontend 함수는 파일 상단에 하나만 정의
  const convertBackendMessageToFrontend = (aiRes: any) => {
    console.log('[DEBUG] === convertBackendMessageToFrontend 함수 시작 ===');
    console.log('[DEBUG] 입력받은 aiRes:', aiRes);
    let botMessage: ChatMessage;

    if (aiRes.videoUrl || (aiRes as any).video_url) {
      const videoUrl = aiRes.videoUrl || (aiRes as any).video_url;
      const videoId = getYoutubeId(videoUrl);
      const iframeSrc = `https://www.youtube.com/embed/${videoId}`;
      const commentCount = aiRes.commentCount || 0;
      const commentSummary = aiRes.youtubeSummary?.comment_summary;
      const hasCommentSummary =
        typeof commentSummary === "string" &&
        commentSummary.trim() !== "" &&
        commentSummary !== "댓글 개수가 10개 미만으로 댓글 요약을 제공하지 않습니다.";
      const showCommentButton = commentCount >= 10 && hasCommentSummary;

      // --- 스크립트 요약 카드 ---
      const summary = aiRes.youtubeSummary?.summary;
      const intensity = aiRes.youtubeSummary?.intensity;
      const routine = aiRes.youtubeSummary?.routine;
      const targetBodyParts = aiRes.youtubeSummary?.target_body_parts;

      botMessage = {
        type: "bot",
        content: (
          <div>
            <iframe
              width="320"
              height="180"
              src={iframeSrc}
              title={aiRes.videoTitle || (aiRes as any).video_title || "추천 영상"}
              style={{ border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded mb-2"
            ></iframe>
            {/* 스크립트 요약 카드 */}
            {summary && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                <h4 className="font-semibold text-blue-800 mb-2">🎬 영상 요약</h4>
                <div className="mb-2"><b>요약:</b> <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown></div>
                {intensity && <div className="mb-1"><b>운동 강도:</b> {intensity}</div>}
                {routine && Array.isArray(routine) && (
                  <div className="mb-1">
                    <b>루틴:</b>
                    <ul className="list-disc ml-5">
                      {routine.map((step: string, idx: number) => (
                        <li key={idx}><ReactMarkdown remarkPlugins={[remarkGfm]}>{step}</ReactMarkdown></li>
                      ))}
                    </ul>
                  </div>
                )}
                {targetBodyParts && Array.isArray(targetBodyParts) && (
                  <div className="mb-1"><b>타겟 부위:</b> {targetBodyParts.join(", ")}</div>
                )}
              </div>
            )}
            {/* 댓글 요약 버튼/메시지 */}
            {showCommentButton ? (
              <button
                onClick={() => handleCommentSummary(videoUrl)}
                className="mt-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                📊 댓글 요약 보기 ({commentCount}개 댓글)
              </button>
            ) : null}
          </div>
        )
      };
    } else if (aiRes.type === 'ai_coach' && (aiRes.exercise_info || aiRes.exerciseInfo)) {
      // AI 코치 응답인 경우 운동 정보와 함께 표시
      console.log('[DEBUG] === AI 코치 응답 감지 시작 ===');
      console.log('[DEBUG] aiRes:', aiRes);
      console.log('[DEBUG] aiRes.type:', aiRes.type);
      console.log('[DEBUG] aiRes.type === ai_coach:', aiRes.type === 'ai_coach');
      console.log('[DEBUG] exercise_info:', aiRes.exercise_info);
      console.log('[DEBUG] exerciseInfo:', aiRes.exerciseInfo);
      console.log('[DEBUG] exercise_info 존재:', !!aiRes.exercise_info);
      console.log('[DEBUG] exerciseInfo 존재:', !!aiRes.exerciseInfo);
      
      // exercise_info 또는 exerciseInfo 중 존재하는 것 사용
      const exerciseInfo = aiRes.exercise_info || aiRes.exerciseInfo;
      console.log('[DEBUG] 최종 사용할 exerciseInfo:', exerciseInfo);
      console.log('[DEBUG] 운동 정보 카드 생성 시작');
      botMessage = {
        type: "bot",
        content: (
          <div>
            {/* AI 코치 응답 메시지 */}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiRes.response}</ReactMarkdown>
            
            {/* 운동 정보 카드 */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">💪 추천 운동 정보</h4>
              
              {/* 운동 이미지 */}
              {exerciseInfo.thumbnail_url && (
                <div className="mb-3">
                  <img 
                    src={exerciseInfo.thumbnail_url} 
                    alt={exerciseInfo.name}
                    className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      if (exerciseInfo.url) {
                        console.log('[DEBUG] 썸네일 클릭 - URL 열기:', exerciseInfo.url);
                        window.open(exerciseInfo.url, '_blank');
                      }
                    }}
                    title="클릭하면 운동 상세 정보를 확인할 수 있습니다"
                  />
                  <div className="text-xs text-gray-500 mt-1">클릭하면 운동 상세 정보를 확인할 수 있습니다</div>
                </div>
              )}
              
              {/* 운동 상세 정보 */}
              <div className="space-y-2 text-sm">
                <div><span className="font-medium text-gray-700 dark:text-gray-300">운동명:</span> {exerciseInfo.name}</div>
                {exerciseInfo.category && (
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">카테고리:</span> {exerciseInfo.category}</div>
                )}
                {exerciseInfo.difficulty && (
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">난이도:</span> {exerciseInfo.difficulty}</div>
                )}
                {exerciseInfo.target_body_parts && (
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">타겟 부위:</span> {exerciseInfo.target_body_parts}</div>
                )}
                {exerciseInfo.equipment && (
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">필요 장비:</span> {exerciseInfo.equipment}</div>
                )}
                {exerciseInfo.calories_burn && (
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">소모 칼로리:</span> {exerciseInfo.calories_burn}</div>
                )}
                {exerciseInfo.description && (
                  <div className="mt-3 p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                    <span className="font-medium text-gray-700 dark:text-gray-300">운동 설명:</span>
                    <div className="mt-1 text-gray-600 dark:text-gray-400">{exerciseInfo.description}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      };
    } else {
      botMessage = {
        type: "bot",
        content: <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiRes.response}</ReactMarkdown>
      };
    }

    console.log('[DEBUG] === convertBackendMessageToFrontend 함수 종료 ===');
    console.log('[DEBUG] 반환할 botMessage:', botMessage);
    return botMessage;
  };

  // userId, sessionId가 바뀔 때만 상태 초기화
  useEffect(() => {
    setSessionId("");
    setMessages([]);
    setInput("");
    setIsMinimized(true);
    initialRequestSentRef.current = false;
    // 사용자가 변경되면 루틴 캐시도 초기화
    setUserRoutines([]);
    setRoutinesLoaded(false);
    setShowRoutineSelect(false);
  }, [userId]);

  // ESC 키 누르면 minimized로 전환
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMinimized(true);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // 모달이 닫힐 때 중복 호출 ref 초기화
  useEffect(() => {
    if (!isOpen) {
      initialRequestSentRef.current = false;
    }
  }, [isOpen]);

  // 세션 조회 및 대화 내역 로드
  const loadSessionAndHistory = async (): Promise<string | null> => {
    if (!userId) return null;
    try {
      let sid = sessionId;
      if (!sid || sid.trim() === '') {
        const res = await getActiveSession(userId);
        sid = res;
        if (!sid || sid.trim() === '') {
          setSessionId('');
          setMessages([]);
          console.log('[DEBUG] 세션이 없어서 빈 메시지로 초기화');
          return '';
        }
        setSessionId(sid);
      }
      if (sid) {
        const historyRes = await getChatHistory(userId);
        const historyData = historyRes || [];
        console.log('[DEBUG] 이전 대화 내용 로드:', historyData.length, '개 메시지');
        setMessages(historyData.map(convertHistoryMessageToFrontend));
      } else {
        setMessages([]);
        console.log('[DEBUG] 세션은 있지만 대화 내용이 없음');
      }
      return sid;
    } catch (error) {
      setMessages([]);
      console.log('[DEBUG] 대화 내용 로드 중 에러:', error);
      return null;
    }
  };

  // ChatModal이 열릴 때마다 항상 Redis에서 대화 내역 불러오기
  useEffect(() => {
    if (!isOpen || !userId) return;
    let isMounted = true;
    loadSessionAndHistory().then((sid) => {
      if (isMounted && sid) {
        // 대화 내역을 불러온 후, messages 상태에 변환해서 저장
        // 이미 loadSessionAndHistory에서 처리됨
      }
    });
    return () => { isMounted = false; };
  }, [isOpen, userId]);

  // 버튼 클릭만으로 FastAPI 호출: isOpen+userId+historyId+initialUserMessage(또는 initialVideoUrl) 있으면 바로 요청
  useEffect(() => {
    if (
      isOpen &&
      userId &&
      historyId &&
      !isNaN(historyId) &&
      !initialRequestSentRef.current &&
      (initialUserMessage || initialVideoUrl)
    ) {
      initialRequestSentRef.current = true;
      setIsLoading(true);
      
      // 먼저 이전 대화 내용을 로드한 후 새로운 메시지 추가
      loadSessionAndHistory().then((sid) => {
        const message = initialUserMessage || (initType === 'video' ? '추천 영상 보여줘' : '운동 추천해줘');
        const payload: ChatRequestDTO = {
          type: initType === 'video' ? 'recommend' : undefined,
          userId,
          historyId,
          message,
        };
        const apiCall = initType === 'video' ? sendYoutubeMessage : sendAiCoachMessage;
        console.log('[DEBUG] API 호출 타입:', initType === 'video' ? 'YouTube' : 'AI Coach');
        apiCall(payload).then(aiRes => {
          setIsLoading(false);
          const userMsg: ChatMessage = { type: 'user', content: message };
          
                     // AI 응답을 프론트엔드 메시지 형식으로 변환
           console.log('[DEBUG] convertBackendMessageToFrontend 호출 전 aiRes:', aiRes);
           const botMsg = convertBackendMessageToFrontend(aiRes);
           console.log('[DEBUG] convertBackendMessageToFrontend 호출 후 botMsg:', botMsg);
           console.log('[DEBUG]', initType === 'video' ? 'YouTube' : 'AI Coach', '응답 처리 완료:', botMsg);
          setMessages(prev => [...prev, userMsg, botMsg]); // 이전 대화내역에 추가
        }).catch((error) => {
          console.log('[DEBUG]', initType === 'video' ? 'YouTube' : 'AI Coach', 'API 호출 실패:', error);
          setIsLoading(false);
        });
      });
    }
  }, [isOpen, userId, historyId, initialUserMessage, initialVideoUrl, initType]);

  // 초기 메시지 추가 (기존 Spring용, FastAPI 즉시 호출 시에는 생략)
  const addInitialMessage = async (currentMessages: ChatMessage[]) => {
    // 더 이상 사용하지 않음
  };

  // 세션 로드 후 초기 메시지 추가
  useEffect(() => {
    // 더 이상 사용하지 않음
  }, []);

  // 메시지 전송 핸들러
  const handleSend = async () => {
    if (!input.trim() || !userId || !historyId) {
      return;
    }
    
    const userMessage: ChatMessage = { type: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    const payload: ChatRequestDTO = {
      type: initType === 'video' ? 'recommend' : undefined,
      userId,
      historyId,
      message: input,
      recommendedExercise: analysis?.recommendedExercise // 추가
    };
    
    try {
      const apiCall = initType === 'video' ? sendYoutubeMessage : sendAiCoachMessage;
      const aiRes = await apiCall(payload);
      setIsLoading(false);
      
      if (aiRes.type === 'error') {
        setMessages(prev => [
          ...prev,
          { type: "bot", content: aiRes.response }
        ]);
        return;
      }
             // AI 응답을 프론트엔드 메시지 형식으로 변환
       console.log('[DEBUG] handleSend에서 convertBackendMessageToFrontend 호출 전 aiRes:', aiRes);
       const botMessage = convertBackendMessageToFrontend(aiRes);
       console.log('[DEBUG] handleSend에서 convertBackendMessageToFrontend 호출 후 botMessage:', botMessage);
       console.log('setMessages에 들어가는 botMessage:', botMessage);
      setMessages(prev => [...prev, botMessage]);
    } catch (e) {
      setIsLoading(false);
      setMessages(prev => [
        ...prev,
        { type: "bot", content: "AI 챗봇 응답에 실패했습니다. 다시 시도해 주세요." }
      ]);
    }
  };

  // 부모에서 maximize/minimize 제어 가능
  useImperativeHandle(ref, () => ({
    maximize: () => setIsMinimized(false),
    minimize: () => setIsMinimized(true),
  }));

  // isOpen이 true가 될 때마다 minimized로 초기화
  useEffect(() => {
    if (isOpen) {
      setIsMinimized(true);
    }
  }, [isOpen]);

  // 헤더 클릭 시 minimized/maximized 토글
  const handleHeaderClick = () => {
    setIsMinimized((prev) => !prev);
  };

  // messages가 바뀔 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className={`
        fixed z-50 bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col
        left-0 top-0 w-screen h-screen rounded-none
        sm:left-auto sm:top-auto sm:right-[6.5rem] sm:bottom-6 sm:rounded-xl
        ${isMinimized
          ? 'sm:w-100 sm:h-150'
          : 'sm:w-[1000px] sm:h-[800px]'
        }
        ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
      `}
    >
      {/* 헤더: 타이틀, 닫기 버튼, 클릭 시 크기 토글 */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer select-none bg-white dark:bg-gray-900" onClick={handleHeaderClick} title="클릭 시 크기 전환">
        <span className="font-semibold text-lg text-gray-900 dark:text-white">Synergym AI</span>
        <button onClick={e => { e.stopPropagation(); onClose(); }}>
          <X className="w-5 h-5 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white" />
        </button>
      </div>
      {/* 메시지 영역 */}
      <div
        ref={messagesEndRef}
        className="p-4 flex-1 overflow-y-auto text-sm text-gray-700 dark:text-gray-100 flex flex-col bg-white dark:bg-gray-900"
      >
        {(() => { console.log('messages:', messages); return null; })()}
        {messages.map((msg, idx) => {
          if (msg.type === "bot" && typeof msg.content === "string" && msg.content.startsWith("[운동영상]")) {
            const videoId = "fFIL0rlRH78";
            const messageText = msg.content.replace("[운동영상]", "").trim();
            return (
              <div key={idx} className="flex items-end gap-2 mb-4">
                <div className="flex flex-col items-start">
                  <div className="bg-blue-100 dark:bg-blue-900 text-gray-800 dark:text-white rounded-2xl px-4 py-3 max-w-[420px] shadow-sm relative">
                    <div>
                      <iframe
                        width="320"
                        height="180"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video player"
                        style={{ border: "none" }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded mb-2"
                      ></iframe>
                      <div>{messageText}</div>
                      <button
                        onClick={() => handleCommentSummary(`https://www.youtube.com/watch?v=${videoId}`)}
                        className="mt-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        📊 댓글 요약 보기
                      </button>
                    </div>
                  </div>
                  <HiUser className="w-7 h-7 text-blue-400 dark:text-blue-300 mt-1 ml-2" />
                </div>
              </div>
            );
          }
          return msg.type === 'bot' ? (
            <div key={idx} className="flex items-end gap-2 mb-4">
              <div className="flex flex-col items-start">
                <div className="bg-blue-100 dark:bg-blue-900 text-gray-800 dark:text-white rounded-2xl px-4 py-3 max-w-[420px] shadow-sm relative">
                  {msg.content}
                </div>
                {/* bot 메시지 하단에 루틴 추가 버튼 표시 */}
                {recommendedExerciseName && (
                  <div className="flex gap-2 mt-2 ml-2">
                    <button 
                      className="bg-green-500 dark:bg-green-700 hover:bg-green-600 dark:hover:bg-green-800 text-white px-2 py-1 rounded text-sm" 
                      onClick={handleAddToNewRoutine}
                    >
                      신규 루틴에 추가
                    </button>
                    <button 
                      className="bg-blue-500 dark:bg-blue-700 hover:bg-blue-600 dark:hover:bg-blue-800 text-white px-2 py-1 rounded text-sm" 
                      onClick={handleShowRoutineSelect}
                    >
                      기존 루틴에 추가
                    </button>
                  </div>
                )}
                <HiUser className="w-7 h-7 text-blue-400 dark:text-blue-300 mt-1 ml-2" />
              </div>
            </div>
          ) : (
            <div key={idx} className="flex items-end gap-2 mb-4 justify-end">
              <div className="flex flex-col items-end">
                <div className="bg-blue-500 dark:bg-blue-700 text-white rounded-2xl px-4 py-3 max-w-[420px] shadow-sm relative">
                  {msg.content}
                </div>
                <HiUser className="w-7 h-7 text-blue-500 dark:text-blue-300 mt-1 mr-2 self-end" />
              </div>
            </div>
          );
        })}
        {isLoading && (
  <div className="flex items-center gap-2 text-blue-500 dark:text-blue-300 py-2">
    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
    AI 코치가 답변을 생성 중입니다...
  </div>
)}
      </div>
      {/* 입력창/전송 폼 */}
      <form
        className="flex items-center border-t border-gray-200 dark:border-gray-700 p-3 gap-2 bg-white dark:bg-gray-900"
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
          type="text"
          placeholder="메시지를 입력하세요..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => {
            setIsMinimized(false); // 입력창 포커스 시 maximize
            if (onInputFocus) onInputFocus();
          }}
        />
        <button
          type="submit"
          className="bg-blue-500 dark:bg-blue-700 hover:bg-blue-600 dark:hover:bg-blue-800 text-white px-4 py-2 rounded"
        >
          전송
        </button>
      </form>
      {/* 기존 루틴 선택 모달 렌더링 부분(예시) */}
      {showRoutineSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">기존 루틴에 추가</h3>
            {(() => { console.log('[FRONTEND DEBUG] 렌더링되는 userRoutines:', userRoutines); return null; })()}
            {userRoutines.length > 0 ? (
              <ul className="space-y-2">
                {userRoutines.map(routine => (
                  <li key={routine.id} className="flex justify-between items-center p-2 border rounded border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <span className="text-gray-900 dark:text-white">{routine.name}</span>
                    <button
                      className="bg-blue-500 dark:bg-blue-700 hover:bg-blue-600 dark:hover:bg-blue-800 text-white px-2 py-1 rounded text-sm"
                      onClick={() => handleAddToExistingRoutine(routine.id)}
                    >
                      추가
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 dark:text-gray-300">추가할 수 있는 루틴이 없습니다.</div>
            )}
            <button
              className="mt-4 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded"
              onClick={() => setShowRoutineSelect(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default ChatModal;