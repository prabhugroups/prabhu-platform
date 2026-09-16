export interface Tenant {
  slug: string;
  name: string;
  shareholder_module_enabled: boolean;
  primary_color: string;
  secondary_color: string;
  primary_light_color: string;
  font_family: string;
  logo_file: string | null;
  favicon_file: string | null;
  default_og_image_file: string | null;
  footer_text: string | null;
}

export interface NavItem {
  id: number;
  parent_id: number | null;
  location: "header" | "footer";
  label: string;
  url: string;
  sort_order: number;
  is_external: boolean;
}

export interface ContentSetting {
  id: number;
  group: string;
  key: string;
  type: string;
  value: string | null;
  title: string | null;
  file: string | null;
  infos: Record<string, unknown> | null;
}

export interface TeamMember {
  id: number;
  type: string;
  image: string | null;
  additional_info: Record<string, unknown> | null;
  sort_order: number;
}

export interface DocumentItem {
  id: number;
  title: string;
  file: string;
  type: string;
  date: string | null;
}

export interface GalleryImage {
  id: number;
  type: string;
  file: string;
}

export interface Gallery {
  id: number;
  title: string;
  date: string | null;
  images: GalleryImage[];
}

export interface Portfolio {
  id: number;
  title: string;
  file: string;
  type: string;
  sort_order: number;
}

export interface Faq {
  id: number;
  category: string | null;
  question: string;
  answer: string;
  sort_order: number;
}

export interface Popup {
  id: number;
  image: string;
  status: boolean;
}
