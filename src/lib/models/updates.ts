
export interface Update {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  is_published: boolean;
  created_at: Date | string;
}

export interface UpdateFormData {
  title: string;
  content: string;
  image_url?: string;
  is_published: boolean;
}
