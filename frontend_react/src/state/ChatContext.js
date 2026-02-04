import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createSession, getMessages, listSessions, sendMessageStreaming, uploadFile } from '../services/chatApi';

const ChatContext = createContext(null);

/**
 * PUBLIC_INTERFACE
 * Hook to access chat state/actions.
 */
export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}

function defaultTitleForNewSession() {
  return 'New chat';
}

/**
 * PUBLIC_INTERFACE
 * Provides application chat state: sessions, active session, messages, and actions.
 */
export function ChatProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingDraft, setStreamingDraft] = useState('');
  const [error, setError] = useState('');

  const abortRef = useRef(null);

  const refreshSessions = useCallback(async () => {
    setError('');
    setIsLoadingSessions(true);
    try {
      const s = await listSessions();
      // Sort by updatedAt desc if available
      const sorted = [...s].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setSessions(sorted);
      if (!activeSessionId && sorted.length > 0) setActiveSessionId(sorted[0].id);
    } catch (e) {
      setError(e?.message || 'Failed to load sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  }, [activeSessionId]);

  const loadMessagesFor = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setError('');
    setIsLoadingMessages(true);
    try {
      const msgs = await getMessages(sessionId);
      setMessages(msgs);
    } catch (e) {
      setError(e?.message || 'Failed to load messages');
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeSessionId) loadMessagesFor(activeSessionId);
  }, [activeSessionId, loadMessagesFor]);

  const startNewSession = useCallback(async (title) => {
    setError('');
    const t = (title || defaultTitleForNewSession()).trim();
    const sess = await createSession({ title: t });
    setSessions((prev) => [sess, ...prev]);
    setActiveSessionId(sess.id);
    setMessages([]);
    setStreamingDraft('');
    return sess;
  }, []);

  const selectSession = useCallback((id) => {
    setActiveSessionId(id);
    setStreamingDraft('');
    setIsStreaming(false);
    setError('');
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (content) => {
      if (!activeSessionId) {
        // Auto-create a session if none exists yet.
        const sess = await startNewSession('New chat');
        if (!sess?.id) return;
      }

      setError('');
      setIsStreaming(true);
      setStreamingDraft('');

      // Add user message optimistically
      const userMsg = {
        id: `local_${Date.now()}`,
        role: 'user',
        content,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Abort controller for stream
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const result = await sendMessageStreaming(activeSessionId || sessions?.[0]?.id, content, {
          signal: ctrl.signal,
          onToken: (chunk) => {
            setStreamingDraft((prev) => prev + chunk);
          },
        });

        // Prefer backend-provided final assistant message when available (SSE message_done or JSON fallback).
        const assistant = result?.assistantMessage;
        const assistantContent = assistant?.content ?? '';

        setMessages((prev) => [
          ...prev,
          {
            id: assistant?.id || `asst_${Date.now()}`,
            role: 'assistant',
            content: assistantContent || '',
            createdAt: assistant?.createdAt || Date.now(),
          },
        ]);

        // Clear draft once finalized so the "append-on-stream-end" effect won't duplicate messages.
        setStreamingDraft('');
      } catch (e) {
        const msg = e?.message || 'Failed to send message';
        setError(msg);
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    // streamingDraft is intentionally omitted (we snapshot it at finalize time by reading state);
    // to ensure correctness, we instead finalize using current draft in an effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSessionId, sessions, startNewSession]
  );



  const attachFile = useCallback(
    async (file) => {
      if (!activeSessionId) throw new Error('No session selected');
      setError('');
      await uploadFile(activeSessionId, file);
    },
    [activeSessionId]
  );

  const value = useMemo(
    () => ({
      sessions,
      activeSessionId,
      messages,
      isLoadingSessions,
      isLoadingMessages,
      isStreaming,
      streamingDraft,
      error,
      actions: {
        refreshSessions,
        startNewSession,
        selectSession,
        sendMessage,
        stopStreaming,
        attachFile,
        clearError: () => setError(''),
      },
    }),
    [
      sessions,
      activeSessionId,
      messages,
      isLoadingSessions,
      isLoadingMessages,
      isStreaming,
      streamingDraft,
      error,
      refreshSessions,
      startNewSession,
      selectSession,
      sendMessage,
      stopStreaming,
      attachFile,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
