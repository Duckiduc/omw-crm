import { Request } from "express";

// Database configuration types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: {
    rejectUnauthorized: boolean;
  };
}

// Environment configuration types
export interface CorsConfig {
  origin: string | boolean | string[];
  credentials: boolean;
  methods?: string[];
  allowedHeaders?: string[];
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export interface EnvironmentConfig {
  corsOrigins: string[] | string;
}

// User and authentication types
export interface User {
  id: string;
  userId: string; // Alias for id for backward compatibility
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthenticatedRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: User;
}

// Business entity types
export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_id?: string;
  company_name?: string;
  position?: string;
  status: string;
  tags?: string[];
  notes?: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: string;
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  industry?: string;
  size?: string;
  notes?: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Deal {
  id: string;
  title: string;
  value?: number;
  currency?: string;
  stage: string;
  probability?: number;
  expected_close_date?: Date;
  contact_id?: string;
  organization_id?: string;
  notes?: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  due_date?: Date;
  completed: boolean;
  contact_id?: string;
  organization_id?: string;
  deal_id?: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Share {
  id: string;
  resource_type: string;
  resource_id: string;
  shared_by: string;
  shared_with: string;
  permission: "view" | "edit";
  created_at: Date;
  updated_at: Date;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

// Database row types (for internal database operations)
export interface ContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_id?: string;
  position?: string;
  status: string;
  tags?: string;
  notes?: string;
  owner_id: string;
  user_id: string; // Alias for owner_id for backward compatibility
  created_at: Date;
  updated_at: Date;
  // Additional fields from JOIN queries
  company_name?: string;
  is_shared_with_me?: boolean;
  permission?: string;
  permissions?: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  industry?: string;
  size?: string;
  notes?: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface ActivityRow {
  id: string;
  type: string;
  title: string;
  description?: string;
  due_date?: Date;
  completed: boolean;
  contact_id?: string;
  organization_id?: string;
  deal_id?: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface DealRow {
  id: string;
  title: string;
  value?: number;
  currency?: string;
  stage: string;
  probability?: number;
  expected_close_date?: Date;
  contact_id?: string;
  organization_id?: string;
  notes?: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request body types for validation
export interface CreateContactRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_id?: string;
  position?: string;
  status?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateContactRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_id?: string;
  position?: string;
  status?: string;
  tags?: string[];
  notes?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  industry?: string;
  size?: string;
  notes?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  industry?: string;
  size?: string;
  notes?: string;
}

export interface CreateActivityRequest {
  type: string;
  title: string;
  description?: string;
  due_date?: string;
  contact_id?: string;
  organization_id?: string;
  deal_id?: string;
}

export interface UpdateActivityRequest {
  type?: string;
  title?: string;
  description?: string;
  due_date?: string;
  completed?: boolean;
  contact_id?: string;
  organization_id?: string;
  deal_id?: string;
}

export interface CreateDealRequest {
  title: string;
  value?: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expected_close_date?: string;
  contact_id?: string;
  organization_id?: string;
  notes?: string;
}

export interface UpdateDealRequest {
  title?: string;
  value?: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expected_close_date?: string;
  contact_id?: string;
  organization_id?: string;
  notes?: string;
}
