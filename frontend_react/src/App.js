import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { ChatProvider, useChat } from './state/ChatContext';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import ChatPanel from './components/ChatPanel';
import Composer from './components/Composer';
import NewSessionModal from './components/modals/NewSessionModal';
import FileUploadModal from './components/modals/FileUploadModal';
import SettingsModal from './components/modals/SettingsModal';

/**
 * Inner app uses the chat context. Wrapped by ChatProvider in App().
 */
function AppShell() {
  const { error } = useChat();
  const { clearError } = useChat().actions;

  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Clear errors when opening modals (keeps UI calm)
  useEffect(() => {
    if (newSessionOpen || fileUploadOpen || settingsOpen) clearError();
  }, [newSessionOpen, fileUploadOpen, settingsOpen, clearError]);

  const toastText = useMemo(() => {
    if (!error) return '';
    return error;
  }, [error]);

  return (
    <>
      <div className="app-shell">
        <Sidebar onOpenNewSession={() => setNewSessionOpen(true)} />

        <section className="main" aria-label="Chat">
          <TopNav onOpenSettings={() => setSettingsOpen(true)} />
          <ChatPanel />
          <Composer onOpenAttach={() => setFileUploadOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
        </section>
      </div>

      <NewSessionModal isOpen={newSessionOpen} onClose={() => setNewSessionOpen(false)} />
      <FileUploadModal isOpen={fileUploadOpen} onClose={() => setFileUploadOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {toastText ? (
        <div className="toast" role="status" aria-live="polite">
          {toastText}
        </div>
      ) : null}
    </>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** Root application component for the Ocean Professional chat UI. */
  return (
    <ChatProvider>
      <AppShell />
    </ChatProvider>
  );
}

export default App;
