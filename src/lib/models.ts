
import { User } from '@supabase/supabase-js';

// User with client information
export interface ClientUser extends User {
  name?: string;
  company?: string;
  client_id?: string;
}

// Client data model
export interface ClientData {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  domain: string | null;
  user_id: string | null;
  created_at?: string;
  updated_at?: string;
}

// Request model
export interface Request {
  id: string;
  client_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  
  // Additional fields for admin view (from join with clients table)
  client_name?: string;
  client_email?: string;
  client_company?: string;
}

// Client model
export interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  domain: string | null;
  user_id: string | null;
  avatar?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Task model
export interface Task {
  id: string;
  client_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// Task status enum
export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  PENDING = "pending",
  COMPLETED = "completed",
  BLOCKED = "blocked"
}

// Task priority enum
export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

// Resource model
export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
  created_at: string;
}

// Video model
export interface Video {
  id: string;
  title: string;
  description: string;
  youtube_id: string;
  created_at: string;
}

// Offer model
export interface Offer {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  code?: string;
  valid_until: string;
  created_at: string;
}

// Update model
export interface Update {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  image_url?: string;
  created_at: string;
}
