
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
  type: string;
  url: string;
  created_at: Date;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  youtube_id: string;
  created_at: Date;
}

export interface Offer {
  id: string;
  title: string;
  description?: string;
  discount_percentage?: number;
  valid_until: Date;
  code?: string;
  created_at: Date;
}
