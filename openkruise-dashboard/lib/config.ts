// Application configuration
export const config = {
  // API base URL
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1',

  // Default namespace for Kubernetes resources
  defaultNamespace: process.env.NEXT_PUBLIC_DEFAULT_NAMESPACE || 'default',

  // Rollout feature flags
  rolloutWatchEnabled: process.env.NEXT_PUBLIC_ROLLOUT_WATCH_ENABLED !== 'false',
  rolloutAnalysisEnabled: process.env.NEXT_PUBLIC_ROLLOUT_ANALYSIS_ENABLED !== 'false',
  rollbackEnabled: process.env.NEXT_PUBLIC_ROLLBACK_ENABLED !== 'false',
} as const;
