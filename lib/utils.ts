import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export interface AppUser {
  id: string;
  username: string;
  email: string;
  role?: string;
  permissions?: string[];
  accountType?: string;
  phone?: string;
  jobTitle?: string;
  avatar?: string;
}

/**
 * Merges tailwind utility classes safely.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Checks whether user has one specific permission.
 */
export function hasPermission(user: AppUser | null | undefined, permission: string): boolean {
  return Boolean(user?.permissions?.includes(permission));
}

/**
 * Checks whether user has at least one permission from list.
 */
export function hasAnyPermission(
  user: AppUser | null | undefined,
  permissions: string[]
): boolean {
  if (!user?.permissions?.length) {
    return false;
  }

  return permissions.some((permission) => user.permissions?.includes(permission));
}

/**
 * Checks whether user is admin.
 */
export function isAdmin(user: AppUser | null | undefined): boolean {
  return user?.role === "admin";
}

/**
 * Formats phone number for display while preserving non-digits gracefully.
 */
export function formatPhoneForDisplay(phone?: string): string {
  if (!phone) {
    return "-";
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    return phone;
  }

  const countryCode = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : "";
  const local = digits.slice(-10);
  return `${countryCode}${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
