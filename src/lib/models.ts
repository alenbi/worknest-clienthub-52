
// Define shared types
export type TaskStatus = 'open' | 'in progress' | 'done' | 'pending' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  domain?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  client_id: string;
  created_at: string;
  completed_at?: string;
  updated_at?: string;
  priority?: TaskPriority;
  due_date?: string;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: 'document' | 'video' | 'link' | string;
  created_at?: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  url?: string;
  youtube_id?: string;
  created_at?: string;
}

export interface Offer {
  id: string;
  title: string;
  description?: string;
  price?: number;
  discount?: number;
  active?: boolean;
  code?: string;
  discount_percentage?: number;
  valid_until?: string;
  created_at?: string;
}

export interface Update {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  is_published: boolean;
  created_at?: string;
}
