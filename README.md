# AI Chat Interface Platform

This repository contains:
- `frontend_react/`: React web UI
- `backend-api_workspace/backend-api/`: FastAPI backend API (auth, sessions/messages, file upload, SSE streaming)

## Backend configuration (OpenAI)

The backend supports real OpenAI-compatible streaming when configured, otherwise it falls back to simulated streaming.

1) Create environment variables (example file):
- See: `backend-api_workspace/backend-api/.env.example`

2) Required for authenticated endpoints:
- `BACKEND_JWT_SECRET`
- `AUTH_DEV_ENABLED=true` (for local development dev-login)

3) Optional for real model streaming:
- `OPENAI_API_KEY` (enables OpenAI streaming)
- `OPENAI_MODEL` (default `gpt-4o-mini`)
- `OPENAI_TIMEOUT_SECS`, `OPENAI_MAX_RETRIES`, etc.

## Streaming usage

Backend SSE endpoint:
- `POST /sessions/{id}/messages:stream` with header `Accept: text/event-stream`
- Emits:
  - `message_delta` events with `{"type":"message_delta","delta":"..."}` chunks
  - final `message_done` with `{"type":"message_done","message_id":"...","usage":{...},"message":{...}}`
  - `error` on failures

If you call with `stream=false` or you don’t send `Accept: text/event-stream`, the backend returns JSON fallback.

## Quick start (development)

Backend:
```bash
cd backend-api_workspace/backend-api
python -m pip install -r requirements.txt
export BACKEND_JWT_SECRET="dev-secret-change-me"
export AUTH_DEV_ENABLED="true"
# optional: enable OpenAI
# export OPENAI_API_KEY="..."
uvicorn app.main:app --host 0.0.0.0 --port 3010
```

Frontend:
```bash
cd ai-chat-interface-platform-232421/frontend_react
npm install
npm start
```
