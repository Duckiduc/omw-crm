import { Request } from "express";

// Extend Express Request to include user information
export interface AuthenticatedRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    userId: string;
    email: string;
    role?: string;
  };
}

// Database query result types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: "user" | "admin";
  created_at: Date;
  updated_at: Date;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_id?: string;
  position?: string;
  status?: string;
  tags?: string[];
  notes?: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface Organization {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface Deal {
  id: string;
  title: string;
  value?: number;
  stage: string;
  contact_id?: string;
  organization_id?: string;
  expected_close_date?: Date;
  probability?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface Activity {
  id: string;
  type: string;
  subject: string;
  description?: string;
  contact_id?: string;
  organization_id?: string;
  deal_id?: string;
  due_date?: Date;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface ContactNote {
  id: string;
  contact_id: string;
  note: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface ActivityNote {
  id: string;
  activity_id: string;
  note: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface Share {
  id: string;
  item_type: "contact" | "organization" | "deal" | "activity";
  item_id: string;
  shared_by_user_id: string;
  shared_with_user_id: string;
  permissions: "read" | "write";
  created_at: Date;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

// Environment configuration types
export interface EnvironmentConfig {
  corsOrigins: string[];
}

export interface CorsConfig {
  origin: string[];
  credentials: boolean;
}

// Database connection types
export interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
}
