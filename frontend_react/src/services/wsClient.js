import { getEnvConfig } from '../config/env';

/**
 * PUBLIC_INTERFACE
 * Create a WebSocket connection using REACT_APP_WS_URL. This is a lightweight
 * wrapper and is intentionally not opinionated about protocols.
 *
 * @param {string} path - Optional path appended to wsUrl (e.g. "/ws/chat")
 * @returns {WebSocket|null}
 */
export function createWebSocket(path = '') {
  const { wsUrl } = getEnvConfig();
  if (!wsUrl) return null;

  // Ensure exactly one slash between base and path
  const base = wsUrl.replace(/\/+$/, '');
  const suffix = path ? `/${path.replace(/^\/+/, '')}` : '';
  return new WebSocket(`${base}${suffix}`);
}
