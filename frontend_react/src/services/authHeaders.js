import { getEnvConfig } from '../config/env';

/**
 * Helpers for attaching auth + tenant context to backend API requests.
 *
 * Temporary dev behavior:
 * - If localStorage has `auth_token`, we send `Authorization: Bearer <token>`
 * - If localStorage has `tenant_id`, we send `X-Tenant-Id: <tenant_id>`
 * - You can also set env defaults via REACT_APP_AUTH_TOKEN / REACT_APP_TENANT_ID
 *
 * This keeps the UI functional in dev without building a full auth flow yet.
 */

const LS_AUTH_TOKEN_KEY = 'auth_token';
const LS_TENANT_ID_KEY = 'tenant_id';

/**
 * PUBLIC_INTERFACE
 * Read the current bearer token from localStorage/env.
 * @returns {string}
 */
export function getAuthToken() {
  const env = getEnvConfig();
  return window.localStorage.getItem(LS_AUTH_TOKEN_KEY) || env.authToken || '';
}

/**
 * PUBLIC_INTERFACE
 * Read the current tenant id from localStorage/env.
 * @returns {string}
 */
export function getTenantId() {
  const env = getEnvConfig();
  return window.localStorage.getItem(LS_TENANT_ID_KEY) || env.tenantId || '';
}

/**
 * PUBLIC_INTERFACE
 * Build headers for backend requests (Authorization + X-Tenant-Id) when available.
 * @returns {Record<string,string>}
 */
export function buildAuthHeaders() {
  const headers = {};
  const token = getAuthToken();
  const tenantId = getTenantId();

  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-Id'] = tenantId;

  return headers;
}

export const __authStorageKeys = {
  authToken: LS_AUTH_TOKEN_KEY,
  tenantId: LS_TENANT_ID_KEY,
};
