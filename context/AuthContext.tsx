"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppUser } from "@/lib/utils";

interface AuthContextValue {
  user: AppUser | null;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<AppUser>) => Promise<void>;
  logout: () => Promise<void>;
  isImpersonating: boolean;
  stopImpersonation: () => void;
}

const defaultUser: AppUser = {
  id: "u_owner_001",
  username: "CRM Owner",
  email: "owner@acme-crm.com",
  role: "admin",
  accountType: "Owner",
  phone: "+966555123456",
  jobTitle: "Founder & Revenue Lead",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  permissions: [
    "viewAnalytics",
    "viewCustomers",
    "addCustomers",
    "editCustomers",
    "deleteCustomers",
    "viewOrders",
    "addOrders",
    "editOrders",
    "deleteOrders",
    "viewEmployees",
    "viewPermissions",
    "viewProducts",
    "viewCategories",
    "viewExpenses",
    "data:search",
    "data:export",
    "data:import",
    "leaves:create",
    "leaves:edit",
    "leaves:delete",
    "leaves:approve",
    "training:create",
    "training:edit",
    "training:delete",
    "announcements:manage",
    "documents:manage",
    "payslips:manage",
    // Expenses
    "expenses:view",
    "expenses:create",
    "expenses:edit",
    "expenses:delete",
    // Cash Flow
    "flows:view",
    "flows:create",
    "flows:edit",
    "flows:delete",
    // Warehouses
    "warehouses:view",
    "warehouses:create",
    "warehouses:edit",
    "warehouses:delete",
    // Shipping Companies
    "companies:view",
    "companies:create",
    "companies:edit",
    "companies:delete",
    // Returns
    "returns:view",
    "returns:create",
    "returns:edit",
    "returns:delete",
    // Team Tasks
    "tasks:view",
    "tasks:create",
    "tasks:edit",
    "tasks:delete",
    // CRM Customers
    "customers:view",
    "customers:create",
    "customers:edit",
    "customers:delete",
    // CRM Orders
    "orders:view",
    "orders:edit",
    "orders:delete",
    // CRM Products
    "products:view",
    "products:create",
    "products:edit",
    "products:delete",
  ],
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provides app-level auth state with a simple local user until backend auth is connected.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(defaultUser);
  const [isImpersonating, setIsImpersonating] = useState(false);

  /**
   * Re-fetches user profile; currently mocked to keep the API stable.
   */
  const refreshUser = useCallback(async () => {
    setUser((prev) => prev ?? defaultUser);
  }, []);

  /**
   * Updates the local mock user profile without requiring backend APIs.
   */
  const updateUser = useCallback(async (updates: Partial<AppUser>) => {
    setUser((prev) => {
      const baseUser = prev ?? defaultUser;
      return { ...baseUser, ...updates };
    });
  }, []);

  /**
   * Clears the current mock session.
   */
  const logout = useCallback(async () => {
    setUser(null);
  }, []);

  /**
   * Leaves impersonation mode and returns to base identity.
   */
  const stopImpersonation = useCallback(() => {
    setIsImpersonating(false);
  }, []);

  const value = useMemo(
    () => ({ user, refreshUser, updateUser, logout, isImpersonating, stopImpersonation }),
    [user, refreshUser, updateUser, logout, isImpersonating, stopImpersonation]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Reads auth context and throws if provider is missing.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
