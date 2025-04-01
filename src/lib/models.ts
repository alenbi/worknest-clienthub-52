export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
  created_at: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  youtube_id: string;
  created_at: string;
  url?: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  valid_until: string;
  code?: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  domain?: string;
  avatar?: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
}

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  PENDING = "pending",
  COMPLETED = "completed",
  BLOCKED = "blocked"
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  client_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface Update {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  image_url?: string;
  created_at: string;
}

export interface Request {
  id: string;
  title: string;
  description: string;
  client_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  
  // Additional client info fields that might come from RPC functions
  client_name?: string;
  client_email?: string;
  client_company?: string;
}
