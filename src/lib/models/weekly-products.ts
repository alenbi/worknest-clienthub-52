
export interface WeeklyProduct {
  id: string;
  title: string;
  description?: string;
  is_published: boolean;
  created_at: Date | string;
}

export interface ProductLink {
  id: string;
  product_id: string;
  title: string;
  url: string;
  created_at: Date | string;
}

export interface WeeklyProductWithLinks extends WeeklyProduct {
  links: ProductLink[];
}

export interface ProductFormData {
  title: string;
  description: string;
  links: { title: string; url: string }[];
  is_published: boolean;
}
