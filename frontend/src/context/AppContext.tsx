import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import axios from 'axios';

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000';
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:5000';

// Types
interface User {
  name: string;
  email: string;
  role: 'customer' | 'agent';
}

interface Message {
  id: number;
  sender: 'user' | 'agent';
  text: string;
  status: 'waiting' | 'in-progress' | 'answered';
  userEmail: string;
  aiSuggestion?: string;
  agentFinalResponse?: string;
}

interface AppContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  messageQueue: Message[];
  currentQuery: Message | null;
  submitQuestion: (text: string) => void;
  takeNextQuery: () => void;
  getAISuggestion: () => void;
  sendReply: (messageId: number, agentResponseText: string) => void;
  clearHistory: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const speak = (text: string) => {
  const synth = window.speechSynthesis;
  if (!synth) return;
  const utterance = new SpeechSynthesisUtterance(text);
  synth.speak(utterance);
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const [currentQuery, setCurrentQuery] = useState<Message | null>(null);

  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    const wsUrl = `${WEBSOCKET_URL}?userEmail=${encodeURIComponent(user.email)}&userRole=${user.role}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("✅ WebSocket connection established.");
    socket.onclose = () => console.log("❌ WebSocket connection closed.");
    socket.onerror = (error) => console.error("WebSocket error:", error);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 Received from server:", data);

      switch (data.type) {
        case 'NEW_QUESTION_IN_QUEUE':
          setMessageQueue(prev => [...prev, data.payload]);
          break;
        case 'NEW_REPLY_FROM_AGENT':
          setMessageQueue(prev =>
            prev
              .map(msg => msg.id === data.payload.id
                ? { ...msg, status: 'answered' as const }
                : msg
              )
              .concat(data.payload)
          );
          break;
      }
    };

    ws.current = socket;

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [user]);

  const submitQuestion = (text: string) => {
    if (!text.trim() || !user || !ws.current) return;
    const newQuestion: Message = {
      id: Date.now(),
      sender: 'user',
      text,
      status: 'waiting',
      userEmail: user.email,
    };

    setMessageQueue(prev => [...prev, newQuestion]);

    ws.current.send(JSON.stringify({ type: 'CUSTOMER_QUESTION', payload: newQuestion }));
  };

  const sendReply = (messageId: number, agentResponseText: string) => {
    const originalQuestion = messageQueue.find(m => m.id === messageId);
    if (!originalQuestion || !ws.current) return;

    const agentReplyMessage: Message = {
      id: originalQuestion.id,
      sender: 'agent',
      text: agentResponseText,
      status: 'answered',
      userEmail: originalQuestion.userEmail,
    };

    // --- The NEW, CORRECT code ---
setMessageQueue(prev => {
  // First, create an updated version of the queue where the original question is marked as answered.
  const updatedQueue = prev.map(msg => 
    msg.id === messageId 
      ? { ...msg, status: 'answered' as const, agentFinalResponse: agentResponseText } 
      : msg
  );
  
  // Then, return a new array that includes the updated queue PLUSOf course. This the new agent reply message.
  return [...updatedQueue, agentReplyMessage];
});
    setCurrentQuery(null);

    ws.current.send(JSON.stringify({ type: 'AGENT_REPLY', payload: agentReplyMessage }));
  };

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setMessageQueue([]);
  };

  const clearHistory = () => {
    setMessageQueue([]);
    speak("History cleared.");
  };

  const takeNextQuery = () => {
    const next = messageQueue.find(m => m.status === 'waiting');
    if (next) {
      setCurrentQuery(next);
      setMessageQueue(prev =>
        prev.map(m => m.id === next.id ? { ...m, status: 'in-progress' } : m)
      );
    } else {
      speak("No more queries in the queue.");
    }
  };

  const getAISuggestion = async () => {
    if (!currentQuery) return;

    try {
      const res = await axios.post(`${AI_SERVICE_URL}/suggest`, {
        question: currentQuery.text
      });
      const suggestion = res.data.suggestion;

      setMessageQueue(prev =>
        prev.map(m => m.id === currentQuery.id ? { ...m, aiSuggestion: suggestion } : m)
      );
      speak("AI suggestion received.");
    } catch (err) {
      console.error("Error fetching AI suggestion:", err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        messageQueue,
        currentQuery,
        submitQuestion,
        takeNextQuery,
        getAISuggestion,
        sendReply,
        clearHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
