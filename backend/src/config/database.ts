import { Pool, QueryResult, QueryResultRow } from "pg";
import dotenv from "dotenv";
import { DatabaseConfig } from "../types";

dotenv.config();

const config: DatabaseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "omw_crm",
  user: process.env.DB_USER || "",
  password: process.env.DB_PASSWORD || "",
};

const pool = new Pool(config);

// Test connection
pool.on("connect", () => {
  console.log("📊 Connected to PostgreSQL database");
});

pool.on("error", (err: Error) => {
  console.error("❌ Database connection error:", err);
});

interface DatabaseConnection {
  query: <T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ) => Promise<QueryResult<T>>;
  pool: Pool;
}

const db: DatabaseConnection = {
  query: async <T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> => {
    return pool.query<T>(text, params);
  },
  pool,
};

export default db;
