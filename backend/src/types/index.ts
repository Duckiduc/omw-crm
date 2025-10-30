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
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyId?: string;
  position?: string;
  status?: string;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
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
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface Deal {
  id: string;
  title: string;
  value?: number;
  stage: string;
  contactId?: string;
  organizationId?: string;
  expectedCloseDate?: Date;
  probability?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface Activity {
  id: string;
  type: string;
  subject: string;
  description?: string;
  contactId?: string;
  organizationId?: string;
  dealId?: string;
  dueDate?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface ContactNote {
  id: string;
  contactId: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface ActivityNote {
  id: string;
  activityId: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface Share {
  id: string;
  itemType: "contact" | "organization" | "deal" | "activity";
  itemId: string;
  sharedByUserId: string;
  sharedWithUserId: string;
  permissions: "read" | "write";
  createdAt: Date;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
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
