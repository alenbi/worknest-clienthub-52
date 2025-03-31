
// Define interfaces for the newly created tables
export interface ClientMessage {
  id: string;
  client_id: string;
  sender_id: string;
  is_from_client: boolean;
  message: string;
  attachment_url?: string;
  attachment_type?: string;
  is_read: boolean;
  created_at: Date;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  type: "file" | "link" | string; // Allow string to handle database values
  url: string;
  created_at: Date | string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  youtube_id: string;
  created_at: Date | string;
}

export interface Offer {
  id: string;
  title: string;
  description?: string;
  discount_percentage?: number;
  valid_until: Date | string;
  code?: string;
  created_at: Date | string;
}

// Client creation/update form types
export interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  domain?: string;
  password?: string;
}
