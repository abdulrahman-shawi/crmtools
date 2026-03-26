"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Building2, Boxes, ClipboardList, PackageSearch, Settings2 } from "lucide-react";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import { crmEnterpriseModules, crmEnterpriseNavigation } from "@/lib/data/mock-crm-enterprise";
import type { CrmModuleRow } from "@/lib/types/crm-enterprise";

const iconBySlug: Record<string, React.ReactNode> = {
  customers: <Building2 className="h-5 w-5" />,
  products: <Boxes className="h-5 w-5" />,
  orders: <ClipboardList className="h-5 w-5" />,
  analytics: <Activity className="h-5 w-5" />,
  settings: <Settings2 className="h-5 w-5" />,
};

const TASKS_STORAGE_KEY = "crm-enterprise-module-rows:tasks";

/**
 * Computes a safe progress percentage from tasks row values.
 */
function getTaskProgressPercent(row: CrmModuleRow): number {
  const target = Number(row.targetCount ?? 0);
  const completed = Number(row.completedCount ?? 0);
  if (target <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((completed / target) * 100)));
}

/**
 * CRM enterprise modules index page.
 */
export default function CrmEnterprisePage() {
  const [taskRows, setTaskRows] = useState<CrmModuleRow[]>(
    (crmEnterpriseModules.tasks?.initialRows ?? []) as CrmModuleRow[]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as CrmModuleRow[];
      if (Array.isArray(parsed)) {
        setTaskRows(parsed);
      }
    } catch {
      // Keep fallback mock rows when local storage is invalid.
    }
  }, []);

  const taskOverview = useMemo(() => {
    const totalTasks = taskRows.length;
    const totalTarget = taskRows.reduce((sum, row) => sum + Math.max(0, Number(row.targetCount ?? 0)), 0);
    const totalCompleted = taskRows.reduce((sum, row) => sum + Math.max(0, Number(row.completedCount ?? 0)), 0);
    const doneTasks = taskRows.filter((row) => getTaskProgressPercent(row) >= 100).length;
    const overallProgress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

    return {
      totalTasks,
      totalTarget,
      totalCompleted,
      doneTasks,
      overallProgress,
    };
  }, [taskRows]);

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="CRM للشركات المتوسطة والكبيرة"
        description="منصة تشغيل متكاملة: عملاء، منتجات، تواصل، حالات، تصنيفات، طلبات، مصاريف، حركة صندوق، مخازن، شحن والمزيد."
      />

      <DynamicCard className="border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
        <DynamicCard.Header
          title="تقدم مهام الفريق"
          description="متابعة إنجاز المهام المرتبطة بالعملاء والطلبات والمنتجات من صفحة مهام الفرق."
        />
        <DynamicCard.Content className="space-y-4 pt-3">
          <div className="h-3 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${taskOverview.overallProgress}%` }} />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">إجمالي المهام</p>
              <p className="text-xl font-bold text-slate-900">{taskOverview.totalTasks}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">إجمالي المطلوب</p>
              <p className="text-xl font-bold text-slate-900">{taskOverview.totalTarget}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">المنجز</p>
              <p className="text-xl font-bold text-emerald-700">{taskOverview.totalCompleted}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">نسبة التقدم</p>
              <p className="text-xl font-bold text-blue-700">{taskOverview.overallProgress}%</p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            المهام المكتملة بالكامل: <span className="font-semibold text-slate-900">{taskOverview.doneTasks}</span> من أصل <span className="font-semibold text-slate-900">{taskOverview.totalTasks}</span>
          </p>
        </DynamicCard.Content>
      </DynamicCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {crmEnterpriseNavigation.map((module) => (
          <Link key={module.slug} href={`/dashboard/crm-enterprise/${module.slug}`}>
            <DynamicCard className="h-full border border-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
              <DynamicCard.Content className="space-y-3">
                <div className="flex items-center gap-2 text-blue-700">
                  {iconBySlug[module.slug] ?? <PackageSearch className="h-5 w-5" />}
                  <p className="font-semibold text-slate-900">{module.title}</p>
                </div>
                <p className="text-sm text-slate-600">{module.description}</p>
              </DynamicCard.Content>
            </DynamicCard>
          </Link>
        ))}

        <Link href="/dashboard/crm-enterprise/settings">
          <DynamicCard className="h-full border border-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
            <DynamicCard.Content className="space-y-3">
              <div className="flex items-center gap-2 text-blue-700">
                {iconBySlug.settings}
                <p className="font-semibold text-slate-900">الإعدادات العامة</p>
              </div>
              <p className="text-sm text-slate-600">تخصيص أقسام الموقع، الصفحات المعروضة، الحقول المطلوبة، ومعلومات الجداول.</p>
            </DynamicCard.Content>
          </DynamicCard>
        </Link>

        <Link href="/dashboard/crm-enterprise/analytics">
          <DynamicCard className="h-full border border-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
            <DynamicCard.Content className="space-y-3">
              <div className="flex items-center gap-2 text-blue-700">
                {iconBySlug.analytics}
                <p className="font-semibold text-slate-900">التحليلات</p>
              </div>
              <p className="text-sm text-slate-600">لوحة تحليلات شاملة للمبيعات والعملاء والطلبات والمصاريف والتشغيل.</p>
            </DynamicCard.Content>
          </DynamicCard>
        </Link>
      </div>
    </section>
  );
}
