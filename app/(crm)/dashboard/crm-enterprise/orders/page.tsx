"use client";

import { AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";
import { EnterpriseOrdersManager } from "@/components/crm/enterprise/enterprise-orders-manager";

/**
 * Dedicated CRM Enterprise orders page with permission check.
 */
export default function CrmEnterpriseOrdersPage() {
  const { user } = useAuth();

  if (!can(user, RBAC_PERMISSIONS.ordersView)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-600" />
        <h2 className="text-xl font-bold text-red-900">لا توجد صلاحيات</h2>
        <p className="text-sm text-red-700">ليس لديك صلاحية للدخول إلى صفحة الطلبات</p>
      </div>
    );
  }

  return <EnterpriseOrdersManager />;
}
