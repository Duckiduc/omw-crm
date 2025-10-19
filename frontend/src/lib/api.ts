const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3002/api";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem("token");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.message || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    return this.request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.request<{ user: User }>("/auth/me");
  }

  // Contacts endpoints
  async getContacts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string;
    status?: "hot" | "warm" | "cold" | "all_good";
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.search) searchParams.append("search", params.search);
    if (params?.tags) searchParams.append("tags", params.tags);
    if (params?.status) searchParams.append("status", params.status);

    const query = searchParams.toString();
    return this.request<ContactsResponse>(
      `/contacts${query ? `?${query}` : ""}`
    );
  }

  async getContact(id: number) {
    return this.request<Contact>(`/contacts/${id}`);
  }

  async createContact(
    contact: Omit<Contact, "id" | "created_at" | "updated_at">
  ) {
    return this.request<Contact>("/contacts", {
      method: "POST",
      body: JSON.stringify(contact),
    });
  }

  async updateContact(id: number, contact: Partial<Contact>) {
    return this.request<Contact>(`/contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(contact),
    });
  }

  async deleteContact(id: number) {
    return this.request<{ message: string }>(`/contacts/${id}`, {
      method: "DELETE",
    });
  }

  async getContactTags() {
    return this.request<{ tags: string[] }>("/contacts/tags/all");
  }

  // Contact Notes endpoints
  async getContactNotes(contactId: number) {
    return this.request<{ notes: ContactNote[] }>(
      `/contact-notes/contact/${contactId}`
    );
  }

  async createContactNote(noteData: { contactId: number; content: string }) {
    return this.request<ContactNote>("/contact-notes", {
      method: "POST",
      body: JSON.stringify(noteData),
    });
  }

  async updateContactNote(noteId: number, content: string) {
    return this.request<ContactNote>(`/contact-notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  }

  async deleteContactNote(noteId: number) {
    return this.request<{ message: string }>(`/contact-notes/${noteId}`, {
      method: "DELETE",
    });
  }

  // Companies endpoints
  async getCompanies(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.search) searchParams.append("search", params.search);

    const query = searchParams.toString();
    return this.request<CompaniesResponse>(
      `/companies${query ? `?${query}` : ""}`
    );
  }

  async getCompany(id: number) {
    return this.request<CompanyWithDetails>(`/companies/${id}`);
  }

  async createCompany(
    company: Omit<Company, "id" | "created_at" | "updated_at">
  ) {
    return this.request<Company>("/companies", {
      method: "POST",
      body: JSON.stringify(company),
    });
  }

  async updateCompany(id: number, company: Partial<Company>) {
    return this.request<Company>(`/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(company),
    });
  }

  async deleteCompany(id: number) {
    return this.request<{ message: string }>(`/companies/${id}`, {
      method: "DELETE",
    });
  }

  // Deals endpoints
  async getDealStages() {
    return this.request<DealStage[]>("/deals/stages");
  }

  async getDeals(params?: {
    page?: number;
    limit?: number;
    search?: string;
    stageId?: number;
    companyId?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.search) searchParams.append("search", params.search);
    if (params?.stageId)
      searchParams.append("stageId", params.stageId.toString());
    if (params?.companyId)
      searchParams.append("companyId", params.companyId.toString());

    const query = searchParams.toString();
    return this.request<DealsResponse>(`/deals${query ? `?${query}` : ""}`);
  }

  async getDealsByStage() {
    return this.request<DealsByStage>("/deals/by-stage");
  }

  async getDeal(id: number) {
    return this.request<DealWithDetails>(`/deals/${id}`);
  }

  async createDeal(deal: Omit<Deal, "id" | "created_at" | "updated_at">) {
    return this.request<Deal>("/deals", {
      method: "POST",
      body: JSON.stringify(deal),
    });
  }

  async updateDeal(id: number, deal: Partial<Deal>) {
    return this.request<Deal>(`/deals/${id}`, {
      method: "PUT",
      body: JSON.stringify(deal),
    });
  }

  async deleteDeal(id: number) {
    return this.request<{ message: string }>(`/deals/${id}`, {
      method: "DELETE",
    });
  }

  // Activities endpoints
  async getActivities(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    completed?: boolean;
    contactId?: number;
    companyId?: number;
    dealId?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.search) searchParams.append("search", params.search);
    if (params?.type) searchParams.append("type", params.type);
    if (params?.completed !== undefined)
      searchParams.append("completed", params.completed.toString());
    if (params?.contactId)
      searchParams.append("contactId", params.contactId.toString());
    if (params?.companyId)
      searchParams.append("companyId", params.companyId.toString());
    if (params?.dealId) searchParams.append("dealId", params.dealId.toString());

    const query = searchParams.toString();
    return this.request<ActivitiesResponse>(
      `/activities${query ? `?${query}` : ""}`
    );
  }

  async getUpcomingActivities() {
    return this.request<ActivityWithDetails[]>("/activities/upcoming");
  }

  async getActivity(id: number) {
    return this.request<ActivityWithDetails>(`/activities/${id}`);
  }

  async createActivity(
    activity: Omit<Activity, "id" | "created_at" | "updated_at">
  ) {
    return this.request<Activity>("/activities", {
      method: "POST",
      body: JSON.stringify(activity),
    });
  }

  async updateActivity(id: number, activity: Partial<Activity>) {
    return this.request<Activity>(`/activities/${id}`, {
      method: "PUT",
      body: JSON.stringify(activity),
    });
  }

  async toggleActivityComplete(id: number) {
    return this.request<Activity>(`/activities/${id}/toggle-complete`, {
      method: "PATCH",
    });
  }

  async deleteActivity(id: number) {
    return this.request<{ message: string }>(`/activities/${id}`, {
      method: "DELETE",
    });
  }

  // Admin endpoints
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }) {
    let url = "/admin/users";
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.search) searchParams.append("search", params.search);
      if (params.role) searchParams.append("role", params.role);
      if (searchParams.toString()) url += `?${searchParams.toString()}`;
    }
    return this.request<UsersResponse>(url);
  }

  async getUser(id: number) {
    return this.request<User>(`/admin/users/${id}`);
  }

  async createUser(
    user: Omit<User, "id" | "created_at" | "updated_at"> & { password: string }
  ) {
    return this.request<User>("/admin/users", {
      method: "POST",
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: number, user: Partial<User & { password?: string }>) {
    return this.request<User>(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: number) {
    return this.request<{ message: string }>(`/admin/users/${id}`, {
      method: "DELETE",
    });
  }

  async getUserStats() {
    return this.request<{
      total: number;
      admins: number;
      regularUsers: number;
      newThisMonth: number;
    }>("/admin/users/stats/overview");
  }
}

// Types
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  // Backend also returns snake_case fields
  first_name?: string;
  last_name?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  companyId?: number;
  notes?: string;
  tags?: string[];
  status?: "hot" | "warm" | "cold" | "all_good";
  created_at: string;
  updated_at: string;
  company_name?: string;
}

export interface ContactNote {
  id: number;
  content: string;
  contactId: number;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: number;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  contact_count?: number;
  deal_count?: number;
}

export interface CompanyWithDetails extends Company {
  contacts: Contact[];
  deals: DealWithDetails[];
}

export interface DealStage {
  id: number;
  name: string;
  order_index: number;
  created_at: string;
}

export interface Deal {
  id: number;
  title: string;
  value: number;
  currency: string;
  stageId?: number;
  contactId?: number;
  companyId?: number;
  expectedCloseDate?: string;
  probability: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DealWithDetails extends Deal {
  // Database response includes both camelCase (for API) and snake_case (from DB)
  stage_id?: number;
  contact_id?: number;
  company_id?: number;
  expected_close_date?: string;
  stage_name?: string;
  contact_name?: string;
  company_name?: string;
}

export interface Activity {
  id: number;
  type: "call" | "email" | "meeting" | "note" | "task";
  subject: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  contactId?: number;
  companyId?: number;
  dealId?: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityWithDetails extends Activity {
  contact_name?: string;
  company_name?: string;
  deal_title?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ContactsResponse {
  contacts: Contact[];
  pagination: Pagination;
}

export interface CompaniesResponse {
  companies: Company[];
  pagination: Pagination;
}

export interface DealsResponse {
  deals: DealWithDetails[];
  pagination: Pagination;
}

export interface ActivitiesResponse {
  activities: ActivityWithDetails[];
  pagination: Pagination;
}

export interface DealsByStage {
  [stageId: string]: {
    stage: DealStage;
    deals: DealWithDetails[];
  };
}

export interface UsersResponse {
  users: User[];
  pagination: Pagination;
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
