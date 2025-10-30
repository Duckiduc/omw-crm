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
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
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
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyId?: string;
  companyName?: string;
  position?: string;
  status: string;
  tags?: string[];
  notes?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
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
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  title: string;
  value?: number;
  currency?: string;
  stage: string;
  probability?: number;
  expectedCloseDate?: Date;
  contactId?: string;
  organizationId?: string;
  notes?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  contactId?: string;
  organizationId?: string;
  dealId?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Share {
  id: string;
  resourceType: string;
  resourceId: string;
  sharedBy: string;
  sharedWith: string;
  permission: "view" | "edit";
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemSetting {
  id: string;
  settingKey: string;
  settingValue: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Database row types (for internal database operations)
export interface ContactRow {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyId?: string;
  position?: string;
  status: string;
  tags?: string;
  notes?: string;
  ownerId: string;
  userId: string; // Alias for ownerId for backward compatibility
  createdAt: Date;
  updatedAt: Date;
  // Additional fields from JOIN queries
  companyName?: string;
  isSharedWithMe?: boolean;
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
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityRow {
  id: string;
  type: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  contactId?: string;
  organizationId?: string;
  dealId?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealRow {
  id: string;
  title: string;
  value?: number;
  currency?: string;
  stage: string;
  probability?: number;
  expectedCloseDate?: Date;
  contactId?: string;
  organizationId?: string;
  notes?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
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
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyId?: string;
  position?: string;
  status?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateContactRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyId?: string;
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
  dueDate?: string;
  contactId?: string;
  organizationId?: string;
  dealId?: string;
}

export interface UpdateActivityRequest {
  type?: string;
  title?: string;
  description?: string;
  dueDate?: string;
  completed?: boolean;
  contactId?: string;
  organizationId?: string;
  dealId?: string;
}

export interface CreateDealRequest {
  title: string;
  value?: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  contactId?: string;
  organizationId?: string;
  notes?: string;
}

export interface UpdateDealRequest {
  title?: string;
  value?: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  contactId?: string;
  organizationId?: string;
  notes?: string;
}
