import React, { useState } from 'react';
import Modal from '../Modal';
import { useChat } from '../../state/ChatContext';

/**
 * PUBLIC_INTERFACE
 * File upload modal (placeholder integration).
 */
export default function FileUploadModal({ isOpen, onClose }) {
  const { attachFile } = useChat().actions;
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onUpload = async () => {
    setErr('');
    if (!file) {
      setErr('Select a file to upload.');
      return;
    }
    setBusy(true);
    try {
      await attachFile(file);
      setFile(null);
      onClose?.();
    } catch (e) {
      setErr(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Attach a file"
      isOpen={isOpen}
      onClose={() => {
        setErr('');
        onClose?.();
      }}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={onUpload} disabled={busy}>
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label" htmlFor="file-input">File</label>
        <input
          id="file-input"
          className="input"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      {file ? (
        <div className="kbd-hint">
          Selected: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
        </div>
      ) : null}
      {err ? <div className="alert" role="alert">{err}</div> : null}
      <div className="kbd-hint" style={{ marginTop: 10 }}>
        Backend integration can store files in S3 and link them to messages. This modal is ready for that wiring.
      </div>
    </Modal>
  );
}
