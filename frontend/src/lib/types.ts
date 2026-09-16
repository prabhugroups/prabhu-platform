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
  name: string | null;
  role: string | null;
  company_name: string | null;
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

export interface Banner {
  id: number;
  title: string;
  link: string | null;
  file: string;
  sort_order: number;
}

export interface TenantContact {
  phone_primary: string | null;
  phone_secondary: string | null;
  email: string | null;
  location: string | null;
  opening_hours: string | null;
  whatsapp_number: string | null;
  registered_office: string | null;
  branch_office: string | null;
  copyright_text: string | null;
  map_file: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
}

export interface HomeContentData {
  about_content: string | null;
  highlighted_content: string | null;
}

export interface Stakeholder {
  id: number;
  logo_file: string;
  link: string | null;
  sort_order: number;
}

export interface Associate {
  id: number;
  logo_file: string;
  link: string | null;
  sort_order: number;
}

export interface Spokesperson {
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  image: string | null;
  show: boolean;
}

export interface PageSeo {
  page_key: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
}

export type AboutSection = "overview" | "strategic_objectives" | "corporate_governance";

export interface AboutPageData {
  section: AboutSection;
  description: string | null;
  highlighted_content: string | null;
  bullet_point_content: string | null;
  file: string | null;
}

export interface HomeContentBundle {
  about: HomeContentData | null;
  stakeholders: Stakeholder[];
  associates: Associate[];
  spokesperson: Spokesperson | null;
}
