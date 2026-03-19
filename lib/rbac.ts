import type { AppUser } from "@/lib/utils";

export const RBAC_PERMISSIONS = {
  // Data operations
  dataSearch: "data:search",
  dataExport: "data:export",
  dataImport: "data:import",

  // Leaves
  leavesCreate: "leaves:create",
  leavesEdit: "leaves:edit",
  leavesDelete: "leaves:delete",
  leavesApprove: "leaves:approve",

  // Training
  trainingCreate: "training:create",
  trainingEdit: "training:edit",
  trainingDelete: "training:delete",

  // Self-service managed content
  announcementsManage: "announcements:manage",
  documentsManage: "documents:manage",
  payslipsManage: "payslips:manage",
} as const;

export type RbacPermission = (typeof RBAC_PERMISSIONS)[keyof typeof RBAC_PERMISSIONS];

/**
 * Checks if user can perform a permission based action.
 */
export function can(user: AppUser | null | undefined, permission: RbacPermission): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return Boolean(user.permissions?.includes(permission));
}

/**
 * Checks if user has any permission from a given set.
 */
export function canAny(
  user: AppUser | null | undefined,
  permissions: RbacPermission[]
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return permissions.some((permission) => user.permissions?.includes(permission));
}
