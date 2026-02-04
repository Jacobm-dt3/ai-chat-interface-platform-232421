import React, { useMemo, useRef } from 'react';
import { useChat } from '../state/ChatContext';

/**
 * PUBLIC_INTERFACE
 * Left sidebar showing sessions with selection and creation.
 */
export default function Sidebar({ onOpenNewSession }) {
  const { sessions, activeSessionId, isLoadingSessions } = useChat();
  const { selectSession } = useChat().actions;

  const listRef = useRef(null);

  const items = useMemo(() => sessions || [], [sessions]);

  const onKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const buttons = listRef.current?.querySelectorAll('button[data-session-id]');
    if (!buttons || buttons.length === 0) return;

    const activeIndex = Array.from(buttons).findIndex((b) => b.getAttribute('data-session-id') === activeSessionId);
    let nextIndex = activeIndex < 0 ? 0 : activeIndex;

    if (e.key === 'ArrowDown') nextIndex = Math.min(buttons.length - 1, activeIndex + 1);
    if (e.key === 'ArrowUp') nextIndex = Math.max(0, activeIndex - 1);
    if (e.key === 'Home') nextIndex = 0;
    if (e.key === 'End') nextIndex = buttons.length - 1;

    e.preventDefault();
    const next = buttons[nextIndex];
    next?.focus();
  };

  return (
    <aside className="sidebar" aria-label="Chat sessions">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <h1>Sessions</h1>
          <span>{isLoadingSessions ? 'Loading…' : `${items.length} chat${items.length === 1 ? '' : 's'}`}</span>
        </div>
        <div className="sidebar-actions">
          <button className="btn btn-primary" onClick={onOpenNewSession} aria-label="Create new session">
            + New
          </button>
        </div>
      </div>

      <div className="sidebar-list" ref={listRef} onKeyDown={onKeyDown} role="list">
        {items.map((s) => (
          <button
            key={s.id}
            type="button"
            className="session-item"
            onClick={() => selectSession(s.id)}
            aria-current={s.id === activeSessionId}
            data-session-id={s.id}
          >
            <div className="session-meta">
              <div className="session-name">{s.title || 'Untitled'}</div>
              <div className="session-sub">
                {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '—'}
              </div>
            </div>
            <span className="pill">Chat</span>
          </button>
        ))}
        {items.length === 0 && !isLoadingSessions ? (
          <div className="kbd-hint" style={{ padding: '10px 6px' }}>
            No sessions yet. Create one to start chatting.
          </div>
        ) : null}
      </div>
    </aside>
  );
}
