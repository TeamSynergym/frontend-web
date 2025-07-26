import { useState, forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import ChatButton from "./ChatButton";
import ChatModal from "./ChatModal";
import TopButton from "./TopButton";
import { useLocation } from "react-router-dom";
import { useUserStore } from "../../store/userStore";

interface ChatbotProps {
  historyId?: number;
}

const Chatbot = forwardRef<any, ChatbotProps>((props, ref) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initType, setInitType] = useState<'video' | 'consult' | null>(null);
  const [initPayload, setInitPayload] = useState<any>(null);
  const location = useLocation();
  const { user } = useUserStore();
  const prevLocation = useRef(location.pathname);
  const chatModalRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    open: (type: 'video' | 'consult', payload?: any) => {
      setInitType(type);
      setInitPayload(payload);
      setIsChatOpen(true);
      setTimeout(() => {
        chatModalRef.current?.maximize();
      }, 0);
    }
  }));

  useEffect(() => {
    if (isChatOpen && prevLocation.current !== location.pathname) {
      chatModalRef.current?.minimize();
      prevLocation.current = location.pathname;
    }
  }, [location, isChatOpen]);

  useEffect(() => {
    if (!user && isChatOpen) {
      setIsChatOpen(false);
      setInitType(null);
      setInitPayload(null);
    }
  }, [user, isChatOpen]);

  useEffect(() => {
    if (user?.id) {
      setInitType(null);
      setInitPayload(null);
    }
  }, [user?.id]);

  const handleClose = () => {
    setIsChatOpen(false);
    setInitType(null);
    setInitPayload(null);
  };

  const handleChatButtonClick = () => {
    if (isChatOpen) {
      setIsChatOpen(false);
    } else {
      setIsChatOpen(true);
      setTimeout(() => {
        chatModalRef.current?.maximize();
      }, 0);
    }
  };

  return (
    <>
      <ChatModal
        ref={chatModalRef}
        isOpen={isChatOpen}
        onClose={handleClose}
        initType={initType}
        initPayload={initPayload}
        onInputFocus={() => chatModalRef.current?.maximize()}
        userId={user?.id}
      />
      <div className={`${isChatOpen ? 'hidden' : ''} sm:block`}>
        <ChatButton onClick={handleChatButtonClick} />
        <TopButton />
      </div>
    </>
  );
});

export default Chatbot;
