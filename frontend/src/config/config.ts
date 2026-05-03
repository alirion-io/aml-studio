/**
 * AML Studio — Application Configuration
 *
 * This file controls runtime configuration for AML Studio.
 * When a backend URL is defined here, Git-connected repository features
 * (GitHub OAuth, Bitbucket OAuth) are enabled.
 * When backendUrl is undefined or empty, those providers are shown but disabled.
 *
 * To configure a backend:
 *   Set VITE_BACKEND_URL in your .env file, e.g.:
 *     VITE_BACKEND_URL=https://your-backend.example.com
 *
 *   The backend is an AML Studio API server (AWS SAM-deployed or self-hosted).
 *   Without a backend, AML Studio operates in local-only mode:
 *   — Local repository creation and editing is fully functional.
 *   — Public repository import (by URL) is fully functional.
 *   — GitHub and Bitbucket OAuth connections are disabled (visible but locked).
 */

export interface AppConfig {
  /** Base URL of the AML Studio backend API. When undefined, backend features are disabled. */
  backendUrl: string | undefined;

  /** Whether Git provider connections are available (derived from backendUrl). */
  gitProvidersEnabled: boolean;

  /** Application version (injected at build time). */
  appVersion: string;

  /** AML JSON Schema version bundled at build time. */
  amlSchemaVersion: string;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;

if (backendUrl && !backendUrl.startsWith('https://') && import.meta.env.PROD) {
  console.warn('[AML Studio] VITE_BACKEND_URL is not HTTPS — session cookies may be exposed in transit');
}

const config: AppConfig = {
  backendUrl: backendUrl || undefined,
  gitProvidersEnabled: Boolean(backendUrl),
  appVersion: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
  amlSchemaVersion: '1.2',
};

export default config;
