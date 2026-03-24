export const GENERAL_SETTINGS_STORAGE_KEY = "crm-enterprise-general-settings";

export interface GeneralFieldRule {
  id: string;
  key: string;
  label: string;
  type: string;
  isRequired: boolean;
  isVisible: boolean;
}

export interface GeneralTableColumnRule {
  id: string;
  key: string;
  label: string;
  isRequired: boolean;
  isVisible: boolean;
}

export interface GeneralPageRule {
  id: string;
  slug: string;
  title: string;
  description: string;
  isEnabled: boolean;
  showInNavigation: boolean;
  fields: GeneralFieldRule[];
  tableColumns: GeneralTableColumnRule[];
}

export interface GeneralSettingsShape {
  sections: Array<{
    id: string;
    title: string;
    description: string;
    isVisible: boolean;
    displayOrder: number;
  }>;
  pages: GeneralPageRule[];
  updatedAt: string;
}

/**
 * Returns one page settings rule by slug from localStorage, if available.
 */
export function readGeneralPageSettings(slug: string): GeneralPageRule | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(GENERAL_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as GeneralSettingsShape;
    if (!Array.isArray(parsed.pages)) {
      return null;
    }

    const page = parsed.pages.find((item) => item.slug === slug);
    if (!page) {
      return null;
    }

    return {
      ...page,
      fields: Array.isArray(page.fields) ? page.fields : [],
      tableColumns: Array.isArray(page.tableColumns) ? page.tableColumns : [],
    };
  } catch {
    return null;
  }
}

/**
 * Returns true when a specific field key is marked as required.
 */
export function isFieldRequired(page: GeneralPageRule | null, fieldKey: string): boolean {
  return Boolean(page?.fields?.some((field) => field.key === fieldKey && field.isRequired));
}

/**
 * Returns true when a specific table column key is marked visible.
 */
export function isColumnVisible(page: GeneralPageRule | null, columnKey: string): boolean {
  return Boolean(page?.tableColumns?.some((column) => column.key === columnKey && column.isVisible));
}
