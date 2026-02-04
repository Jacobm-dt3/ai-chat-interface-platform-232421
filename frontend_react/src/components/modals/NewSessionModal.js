import React, { useState } from 'react';
import Modal from '../Modal';
import { useChat } from '../../state/ChatContext';

/**
 * PUBLIC_INTERFACE
 * Modal dialog to create a new session.
 */
export default function NewSessionModal({ isOpen, onClose }) {
  const { startNewSession } = useChat().actions;
  const [title, setTitle] = useState('');
  const [err, setErr] = useState('');

  const onCreate = async () => {
    setErr('');
    try {
      await startNewSession(title || 'New chat');
      setTitle('');
      onClose?.();
    } catch (e) {
      setErr(e?.message || 'Failed to create session');
    }
  };

  return (
    <Modal
      title="New session"
      isOpen={isOpen}
      onClose={() => {
        setErr('');
        onClose?.();
      }}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onCreate}>Create</button>
        </>
      }
    >
      <div className="field">
        <label className="label" htmlFor="new-session-title">Title</label>
        <input
          id="new-session-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Product brainstorm"
        />
      </div>
      {err ? <div className="alert" role="alert">{err}</div> : null}
      <div className="kbd-hint">Tip: Keep titles short; you can manage sessions later when backend is integrated.</div>
    </Modal>
  );
}
