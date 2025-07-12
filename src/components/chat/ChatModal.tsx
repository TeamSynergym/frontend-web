import { X } from "lucide-react";
import { HiUser } from "react-icons/hi";
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { 
  getActiveSession, 
  getChatHistory, 
  sendChatMessage, 
  saveInitialMessage, 
  forceAddMessage as forceAddMessageApi,
  type ChatRequestDTO,
  type ChatResponseDTO,
  type ChatMessageDTO
} from "../../services/api/chatbotApi";
import { useUserStore } from "../../store/userStore";

/**
 * SynergyM AI 챗봇 모달 컴포넌트
 * - 챗봇/사용자 메시지 UI
 * - 유튜브 영상 추천, 상담 등 다양한 초기 메시지 지원
 * - 입력창/전송, 닫기 버튼 제공
 */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initType?: 'video' | 'consult' | null;
  initPayload?: any;
  onInputFocus?: () => void;
}

interface ChatMessage {
  type: "user" | "bot";
  content: React.ReactNode;
  timestamp?: string;
}

// 상수 정의
const CHATBOT_CONFIG = {
  VIDEO_URL: 'https://www.youtube.com/watch?v=fFIL0rlRH78',
  THUMBNAIL_URL: 'https://img.youtube.com/vi/fFIL0rlRH78/0.jpg',
  VIDEO_MESSAGE: '스크립트 요약과 댓글의 분석이 필요할 경우 요청주세요.',
  CONSULT_MESSAGE: 'OOO 운동을 추천드립니다. 루틴에 추가하시겠습니까?'
} as const;

// 유튜브 URL에서 영상 ID 추출 (googleusercontent URL 형식 지원 추가)
function getYoutubeId(url: string) {
  const match = url.match(/(?:v=|be\/|embed\/|googleusercontent.com\/youtube.com\/)([\w-]{11}|\d+)/);
  return match ? match[1] : '';
}

// 백엔드 메시지를 프론트엔드 형식으로 변환하는 유틸리티 함수
function convertBackendMessageToFrontend(msg: ChatMessageDTO): ChatMessage {
  if (msg.type === 'bot' && msg.videoUrl) {
    const videoId = getYoutubeId(msg.videoUrl);
    return {
      type: 'bot',
      content: (
        <div>
          <iframe
            width="320"
            height="180"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            style={{ border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded mb-2"
          ></iframe>
          <div>{msg.content}</div>
        </div>
      ),
      timestamp: msg.timestamp
    };
  }
  return {
    type: msg.type as "user" | "bot",
    content: msg.content,
    timestamp: msg.timestamp
  };
}

// 초기 메시지 생성 유틸리티 함수
function createInitialMessage(type: 'video' | 'consult', payload: any, response: string): ChatMessage | null {
  if (type === "video") {
    const videoId = getYoutubeId(payload.videoUrl);
    return {
      type: "bot",
      content: (
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
          <div>{response}</div>
        </div>
      ),
    };
  } else if (type === "consult") {
    return { type: "bot", content: response };
  }
  return null;
}

// 전역 챗봇 오픈 함수 타입 정의
type OpenChatbotFunction = (type: 'video' | 'consult', payload?: any) => void;

// 전역 챗봇 상태 관리 (사용자별로 관리)
interface GlobalChatbotState {
  isOpen: boolean;
  initType: 'video' | 'consult' | null;
  initPayload: any;
  onClose: (() => void) | null;
}

// 사용자별 전역 상태 저장소
let globalChatbotStates: Record<number, GlobalChatbotState> = {};

// 전역 상태 관리 유틸리티 함수들
const clearAllGlobalStates = () => {
  globalChatbotStates = {};
  if (typeof window !== 'undefined') {
    (window as any).globalChatbotStates = globalChatbotStates;
  }
};

const clearUserGlobalState = (userId: number) => {
  if (globalChatbotStates[userId]) {
    delete globalChatbotStates[userId];
    if (typeof window !== 'undefined') {
      (window as any).globalChatbotStates = globalChatbotStates;
    }
  }
};

const clearOtherUsersGlobalStates = (currentUserId: number) => {
  Object.keys(globalChatbotStates).forEach(key => {
    const keyUserId = parseInt(key);
    if (keyUserId !== currentUserId) {
      delete globalChatbotStates[keyUserId];
    }
  });
  if (typeof window !== 'undefined') {
    (window as any).globalChatbotStates = globalChatbotStates;
  }
};

// 현재 사용자의 전역 상태를 가져오는 함수
const getGlobalChatbotState = (userId?: number): GlobalChatbotState => {
  if (!userId) {
    return {
      isOpen: false,
      initType: null,
      initPayload: null,
      onClose: null
    };
  }
  
  if (!globalChatbotStates[userId]) {
    globalChatbotStates[userId] = {
      isOpen: false,
      initType: null,
      initPayload: null,
      onClose: null
    };
  }
  
  return globalChatbotStates[userId];
};

// 현재 사용자의 전역 상태를 설정하는 함수
const setGlobalChatbotState = (userId: number, state: Partial<GlobalChatbotState>) => {
  if (!globalChatbotStates[userId]) {
    globalChatbotStates[userId] = {
      isOpen: false,
      initType: null,
      initPayload: null,
      onClose: null
    };
  }
  
  globalChatbotStates[userId] = { ...globalChatbotStates[userId], ...state };
};

// 전역 챗봇 오픈 함수 (사용자별 상태 관리)
const openChatbot: OpenChatbotFunction = (type: 'video' | 'consult', payload?: any) => {
  console.log('ChatModal: openChatbot called with type:', type);
  // Get userId from useUserStore
  const userId = (window as any).globalUserId;
  if (!userId) {
    alert('로그인이 필요합니다.');
    return;
  }
  if (type === 'video') {
    const videoPayload = {
      videoUrl: CHATBOT_CONFIG.VIDEO_URL,
      thumbnail: CHATBOT_CONFIG.THUMBNAIL_URL,
      message: CHATBOT_CONFIG.VIDEO_MESSAGE
    };
    setGlobalChatbotState(userId, {
      isOpen: true,
      initType: 'video',
      initPayload: videoPayload
    });
  } else if (type === 'consult') {
    const consultPayload = {
      message: CHATBOT_CONFIG.CONSULT_MESSAGE
    };
    setGlobalChatbotState(userId, {
      isOpen: true,
      initType: 'consult',
      initPayload: consultPayload
    });
  }
  const currentState = getGlobalChatbotState(userId);
  window.dispatchEvent(new CustomEvent('chatbotStateChanged', { 
    detail: { type, payload: currentState.initPayload, userId } 
  }));
  if (typeof window !== 'undefined') {
    (window as any).globalChatbotStates = globalChatbotStates;
  }
};

// window 객체에 함수 등록
if (typeof window !== 'undefined') {
  (window as any).openChatbot = openChatbot;
  (window as any).globalChatbotStates = globalChatbotStates;
}

const ChatModal = forwardRef<any, Props>(({ isOpen, onClose, initType, initPayload, onInputFocus }, ref) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const { user } = useUserStore();
  const userId = user?.id;

  // 챗봇 크기 상태: 처음엔 작게, 입력창 포커스 시 커짐
  const [isMinimized, setIsMinimized] = useState(true);
  console.log('[ChatModal] user:', user, 'userId:', userId);

  // 로그아웃/로그인 시 전역 상태 및 내부 상태 초기화
  useEffect(() => {
    if (!userId) {
      setSessionId("");
      setMessages([]);
      // 로그아웃 시 전역 상태 완전 초기화
      if (typeof window !== 'undefined') {
        clearAllGlobalStates(); // 유틸리티 함수 사용
        (window as any).openChatbot = openChatbot;
      }
    } else {
      // 새로운 사용자 로그인 시 현재 사용자 ID 설정
      if (typeof window !== 'undefined') {
        (window as any).globalUserId = userId; // 전역 변수에 설정
      }
    }
  }, [userId]);

  // Add this useEffect to sync window.globalUserId with userId
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).globalUserId = userId;
    }
  }, [userId]);

  // 세션 조회 및 대화 내역 로드 통합 함수
  const loadSessionAndHistory = async (): Promise<string | null> => {
    if (!userId) return null;
    
    try {
      // 기존 sessionId가 있으면 우선 사용
      let sid = sessionId;
      
      // sessionId가 없거나 빈 문자열이면 서버에서 조회
      if (!sid || sid.trim() === '') {
        const res = await getActiveSession(userId);
        sid = res;
        console.log('[ChatModal][SESSION] 서버에서 조회한 sessionId:', sid);
        
        // 세션이 없으면 빈 문자열 반환 (새 세션은 백엔드에서 생성)
        if (!sid || sid.trim() === '') {
          console.log('[ChatModal][SESSION] 기존 세션 없음, 새 세션은 백엔드에서 생성됨');
          setSessionId('');
          setMessages([]);
          return '';
        }
        
        setSessionId(sid);
      }
      
      console.log('[ChatModal][SESSION] userId:', userId, 'sessionId:', sid, 'Redis key:', `chat:session:${userId}:${sid}`);
      
      if (sid) {
        const historyRes = await getChatHistory(userId, sid);
        const historyData = historyRes || [];
        setMessages(historyData.map(convertBackendMessageToFrontend));
      } else {
        setMessages([]);
      }
      
      return sid;
    } catch (error) {
      console.error('[ChatModal] 세션/히스토리 로드 실패:', error);
      setMessages([]);
      return null;
    }
  };

  // userId가 바뀌거나 챗봇이 열릴 때마다 세션과 대화 내역 로드
  useEffect(() => {
    if (!isOpen || !userId) return;
    
    console.log('[ChatModal][OPEN] Triggered by:', {
      initType,
      initPayload,
      globalChatbotStates: globalChatbotStates,
      userId
    });
    
    let isMounted = true;
    loadSessionAndHistory().then((sid) => {
      if (isMounted && sid) {
        // 세션 로드 완료 후 초기 메시지 추가 로직은 별도 useEffect에서 처리
      }
    });
    
    return () => { isMounted = false; };
  }, [isOpen, userId]);

  // 안내 메시지 강제 추가 함수 (백엔드에 저장)
  const forceAddMessage = async (type: 'video' | 'consult', payload: any) => {
    if (!userId) return; // 사용자 ID가 없으면 종료
    
    // 기존 sessionId 우선 사용
    let sid = sessionId;
    
    // sessionId가 없거나 빈 문자열이면 서버에서 조회
    if (!sid || sid.trim() === '') {
      try {
        const res = await getActiveSession(userId); // 세션 정보 요청
        sid = res; // 세션 ID
        console.log('forceAddMessage: 서버에서 조회한 sessionId:', sid);
        
        // 세션이 없으면 빈 문자열로 설정 (새 세션은 백엔드에서 생성)
        if (!sid || sid.trim() === '') {
          console.log('forceAddMessage: 기존 세션 없음, 새 세션은 백엔드에서 생성됨');
          sid = '';
        }
        
        setSessionId(sid); // 세션 ID 설정
      } catch (e) {
        console.error('forceAddMessage: sessionId를 받아오지 못함', e); // 세션 ID 받아오기 실패 로그
        return; // 종료
      }
    }
    
    let content = ''; // 메시지 내용
    let videoUrl = ''; // 유튜브 URL
    if (type === 'video') {
      content = payload.message; // 메시지 내용
      videoUrl = payload.videoUrl; // 유튜브 URL
    } else if (type === 'consult') {
      content = payload.message; // 메시지 내용
    }
    
    try {
      // 백엔드에 저장
      const res = await forceAddMessageApi({
        userId, // 사용자 ID
        sessionId: sid, // 세션 ID
        message: type, // 메시지 타입
        content, // 메시지 내용
        videoUrl, // 유튜브 URL
      });
      console.log('forceAddMessage: 메시지 추가 성공', res); // 메시지 추가 성공 로그

      // sessionId가 새로 생성되었으면 반드시 갱신
      if (res.sessionId && res.sessionId !== sid) {
        setSessionId(res.sessionId); // 세션 ID 설정
        sid = res.sessionId; // 세션 ID 설정
        console.log('forceAddMessage: sessionId 갱신됨', sid); // 세션 ID 갱신 로그
      }
      
      // 메시지 추가 후 최신 대화 내역 불러오기 (항상 최신 sessionId 사용)
      const historyRes = await getChatHistory(userId, sid); // 대화 내역 요청
      const historyData = historyRes || []; // 대화 내역 데이터
      const convertedMessages: ChatMessage[] = historyData.map(convertBackendMessageToFrontend);
      setMessages(convertedMessages); // 대화 내역 설정
    } catch (e) {
      console.error('forceAddMessage: 메시지 추가 실패', e); // 메시지 추가 실패 로그
    }
  };

  // userId가 바뀌면(로그아웃/로그인) 챗봇 상태를 완전히 초기화합니다.
  useEffect(() => {
    setSessionId(""); // 세션 ID 초기화
    setMessages([]); // 대화 내역 초기화
    setInput(""); // 입력창 초기화
    setIsMinimized(true); // 모달 크기 초기화
    
    // 사용자 변경 시 전역 상태에서 이전 사용자 데이터 정리
    if (typeof window !== 'undefined' && userId) {
      clearOtherUsersGlobalStates(userId); // 유틸리티 함수 사용
    }
  }, [userId]);

  // onClose 함수를 전역 상태에 저장
  useEffect(() => {
    if (userId) {
      setGlobalChatbotState(userId, { onClose });
    }
  }, [onClose, userId]);

  // 초기 메시지 추가 함수
  const addInitialMessage = async (currentMessages: ChatMessage[]) => {
    if (!userId) return;
    
    // props로 전달된 payload와 type을 우선 사용
    const currentGlobalState = getGlobalChatbotState(userId);
    const payload = initPayload || currentGlobalState.initPayload;
    const type = initType || currentGlobalState.initType;
    
    console.log('=== DEBUG INFO ===');
    console.log('initPayload:', initPayload);
    console.log('initType:', initType);
    console.log('globalChatbotStates:', globalChatbotStates);
    console.log('Adding initial message:', { type, payload, currentMessagesLength: currentMessages.length });
    
    // 대화 내역이 없을 때만 초기 메시지 추가
    const currentMessageCount = currentMessages.length;
    console.log('Current message count:', currentMessageCount);
    
    if (currentMessageCount === 0) {
      try {
        // payload나 type이 있으면 해당 타입으로, 없으면 기본 인사
        const messageType = type || 'default';
        
        // 백엔드에 초기 메시지 저장 요청
        const response = await saveInitialMessage({
          userId,
          sessionId,
          message: messageType
        });

        if (response && response.response) {
          let newMessage: ChatMessage | null = null;
          
          if (type === "video" && payload) {
            const videoId = getYoutubeId(payload.videoUrl);
            newMessage = createInitialMessage(type, payload, response.response);
          } else if (type === "consult" && payload) {
            newMessage = createInitialMessage(type, payload, response.response);
          } else {
            newMessage = { type: "bot", content: response.response };
          }

          if (newMessage) {
            setMessages(prev => [...prev, newMessage!]);
          }
        }
      } catch (error) {
        console.error("Failed to save initial message:", error);
        let newMessage: ChatMessage | null = null;
        if (type === "video" && payload) {
          const videoId = getYoutubeId(payload.videoUrl);
          newMessage = createInitialMessage(type, payload, payload.message);
        } else if (type === "consult" && payload) {
          newMessage = createInitialMessage(type, payload, payload.message);
        } else {
          newMessage = { type: "bot", content: "안녕하세요! 무엇을 도와드릴까요?" };
        }

        if (newMessage) {
          setMessages(prev => [...prev, newMessage!]);
        }
      }
    } else {
      console.log('Skipping initial message - conversation already exists');
    }
  };

  // 초기 메시지 추가 로직 (세션 로드 후 실행)
  useEffect(() => {
    if (!isOpen || !userId || !sessionId) return;
    
    // 대화 내역이 비어있을 때만 초기 메시지 추가
    if (messages.length === 0) {
      addInitialMessage([]);
    }
  }, [isOpen, userId, sessionId, messages.length]);

  useEffect(() => {
    (window as any).forceAddChatbotMessage = forceAddMessage;
    return () => {
      (window as any).forceAddChatbotMessage = undefined;
    };
  }, []);

  // 메시지 전송 핸들러 (입력값을 사용자 메시지로 추가 후 초기화)
  const handleSend = async () => {
    if (!input.trim() || !userId) {
      console.log("input or userId missing", input, userId);
      return;
    }
    
    // 기존 sessionId 우선 사용
    let currentSessionId = sessionId;
    
    // sessionId가 없거나 빈 문자열이면 서버에서 조회
    if (!currentSessionId || currentSessionId.trim() === '') {
      try {
        const res = await getActiveSession(userId);
        currentSessionId = res;
        console.log('handleSend: 서버에서 조회한 sessionId:', currentSessionId);
        
        // 세션이 없으면 빈 문자열로 설정 (새 세션은 백엔드에서 생성)
        if (!currentSessionId || currentSessionId.trim() === '') {
          console.log('handleSend: 기존 세션 없음, 새 세션은 백엔드에서 생성됨');
          currentSessionId = '';
        }
        
        setSessionId(currentSessionId);
      } catch (e) {
        console.error('handleSend: sessionId를 받아오지 못함', e);
        setMessages(prev => [
          ...prev,
          { type: "bot", content: "세션 연결에 실패했습니다. 다시 시도해주세요." }
        ]);
        return;
      }
    }
    
    const userMsg: ChatMessage = { type: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    try {
      const res = await sendChatMessage({
        userId,
        sessionId: currentSessionId,
        message: input,
      });
      setMessages(prev => [
        ...prev,
        { type: "bot", content: res.response },
      ]);
      if (res.sessionId) setSessionId(res.sessionId);
    } catch (e) {
      console.error('메시지 전송 실패:', e);
      setMessages(prev => [
        ...prev,
        { type: "bot", content: "메시지 전송에 실패했습니다. 다시 시도해주세요." },
      ]);
    }
  };

  useEffect(() => {
    console.log('messages:', messages); // 대화 내역 로그
  }, [messages]);

  useEffect(() => {
    if (!isOpen || !userId) return;
    console.log('[ChatModal] useEffect - isOpen:', isOpen, 'userId:', userId, 'sessionId:', sessionId); // 모달 상태 로그
  }, [isOpen, userId, sessionId]);

  // expose maximize/minimize methods to parent
  useImperativeHandle(ref, () => ({
    maximize: () => setIsMinimized(false), // 최대화
    minimize: () => setIsMinimized(true), // 최소화
  }));

  // 챗봇이 열릴 때마다 minimized로 초기화
  useEffect(() => {
    if (isOpen) {
      setIsMinimized(true);
      // 모달이 열릴 때 전역 상태에서 isOpen을 true로 설정
      if (userId) {
        setGlobalChatbotState(userId, { isOpen: true });
      }
    } else {
      // 모달이 닫힐 때 전역 상태에서 isOpen을 false로 설정 (대화 내용은 유지)
      if (userId) {
        setGlobalChatbotState(userId, { isOpen: false });
      }
    }
  }, [isOpen, userId]); // 모달이 열릴 때마다 최소화

  // ... 이하 렌더링(JSX) 부분은 기존 코드와 동일합니다 ...
  return (
    <div
      className={`
        fixed z-50 bg-white shadow-xl border border-gray-200 transition-all duration-300 flex flex-col
        left-0 top-0 w-screen h-screen rounded-none
        sm:left-auto sm:top-auto sm:right-[6.5rem] sm:bottom-6 sm:rounded-xl
        ${isMinimized
          ? 'sm:w-100 sm:h-150' // minimized desktop
          : 'sm:w-[1000px] sm:h-[800px]' // maximized desktop
        }
        ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
      `}
    >
      {/* 헤더: 타이틀, 닫기 버튼 */}
      <div className="flex justify-between items-center p-4 border-b">
        <span className="font-semibold text-lg">Synergym AI</span>
        <button onClick={onClose}>
          <X className="w-5 h-5 text-gray-600 hover:text-black" />
        </button>
      </div>
      {/* 메시지 영역 */}
      <div className="p-4 flex-1 overflow-y-auto text-sm text-gray-700 flex flex-col">
        {/* 메시지 렌더링 */}
        {messages.map((msg, idx) => {
          // [운동영상]으로 시작하면 iframe+문구로 변환
          if (msg.type === "bot" && typeof msg.content === "string" && msg.content.startsWith("[운동영상]")) {
            // 실제로는 videoUrl을 저장해야 더 정확하지만, 지금은 텍스트만 있으므로 임시로 하드코딩
            const videoId = "fFIL0rlRH78"; // 실제로는 백엔드에서 videoUrl도 저장해야 함
            const messageText = msg.content.replace("[운동영상]", "").trim();
            return (
              <div key={idx} className="flex items-end gap-2 mb-4">
                <div className="flex flex-col items-start">
                  <div className="bg-blue-100 text-gray-800 rounded-2xl px-4 py-3 max-w-[420px] shadow-sm relative">
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
                    </div>
                  </div>
                  <HiUser className="w-7 h-7 text-blue-400 mt-1 ml-2" />
                </div>
              </div>
            );
          }
          // 일반 bot/user 메시지는 기존대로
          return msg.type === 'bot' ? (
            <div key={idx} className="flex items-end gap-2 mb-4">
              <div className="flex flex-col items-start">
                <div className="bg-blue-100 text-gray-800 rounded-2xl px-4 py-3 max-w-[420px] shadow-sm relative">
                  {msg.content}
                </div>
                <HiUser className="w-7 h-7 text-blue-400 mt-1 ml-2" />
              </div>
            </div>
          ) : (
            <div key={idx} className="flex items-end gap-2 mb-4 justify-end">
              <div className="flex flex-col items-end">
                <div className="bg-blue-500 text-white rounded-2xl px-4 py-3 max-w-[420px] shadow-sm relative">
                  {msg.content}
                </div>
                <HiUser className="w-7 h-7 text-blue-500 mt-1 mr-2 self-end" />
              </div>
            </div>
          );
        })}
      </div>
      {/* 입력창/전송 폼 */}
      <form
        className="flex items-center border-t p-3 gap-2"
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="text"
          placeholder="메시지를 입력하세요..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => {
            setIsMinimized(false);
            if (onInputFocus) onInputFocus();
          }}
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          전송
        </button>
      </form>
    </div>
  );
});

export default ChatModal;