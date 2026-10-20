'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type SystemMessageType = 'success' | 'error';

type SystemMessage = {
  id: number;
  text: string;
  type: SystemMessageType;
};

type SystemMessageContextValue = {
  showSystemMessage: (text: string, type: SystemMessageType) => void;
};

const SystemMessageContext = createContext<SystemMessageContextValue | null>(null);

export function useSystemMessage() {
  const context = useContext(SystemMessageContext);
  if (!context) {
    throw new Error('useSystemMessage must be used within SystemMessageProvider.');
  }
  return context.showSystemMessage;
}

export default function SystemMessageProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<SystemMessage | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const nextMessageId = useRef(0);

  const showSystemMessage = useCallback(
    (text: string, type: SystemMessageType) => {
      setIsExiting(false);
      nextMessageId.current += 1;
      setMessage({ id: nextMessageId.current, text, type });
    },
    [],
  );

  useEffect(() => {
    if (!message) return;

    const exitTimer = window.setTimeout(() => setIsExiting(true), 3000);
    const removeTimer = window.setTimeout(() => setMessage(null), 3300);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, [message]);

  return (
    <SystemMessageContext.Provider value={{ showSystemMessage }}>
      {children}
      {message && (
        <div
          key={message.id}
          className={`system-message system-message--${message.type}${isExiting ? ' system-message--exit' : ''}`}
          role={message.type === 'error' ? 'alert' : 'status'}
          aria-live={message.type === 'error' ? 'assertive' : 'polite'}
        >
          {message.text}
        </div>
      )}
    </SystemMessageContext.Provider>
  );
}
