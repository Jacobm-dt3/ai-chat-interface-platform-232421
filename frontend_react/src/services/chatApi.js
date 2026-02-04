import { getEnvConfig } from '../config/env';
import { buildAuthHeaders } from './authHeaders';

/**
 * A tiny adapter that can talk to a backend when available, or fall back to
 * local mock behavior when no API base is configured.
 *
 * Backend contracts (FastAPI):
 * - GET  /sessions
 * - POST /sessions
 * - GET  /sessions/{id}/messages
 * - POST /sessions/{id}/files (multipart)
 * - POST /sessions/{id}/messages:stream
 *    - SSE when Accept: text/event-stream AND stream=true
 *    - JSON fallback when stream=false OR Accept: application/json
 *
 * SSE events:
 * - event: message_delta data: {"type":"message_delta","delta":"..."}
 * - event: message_done  data: {"type":"message_done","message_id":"...","usage":{...},"message":{...}}
 * - event: error         data: {"type":"error","code":"...","message":"..."}
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

function toApiUrl(apiBase, path) {
  const base = (apiBase || '').replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

async function readErrorMessage(res) {
  try {
    const data = await res.json();
    return data?.message || data?.detail || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

function getContentType(res) {
  return (res.headers.get('content-type') || '').toLowerCase();
}

/**
 * Minimal SSE parser that can handle split chunks from fetch streaming.
 * We parse only `event:` and `data:` lines and treat blank line as message terminator.
 */
function createSseParser(onEvent) {
  let buffer = '';
  let currentEvent = 'message';
  let dataLines = [];

  function dispatch() {
    if (dataLines.length === 0) return;
    const data = dataLines.join('\n');
    onEvent({ event: currentEvent, data });
    dataLines = [];
    currentEvent = 'message';
  }

  return {
    pushText(text) {
      buffer += text;

      // Split on '\n' but keep any trailing partial line in buffer
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        // Blank line terminates an SSE message
        if (line === '') {
          dispatch();
          continue;
        }
        // Comment / heartbeat
        if (line.startsWith(':')) continue;

        if (line.startsWith('event:')) {
          currentEvent = line.slice('event:'.length).trim() || 'message';
          continue;
        }
        if (line.startsWith('data:')) {
          dataLines.push(line.slice('data:'.length).trimStart());
          continue;
        }
        // Ignore other fields (id:, retry:, etc.)
      }
    },
    flush() {
      // If stream ends without blank line, still attempt dispatch.
      dispatch();
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * Load sessions list. If no API base is set, returns locally stored sessions.
 * @returns {Promise<Array<{id:string,title:string,updatedAt?:number,created_at?:string,createdAt?:string}>>}
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

  const res = await fetch(toApiUrl(apiBase, '/sessions'), {
    method: 'GET',
    headers: {
      ...buildAuthHeaders(),
    },
  });
  if (!res.ok) throw new Error(`Failed to load sessions (${await readErrorMessage(res)})`);

  const data = await res.json();
  // Backend returns {created_at}; UI expects updatedAt. Keep compatibility.
  return (data || []).map((s) => ({
    ...s,
    updatedAt: s.updatedAt || (s.created_at ? Date.parse(s.created_at) : undefined),
    createdAt: s.createdAt || s.created_at,
  }));
}

/**
 * PUBLIC_INTERFACE
 * Create a new session. If no API base is set, creates locally.
 * @param {{title:string}} input
 * @returns {Promise<{id:string,title:string,updatedAt?:number,created_at?:string,createdAt?:string}>}
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

  const res = await fetch(toApiUrl(apiBase, '/sessions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(),
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to create session (${await readErrorMessage(res)})`);

  const s = await res.json();
  return {
    ...s,
    updatedAt: s.updatedAt || (s.created_at ? Date.parse(s.created_at) : undefined),
    createdAt: s.createdAt || s.created_at,
  };
}

/**
 * PUBLIC_INTERFACE
 * Load messages for a session.
 * @param {string} sessionId
 * @returns {Promise<Array<{id:string,role:'user'|'assistant'|'system',content:string,createdAt?:number,created_at?:string}>>}
 */
export async function getMessages(sessionId) {
  const { apiBase } = getEnvConfig();
  if (!sessionId) return [];

  if (!apiBase) {
    const raw = window.localStorage.getItem(`mock_messages_${sessionId}`) || '[]';
    return safeJsonParse(raw, []);
  }

  const res = await fetch(toApiUrl(apiBase, `/sessions/${encodeURIComponent(sessionId)}/messages`), {
    method: 'GET',
    headers: {
      ...buildAuthHeaders(),
    },
  });
  if (!res.ok) throw new Error(`Failed to load messages (${await readErrorMessage(res)})`);

  const data = await res.json();
  return (data || []).map((m) => ({
    ...m,
    createdAt: m.createdAt || (m.created_at ? Date.parse(m.created_at) : undefined),
  }));
}

/**
 * PUBLIC_INTERFACE
 * Upload a file for a session.
 *
 * Supports:
 * 1) Direct multipart upload to backend /sessions/{id}/files (current backend implementation)
 * 2) Presigned flow if backend later returns {presigned_url, fields?, method?}
 *
 * @param {string} sessionId
 * @param {File} file
 * @returns {Promise<any>}
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

  const res = await fetch(toApiUrl(apiBase, `/sessions/${encodeURIComponent(sessionId)}/files`), {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(),
    },
    body: form,
  });

  if (!res.ok) throw new Error(`Failed to upload (${await readErrorMessage(res)})`);

  const data = await res.json();

  // Presigned flow (future): backend may respond with instructions.
  // Example:
  // { upload: { url, method, headers, fields }, file: {id,...} }
  const presigned = data?.presigned_url || data?.upload?.url;
  if (presigned) {
    const method = (data?.method || data?.upload?.method || 'PUT').toUpperCase();
    const headers = data?.headers || data?.upload?.headers || {};
    const fields = data?.fields || data?.upload?.fields;

    if (fields) {
      // Typical S3 POST policy form upload
      const postForm = new FormData();
      Object.entries(fields).forEach(([k, v]) => postForm.append(k, v));
      postForm.append('file', file);
      const up = await fetch(presigned, { method: 'POST', body: postForm });
      if (!up.ok) throw new Error(`Presigned upload failed (${up.status})`);
    } else {
      // PUT/POST raw body upload
      const up = await fetch(presigned, { method, headers, body: file });
      if (!up.ok) throw new Error(`Presigned upload failed (${up.status})`);
    }
  }

  return data;
}

/**
 * PUBLIC_INTERFACE
 * Send a user message and stream an assistant response.
 *
 * When apiBase is not configured, this simulates token streaming locally.
 *
 * Backend streaming:
 * - POST /sessions/{id}/messages:stream
 * - Add Accept: text/event-stream for SSE
 * - Use stream=false or Accept: application/json for JSON fallback
 *
 * opts callbacks:
 * - onToken(chunk) called for deltas
 * - onEvent(evt) optional: receives raw stream events ({type, ...})
 *
 * @param {string} sessionId
 * @param {string} content
 * @param {{ onToken:(chunk:string)=>void, onEvent?:(evt:any)=>void, signal?:AbortSignal, stream?:boolean }} opts
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
      `- Tip: Configure \`REACT_APP_API_BASE\` to enable real SSE streaming.\n\n` +
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

  const wantStream = opts?.stream !== false; // default true
  const acceptHeader = wantStream ? 'text/event-stream' : 'application/json';

  // Always POST; backend switches between SSE vs JSON based on Accept + stream query flag.
  const url = toApiUrl(
    apiBase,
    `/sessions/${encodeURIComponent(sessionId)}/messages:stream?stream=${wantStream ? 'true' : 'false'}`
  );

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: acceptHeader,
      'Content-Type': 'application/json',
      ...buildAuthHeaders(),
    },
    body: JSON.stringify({ content: trimmed }),
    signal: opts?.signal,
  });

  if (!res.ok) {
    throw new Error(`Failed to send message (${await readErrorMessage(res)})`);
  }

  const ct = getContentType(res);

  // JSON fallback (forced or returned by backend)
  if (!wantStream || ct.includes('application/json')) {
    const data = await res.json();
    const assistantMessage = data?.assistant_message || data?.assistantMessage || data?.assistant || null;
    const userMessage = data?.user_message || data?.userMessage || userMsg;

    const assistantContent = assistantMessage?.content || '';
    if (assistantContent) opts?.onToken?.(assistantContent);

    return {
      userMessage,
      assistantMessage: assistantMessage || {
        id: makeId('msg'),
        role: 'assistant',
        content: assistantContent,
        createdAt: Date.now(),
      },
    };
  }

  // SSE streaming over fetch ReadableStream
  if (!res.body) throw new Error('Streaming not supported by this browser/response');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let finalAssistantMessage = null;
  let done = false;

  const parser = createSseParser(({ event, data }) => {
    const payload = safeJsonParse(data, null);
    if (!payload) return;

    // Backend uses both "event:" and a `type` discriminator in JSON.
    const t = payload.type || event;

    if (t === 'message_delta') {
      const delta = payload.delta || '';
      if (delta) opts?.onToken?.(delta);
      opts?.onEvent?.(payload);
      return;
    }

    if (t === 'message_done') {
      finalAssistantMessage = payload.message || null;
      opts?.onEvent?.(payload);
      done = true;
      return;
    }

    if (t === 'error') {
      const msg = payload.message || 'Streaming error';
      opts?.onEvent?.(payload);
      throw new Error(msg);
    }
  });

  try {
    while (true) {
      const { value, done: rdDone } = await reader.read();
      if (rdDone) break;
      if (opts?.signal?.aborted) throw new Error('Request aborted');

      parser.pushText(decoder.decode(value, { stream: true }));
      if (done) break;
    }
    parser.flush();
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  return {
    userMessage: userMsg,
    assistantMessage:
      finalAssistantMessage ||
      // If the stream ended without message_done, still return something stable.
      { id: makeId('msg'), role: 'assistant', content: '', createdAt: Date.now() },
  };
}
