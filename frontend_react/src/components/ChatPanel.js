import React, { useEffect, useMemo, useRef } from 'react';
import { useChat } from '../state/ChatContext';
import MessageItem from './MessageItem';

/**
 * PUBLIC_INTERFACE
 * Main chat panel that renders messages and a streaming placeholder.
 */
export default function ChatPanel() {
  const { messages, isLoadingMessages, isStreaming, streamingDraft, error, activeSessionId } = useChat();
  const listRef = useRef(null);
  const bottomRef = useRef(null);

  const list = useMemo(() => messages || [], [messages]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive or streaming updates
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [list.length, isStreaming, streamingDraft]);

  if (!activeSessionId) {
    return (
      <div className="chat-panel" id="chat-panel" role="main">
        <div className="empty-state">
          <div className="empty-card">
            <h2>Start a new conversation</h2>
            <p>Select a session or create a new one from the sidebar. Your messages will appear here.</p>
            <p className="kbd-hint">Tip: Use Tab to navigate, Enter to send, Shift+Enter for a new line.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel" id="chat-panel" role="main" aria-busy={isLoadingMessages ? 'true' : 'false'}>
      <a className="skip-link" href="#composer">
        Skip to message composer
      </a>

      {error ? <div className="alert" role="alert">{error}</div> : null}

      {isLoadingMessages ? (
        <div className="empty-state">
          <div className="empty-card">
            <h2>Loading messages…</h2>
            <p className="kbd-hint">Fetching conversation history.</p>
          </div>
        </div>
      ) : (
        <div className="message-list" ref={listRef} role="list" aria-label="Messages">
          {list.length === 0 ? (
            <div className="empty-state">
              <div className="empty-card">
                <h2>Say hello</h2>
                <p>Ask a question, paste code, or attach a file to begin.</p>
              </div>
            </div>
          ) : null}

          {list.map((m) => (
            <MessageItem key={m.id} message={m} />
          ))}

          {isStreaming ? (
            <div className="msg-row" role="listitem" aria-label="assistant typing">
              <div className="avatar assistant" aria-hidden="true">AI</div>
              <div className="msg-bubble">
                <div className="msg-header">
                  <div className="msg-role">assistant</div>
                  <div className="streaming" aria-live="polite">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                    <span>Streaming…</span>
                  </div>
                </div>
                <div className="msg-content">
                  <div aria-live="polite">
                    {streamingDraft ? streamingDraft : '…'}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
