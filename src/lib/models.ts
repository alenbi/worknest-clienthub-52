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
