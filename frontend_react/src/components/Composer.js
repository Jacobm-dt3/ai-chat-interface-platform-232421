import React, { useMemo, useRef, useState } from 'react';
import { useChat } from '../state/ChatContext';

/**
 * PUBLIC_INTERFACE
 * Bottom composer: textarea + send + attach + stop streaming.
 */
export default function Composer({ onOpenAttach, onOpenSettings }) {
  const { isStreaming, activeSessionId } = useChat();
  const { sendMessage, stopStreaming } = useChat().actions;

  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const canSend = useMemo(() => {
    return Boolean(activeSessionId) && text.trim().length > 0 && !isStreaming;
  }, [activeSessionId, text, isStreaming]);

  const onSubmit = async () => {
    if (!text.trim()) return;
    const t = text;
    setText('');
    textareaRef.current?.focus();
    await sendMessage(t);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSubmit();
    }
  };

  return (
    <div className="composer" id="composer" role="region" aria-label="Message composer">
      <div className="composer-inner">
        <div>
          <label className="sr-only" htmlFor="composer-textarea">Message</label>
          <textarea
            id="composer-textarea"
            ref={textareaRef}
            className="textarea"
            placeholder={activeSessionId ? 'Message Ocean Chat…' : 'Select or create a session to start…'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!activeSessionId}
            aria-disabled={!activeSessionId ? 'true' : 'false'}
          />
          <div className="kbd-hint" style={{ padding: '6px 2px 0 2px' }}>
            Enter to send • Shift+Enter for new line
          </div>
        </div>

        <div className="composer-actions">
          <button className="btn icon-btn" onClick={onOpenAttach} aria-label="Attach file" disabled={!activeSessionId}>
            📎
          </button>
          <button className="btn icon-btn" onClick={onOpenSettings} aria-label="Open settings">
            ⚙️
          </button>

          {isStreaming ? (
            <button className="btn btn-danger" onClick={stopStreaming} aria-label="Stop streaming">
              Stop
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onSubmit} disabled={!canSend} aria-label="Send message">
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
