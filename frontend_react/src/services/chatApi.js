import { getEnvConfig } from '../config/env';

/**
 * A tiny adapter that can talk to a backend when available, or fall back to
 * local mock behavior when no API base is configured.
 *
 * Endpoints are placeholders and should be aligned with backend_api once available.
 */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function makeId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * PUBLIC_INTERFACE
 * Load sessions list. If no API base is set, returns locally stored sessions.
 * @returns {Promise<Array<{id:string,title:string,updatedAt:number}>>}
 */
export async function listSessions() {
  const { apiBase } = getEnvConfig();
  if (!apiBase) {
    const raw = window.localStorage.getItem('mock_sessions') || '[]';
    const sessions = safeJsonParse(raw, []);
    if (sessions.length === 0) {
      const initial = [{ id: makeId('sess'), title: 'Welcome', updatedAt: Date.now() }];
      window.localStorage.setItem('mock_sessions', JSON.stringify(initial));
      return initial;
    }
    return sessions;
  }

  const res = await fetch(`${apiBase}/sessions`, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to load sessions (${res.status})`);
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * Create a new session. If no API base is set, creates locally.
 * @param {{title:string}} input
 * @returns {Promise<{id:string,title:string,updatedAt:number}>}
 */
export async function createSession(input) {
  const { apiBase } = getEnvConfig();
  const title = (input?.title || 'New chat').trim() || 'New chat';

  if (!apiBase) {
    const raw = window.localStorage.getItem('mock_sessions') || '[]';
    const sessions = safeJsonParse(raw, []);
    const sess = { id: makeId('sess'), title, updatedAt: Date.now() };
    const next = [sess, ...sessions];
    window.localStorage.setItem('mock_sessions', JSON.stringify(next));
    window.localStorage.setItem(`mock_messages_${sess.id}`, JSON.stringify([]));
    return sess;
  }

  const res = await fetch(`${apiBase}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to create session (${res.status})`);
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * Load messages for a session.
 * @param {string} sessionId
 * @returns {Promise<Array<{id:string,role:'user'|'assistant'|'system',content:string,createdAt:number}>>}
 */
export async function getMessages(sessionId) {
  const { apiBase } = getEnvConfig();
  if (!sessionId) return [];

  if (!apiBase) {
    const raw = window.localStorage.getItem(`mock_messages_${sessionId}`) || '[]';
    return safeJsonParse(raw, []);
  }

  const res = await fetch(`${apiBase}/sessions/${encodeURIComponent(sessionId)}/messages`, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * Upload a file for a session. Placeholder: returns metadata.
 * @param {string} sessionId
 * @param {File} file
 * @returns {Promise<{id:string,name:string,size:number}>}
 */
export async function uploadFile(sessionId, file) {
  const { apiBase } = getEnvConfig();

  if (!file) throw new Error('No file selected');

  if (!apiBase) {
    // Mock upload: store minimal metadata locally.
    const meta = { id: makeId('file'), name: file.name, size: file.size };
    const raw = window.localStorage.getItem(`mock_files_${sessionId}`) || '[]';
    const files = safeJsonParse(raw, []);
    const next = [meta, ...files];
    window.localStorage.setItem(`mock_files_${sessionId}`, JSON.stringify(next));
    await sleep(250);
    return meta;
  }

  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${apiBase}/sessions/${encodeURIComponent(sessionId)}/files`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`Failed to upload (${res.status})`);
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * Send a user message and stream an assistant response.
 *
 * When apiBase is not configured, this simulates token streaming locally.
 *
 * Expected future backend options:
 * - POST {apiBase}/sessions/:id/messages (non-stream)
 * - WS {wsUrl} streaming tokens
 * - SSE stream: GET/POST .../stream
 *
 * @param {string} sessionId
 * @param {string} content
 * @param {{ onToken:(chunk:string)=>void, signal?:AbortSignal }} opts
 * @returns {Promise<{userMessage:any, assistantMessage:any}>}
 */
export async function sendMessageStreaming(sessionId, content, opts) {
  const { apiBase } = getEnvConfig();
  const trimmed = (content || '').trim();
  if (!trimmed) throw new Error('Message is empty');

  const userMsg = {
    id: makeId('msg'),
    role: 'user',
    content: trimmed,
    createdAt: Date.now(),
  };

  if (!apiBase) {
    // Persist user message
    const raw = window.localStorage.getItem(`mock_messages_${sessionId}`) || '[]';
    const messages = safeJsonParse(raw, []);
    const next = [...messages, userMsg];
    window.localStorage.setItem(`mock_messages_${sessionId}`, JSON.stringify(next));

    // Stream simulated assistant response
    const assistantId = makeId('msg');
    const assistantBase =
      `Here’s a streamed response mock.\n\n` +
      `- Your message: **${trimmed.replace(/\*/g, '\\*')}**\n` +
      `- Tip: Configure \`REACT_APP_API_BASE\` + \`REACT_APP_WS_URL\` to enable real streaming.\n\n` +
      "```js\nconsole.log('Ocean Professional UI ready');\n```";

    let assembled = '';
    for (const token of assistantBase.split(/(\s+)/)) {
      if (opts?.signal?.aborted) throw new Error('Request aborted');
      assembled += token;
      opts?.onToken?.(token);
      await sleep(30);
    }

    const assistantMsg = {
      id: assistantId,
      role: 'assistant',
      content: assembled,
      createdAt: Date.now(),
    };

    const raw2 = window.localStorage.getItem(`mock_messages_${sessionId}`) || '[]';
    const messages2 = safeJsonParse(raw2, []);
    window.localStorage.setItem(`mock_messages_${sessionId}`, JSON.stringify([...messages2, assistantMsg]));
    return { userMessage: userMsg, assistantMessage: assistantMsg };
  }

  // Placeholder non-stream call; backend can later return stream id, etc.
  const res = await fetch(`${apiBase}/sessions/${encodeURIComponent(sessionId)}/messages:stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: trimmed }),
    signal: opts?.signal,
  });

  if (!res.ok) throw new Error(`Failed to send message (${res.status})`);

  // Placeholder: if backend returns JSON {assistantContent} (non-stream) we still support it.
  const data = await res.json();
  const assistantContent = data?.assistantContent || '';
  opts?.onToken?.(assistantContent);

  return {
    userMessage: userMsg,
    assistantMessage: {
      id: makeId('msg'),
      role: 'assistant',
      content: assistantContent,
      createdAt: Date.now(),
    },
  };
}
