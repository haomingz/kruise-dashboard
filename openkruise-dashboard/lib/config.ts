// Application configuration
export const config = {
  // API base URL
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1',
  
  // Default namespace for Kubernetes resources
  defaultNamespace: process.env.NEXT_PUBLIC_DEFAULT_NAMESPACE || 'default',
} as const;
