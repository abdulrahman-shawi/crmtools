export const GENERAL_SETTINGS_STORAGE_KEY = "crm-enterprise-general-settings";
export const GENERAL_SETTINGS_UPDATED_EVENT = "crm-enterprise-general-settings-updated";

export interface GeneralFieldRule {
  id: string;
  key: string;
  label: string;
  type: string;
  options?: string[];
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
 * Reads the full general settings object from localStorage.
 */
export function readGeneralSettings(): GeneralSettingsShape | null {
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

    return {
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      pages: parsed.pages.map((page) => ({
        ...page,
        fields: Array.isArray(page.fields) ? page.fields : [],
        tableColumns: Array.isArray(page.tableColumns) ? page.tableColumns : [],
      })),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Returns one page settings rule by slug from localStorage, if available.
 */
export function readGeneralPageSettings(slug: string): GeneralPageRule | null {
  const settings = readGeneralSettings();
  if (!settings) {
    return null;
  }

  const page = settings.pages.find((item) => item.slug === slug);
    if (!page) {
      return null;
    }

  return {
    ...page,
    fields: Array.isArray(page.fields) ? page.fields : [],
    tableColumns: Array.isArray(page.tableColumns) ? page.tableColumns : [],
  };
}

/**
 * Creates a map of page settings keyed by page slug.
 */
export function readGeneralPageSettingsMap(): Record<string, GeneralPageRule> {
  const settings = readGeneralSettings();
  if (!settings) {
    return {};
  }

  return Object.fromEntries(settings.pages.map((page) => [page.slug, page]));
}

/**
 * Returns whether the page is enabled, defaulting to true when not configured.
 */
export function isPageEnabled(page: GeneralPageRule | null): boolean {
  if (!page) {
    return true;
  }

  return page.isEnabled;
}

/**
 * Returns whether the page should appear in navigation, defaulting to true when not configured.
 */
export function isPageShownInNavigation(page: GeneralPageRule | null): boolean {
  if (!page) {
    return true;
  }

  return page.showInNavigation;
}

/**
 * Returns true when a specific field key is marked as required.
 */
export function isFieldRequired(page: GeneralPageRule | null, fieldKey: string): boolean {
  return Boolean(page?.fields?.some((field) => field.key === fieldKey && field.isRequired));
}

/**
 * Returns true when a specific field key is visible (defaults to true when no settings exist).
 */
export function isFieldVisible(page: GeneralPageRule | null, fieldKey: string): boolean {
  if (!page) {
    return true;
  }

  const field = page.fields?.find((item) => item.key === fieldKey);
  if (!field) {
    return true;
  }

  return field.isVisible !== false;
}

/**
 * Returns true when a specific table column key is marked visible.
 */
export function isColumnVisible(page: GeneralPageRule | null, columnKey: string): boolean {
  const column = page?.tableColumns?.find((item) => item.key === columnKey);
  if (!column) {
    return false;
  }

  return column.isVisible !== false;
}

/**
 * Resolves a field label from settings with a fallback label.
 */
export function getFieldLabel(page: GeneralPageRule | null, fieldKey: string, fallbackLabel: string): string {
  const field = page?.fields?.find((item) => item.key === fieldKey);
  return field?.label?.trim() || fallbackLabel;
}

/**
 * Resolves a table column label from settings with a fallback label.
 */
export function getColumnLabel(page: GeneralPageRule | null, columnKey: string, fallbackLabel: string): string {
  const column = page?.tableColumns?.find((item) => item.key === columnKey);
  return column?.label?.trim() || fallbackLabel;
}
