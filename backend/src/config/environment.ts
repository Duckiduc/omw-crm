import * as fs from "fs";
import { EnvironmentConfig, CorsConfig } from "../types";

interface ConfigEnvironments {
  local: EnvironmentConfig;
  docker: EnvironmentConfig;
  production: EnvironmentConfig;
}

// Simple environment configuration - just local and docker
const config: ConfigEnvironments & {
  getCurrentConfig(): EnvironmentConfig;
  getCorsConfig(): CorsConfig;
} = {
  // Local development (no Docker)
  local: {
    corsOrigins: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ],
  },

  // Docker deployment
  docker: {
    corsOrigins: ["http://localhost:3000", "http://localhost:5173"],
  },

  // Production deployment
  production: {
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((origin: string) =>
          origin.trim()
        )
      : [],
  },

  // Get current environment configuration
  getCurrentConfig(): EnvironmentConfig {
    // Environment variable override
    if (process.env.CONFIG_ENV) {
      const customConfig =
        this[process.env.CONFIG_ENV as keyof ConfigEnvironments];
      if (customConfig) return customConfig;
    }

    // Check if production
    if (process.env.NODE_ENV === "production") {
      return this.production;
    }

    // Check if Docker (simple detection)
    const isDocker = !!(
      process.env.DOCKER_CONTAINER ||
      process.env.DB_HOST === "db" ||
      fs.existsSync("/.dockerenv")
    );

    if (isDocker) {
      return this.docker;
    }

    // Default to local
    return this.local;
  },

  // Get CORS configuration
  getCorsConfig(): CorsConfig {
    const currentConfig = this.getCurrentConfig();

    // Always allow environment variable override
    if (process.env.CORS_ORIGINS) {
      const envOrigins = process.env.CORS_ORIGINS.split(",").map(
        (origin: string) => origin.trim()
      );
      return {
        origin: envOrigins,
        credentials: true,
      };
    }

    return {
      origin: currentConfig.corsOrigins,
      credentials: true,
    };
  },
};

export default config;
