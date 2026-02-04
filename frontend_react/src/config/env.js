/**
 * Environment configuration reader for the frontend container.
 * Values are sourced from the .env file via CRA's process.env.* injection.
 */

/** @typedef {{ apiBase: string, backendUrl: string, frontendUrl: string, wsUrl: string, nodeEnv: string, featureFlags: string, experimentsEnabled: string }} EnvConfig */

/**
 * PUBLIC_INTERFACE
 * Get environment configuration for API + WS. Never hardcode backend URLs.
 * @returns {EnvConfig}
 */
export function getEnvConfig() {
  const apiBase = process.env.REACT_APP_API_BASE || '';
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  const frontendUrl = process.env.REACT_APP_FRONTEND_URL || '';
  const wsUrl = process.env.REACT_APP_WS_URL || '';
  const nodeEnv = process.env.REACT_APP_NODE_ENV || process.env.NODE_ENV || 'development';
  const featureFlags = process.env.REACT_APP_FEATURE_FLAGS || '';
  const experimentsEnabled = process.env.REACT_APP_EXPERIMENTS_ENABLED || '';

  return { apiBase, backendUrl, frontendUrl, wsUrl, nodeEnv, featureFlags, experimentsEnabled };
}
