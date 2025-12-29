'use client';

import { useState, useEffect, useCallback } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  time: string;
};

const STORAGE_KEY = 'fuguestate_chat_history';
const MAX_MESSAGES = 50;

export function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setIsLoaded(true);
    }
  }, []);

  // Add a message to history
  const addMessage = useCallback((role: 'user' | 'assistant', text: string, time?: string) => {
    const messageTime = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage: ChatMessage = { role, text, time: messageTime };
    
    setMessages((prev) => {
      const updated = [...prev, newMessage];
      // Keep only last MAX_MESSAGES messages
      const trimmed = updated.slice(-MAX_MESSAGES);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
      
      return trimmed;
    });
  }, []);

  // Clear chat history
  const clearHistory = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  }, []);

  return {
    messages,
    addMessage,
    clearHistory,
    isLoaded
  };
}
