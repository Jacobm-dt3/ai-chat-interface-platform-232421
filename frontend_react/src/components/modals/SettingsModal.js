import React from 'react';
import Modal from '../Modal';
import { getEnvConfig } from '../../config/env';

/**
 * PUBLIC_INTERFACE
 * Settings modal: shows environment configuration and placeholders.
 */
export default function SettingsModal({ isOpen, onClose }) {
  const env = getEnvConfig();

  return (
    <Modal
      title="Settings"
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Close</button>
        </>
      }
    >
      <div className="field">
        <div className="label">API Base (REACT_APP_API_BASE)</div>
        <input className="input" value={env.apiBase || '(not set — using mock mode)'} readOnly />
      </div>
      <div className="field">
        <div className="label">WebSocket URL (REACT_APP_WS_URL)</div>
        <input className="input" value={env.wsUrl || '(not set)'} readOnly />
      </div>
      <div className="field">
        <div className="label">Node Env</div>
        <input className="input" value={env.nodeEnv} readOnly />
      </div>
      <div className="field">
        <div className="label">Feature Flags</div>
        <input className="input" value={env.featureFlags || '(none)'} readOnly />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <div className="label">Experiments Enabled</div>
        <input className="input" value={env.experimentsEnabled || '(unset)'} readOnly />
      </div>

      <div className="kbd-hint" style={{ marginTop: 10 }}>
        This UI is ready for backend integration. Configure API/WS env vars to switch off mock mode.
      </div>
    </Modal>
  );
}
