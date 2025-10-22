// Environment configuration for different deployment environments

interface EnvironmentConfig {
  API_BASE_URL: string;
  ENVIRONMENT: 'development' | 'production';
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

  if (isDevelopment) {
    return {
      API_BASE_URL: 'http://localhost:3001',
      ENVIRONMENT: 'development'
    };
  }

  // Production configuration - Railway API
  return {
    API_BASE_URL: 'https://clawse-business-compliance-production.up.railway.app/api',
    ENVIRONMENT: 'production'
  };
};

export const config = getEnvironmentConfig();

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  // Railway uses standard REST API format, same as development
  return `${config.API_BASE_URL}${endpoint}`;
};

// Export for debugging
export const debugConfig = () => {
  console.log('🔧 Environment Config:', {
    ...config,
    hostname: window.location.hostname,
    isDev: import.meta.env.DEV
  });
};
