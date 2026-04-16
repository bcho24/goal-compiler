import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatStore {
  messages: ChatMessage[];
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addStreamingMessage: (id: string) => void;
  appendToStreamingMessage: (id: string, chunk: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],

  addMessage: (msg) => {
    set((s) => ({
      messages: [
        ...s.messages,
        {
          ...msg,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: Date.now(),
        },
      ],
    }));
  },

  addStreamingMessage: (id: string) => {
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        },
      ],
    }));
  },

  appendToStreamingMessage: (id: string, chunk: string) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      ),
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
