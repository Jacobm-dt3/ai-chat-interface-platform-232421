import React from 'react';
import { useChat } from '../state/ChatContext';

/**
 * PUBLIC_INTERFACE
 * Top navigation bar for the main panel.
 */
export default function TopNav({ onOpenSettings }) {
  const { sessions, activeSessionId } = useChat();
  const active = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="topnav" role="banner">
      <div className="brand">
        <strong>Ocean Chat</strong>
        <small title={active?.title || ''}>{active?.title ? `• ${active.title}` : '• No session selected'}</small>
      </div>

      <div className="topnav-actions">
        <button className="btn" onClick={onOpenSettings} aria-label="Open settings">
          Settings
        </button>
      </div>
    </div>
  );
}
