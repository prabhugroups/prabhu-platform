export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "checkbox" | "date" | "media" | "json" | "select";
  required?: boolean;
  /** For "media" fields: which uploads/<tenant>/<module>/ subfolder to store under. */
  mediaModule?: string;
  /** For "select" fields. */
  options?: string[];
}

export type ResourceRow = Record<string, unknown> & { id: number };
