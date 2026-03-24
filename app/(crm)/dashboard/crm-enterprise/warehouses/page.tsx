"use client";

import { useAuth } from "@/context/AuthContext";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";
import { EnterpriseWarehousesManager } from "@/components/crm/enterprise/enterprise-warehouses-manager";
import { AlertCircle } from "lucide-react";

/**
 * Dedicated CRM Enterprise warehouses page with permission check.
 */
export default function CrmEnterpriseWarehousesPage() {
  const { user } = useAuth();

  const hasPermission = can(user, RBAC_PERMISSIONS.warehousesView);

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-600" />
        <h2 className="text-xl font-bold text-red-900">لا توجد صلاحيات</h2>
        <p className="text-sm text-red-700">ليس لديك صلاحية للدخول إلى صفحة المخازن</p>
      </div>
    );
  }

  return <EnterpriseWarehousesManager />;
}
