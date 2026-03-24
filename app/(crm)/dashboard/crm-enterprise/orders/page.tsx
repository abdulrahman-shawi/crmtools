"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GENERAL_SETTINGS_UPDATED_EVENT, isPageEnabled, readGeneralPageSettings } from "@/lib/crm-general-settings";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";
import { EnterpriseOrdersManager } from "@/components/crm/enterprise/enterprise-orders-manager";

/**
 * Dedicated CRM Enterprise orders page with permission check.
 */
export default function CrmEnterpriseOrdersPage() {
  const { user } = useAuth();
  const [pageEnabled, setPageEnabled] = useState(true);

  useEffect(() => {
    const applySettings = () => {
      const page = readGeneralPageSettings("orders");
      setPageEnabled(isPageEnabled(page));
    };

    applySettings();
    window.addEventListener("storage", applySettings);
    window.addEventListener(GENERAL_SETTINGS_UPDATED_EVENT, applySettings);

    return () => {
      window.removeEventListener("storage", applySettings);
      window.removeEventListener(GENERAL_SETTINGS_UPDATED_EVENT, applySettings);
    };
  }, []);

  if (!can(user, RBAC_PERMISSIONS.ordersView)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-600" />
        <h2 className="text-xl font-bold text-red-900">لا توجد صلاحيات</h2>
        <p className="text-sm text-red-700">ليس لديك صلاحية للدخول إلى صفحة الطلبات</p>
      </div>
    );
  }

  if (!pageEnabled) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-600" />
        <h2 className="text-xl font-bold text-amber-900">الصفحة غير مفعلة</h2>
        <p className="text-sm text-amber-700">تم إيقاف صفحة الطلبات من الإعدادات العامة</p>
      </div>
    );
  }

  return <EnterpriseOrdersManager />;
}
