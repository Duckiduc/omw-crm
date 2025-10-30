// Simple environment configuration - just local and docker
interface EnvironmentConfig {
  apiUrl: string;
}

const config = {
  // Local development (Vite dev server, no Docker)
  local: {
    apiUrl: "http://localhost:3002/api",
  },

  // Docker deployment
  docker: {
    apiUrl: "http://localhost:3002/api",
  },

  // Production deployment
  production: {
    apiUrl: import.meta.env.VITE_API_URL || "/api",
  },

  // Get current environment configuration
  getCurrentConfig(): EnvironmentConfig {
    // Environment variable override (Vite)
    if (import.meta.env.VITE_CONFIG_ENV) {
      const configKey = import.meta.env.VITE_CONFIG_ENV;
      switch (configKey) {
        case "local":
          return this.local;
        case "docker":
          return this.docker;
        case "production":
          return this.production;
      }
    }

    // Production build
    if (import.meta.env.PROD) {
      return this.production;
    }

    // Check if Docker (simple detection - running on port 3000 in dev mode means Docker)
    const isDocker = window.location.port === "3000" && import.meta.env.DEV;

    if (isDocker) {
      return this.docker;
    }

    // Default to local development
    return this.local;
  },

  // Get API base URL
  getApiUrl(): string {
    // Direct environment variable override
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }

    const currentConfig = this.getCurrentConfig();
    return currentConfig.apiUrl;
  },
};

export default config;
