"use client";

import { useAuth } from "@/context/AuthContext";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";
import { AlertCircle } from "lucide-react";
import { EnterpriseModuleManager } from "@/components/crm/enterprise-module-manager";
import type { CrmModuleDefinition } from "@/lib/types/crm-enterprise";

interface EnterpriseModuleGateProps {
  module: CrmModuleDefinition;
  moduleName: string;
}

/**
 * Maps module names to required permissions.
 */
const modulePermissions: Record<string, string> = {
  tasks: RBAC_PERMISSIONS.tasksView,
  invoices: "invoices:view",
  opportunities: "opportunities:view",
};

/**
 * Permission gate for enterprise modules - checks access before rendering.
 */
export function EnterpriseModuleGate({ module, moduleName }: EnterpriseModuleGateProps) {
  const { user } = useAuth();

  // Check if module requires permission validation
  const requiredPermission = modulePermissions[moduleName];
  if (requiredPermission && !can(user, requiredPermission as any)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-600" />
        <h2 className="text-xl font-bold text-red-900">لا توجد صلاحيات</h2>
        <p className="text-sm text-red-700">ليس لديك صلاحية للدخول إلى {module.title}</p>
      </div>
    );
  }

  return <EnterpriseModuleManager module={module} />;
}
