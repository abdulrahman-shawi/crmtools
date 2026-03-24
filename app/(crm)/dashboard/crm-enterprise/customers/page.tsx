"use client";

import { AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";
import { EnterpriseCustomersManager } from "../../../../../components/crm/enterprise/enterprise-customers-manager";

/**
 * Dedicated CRM Enterprise customers page with permission check.
 */
export default function CrmEnterpriseCustomersPage() {
  const { user } = useAuth();

  if (!can(user, RBAC_PERMISSIONS.customersView)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-600" />
        <h2 className="text-xl font-bold text-red-900">لا توجد صلاحيات</h2>
        <p className="text-sm text-red-700">ليس لديك صلاحية للدخول إلى صفحة العملاء</p>
      </div>
    );
  }

  return <EnterpriseCustomersManager />;
}
