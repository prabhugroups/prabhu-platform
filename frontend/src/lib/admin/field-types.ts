export interface FieldConfig {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "checkbox"
    | "date"
    | "media"
    | "json"
    | "select"
    | "richtext"
    | "nepali-date"
    | "toggle"
    | "url";
  required?: boolean;
  /** For "media" fields: which uploads/<tenant>/<module>/ subfolder to store under. */
  mediaModule?: string;
  /** For "select" fields. */
  options?: string[];
  /** For "select" fields: display labels for `options` values that aren't
   * self-explanatory (e.g. "notice_board" -> "Notice Board"). */
  optionLabels?: Record<string, string>;
}

export type ResourceRow = Record<string, unknown> & { id: number };
