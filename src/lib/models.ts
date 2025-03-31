
// Chat types and interfaces
export interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  client_id: string;
  is_from_client: boolean;
  created_at: string;
  is_read: boolean;
  sender_name?: string;
  attachment_url?: string;
  attachment_type?: string;
}

export type MessageHandler = (message: ChatMessage) => void;

// Client models
export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  domain?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  avatar?: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

// Task models
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  PENDING = 'pending' // Adding pending to match usage in components
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  client_id: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  due_date?: string;
}

// Resource models
export interface Resource {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: string;
  created_at: string;
}

// Video models
export interface Video {
  id: string;
  title: string;
  description?: string;
  youtube_id: string;
  url?: string;
  created_at: string;
}

// Offer models
export interface Offer {
  id: string;
  title: string;
  description?: string;
  discount_percentage?: number;
  price?: number;
  discount?: number;
  code?: string;
  valid_until: string;
  active?: boolean;
  created_at: string;
}

// Update models
export interface Update {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  is_published: boolean;
  created_at: string;
}
