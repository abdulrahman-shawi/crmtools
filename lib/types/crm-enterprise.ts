export type CrmFieldType = "text" | "number" | "date" | "select" | "textarea";

export interface CrmFieldOption {
  value: string;
  label: string;
}

export interface CrmModuleField {
  key: string;
  label: string;
  type: CrmFieldType;
  required?: boolean;
  options?: CrmFieldOption[];
  placeholder?: string;
}

export interface CrmModuleColumn {
  key: string;
  label: string;
}

export interface CrmModuleRow {
  id: string;
  [key: string]: string | number;
}

export interface CrmModuleDefinition {
  slug: string;
  title: string;
  description: string;
  addLabel: string;
  fields: CrmModuleField[];
  columns: CrmModuleColumn[];
  initialRows: CrmModuleRow[];
}
