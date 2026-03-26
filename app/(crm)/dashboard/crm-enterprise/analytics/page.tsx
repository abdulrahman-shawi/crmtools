"use client";

import { useEffect, useMemo, useState } from "react";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import { crmEnterpriseModules } from "@/lib/data/mock-crm-enterprise";
import type { CrmModuleRow } from "@/lib/types/crm-enterprise";

const MODULE_STORAGE_KEY_PREFIX = "crm-enterprise-module-rows";

type AnalyticsRows = Record<string, CrmModuleRow[]>;

/**
 * Returns module rows from localStorage with fallback to mock rows.
 */
function getModuleRows(slug: string): CrmModuleRow[] {
  if (typeof window === "undefined") {
    return (crmEnterpriseModules[slug as keyof typeof crmEnterpriseModules]?.initialRows ?? []) as CrmModuleRow[];
  }

  const storageKey = `${MODULE_STORAGE_KEY_PREFIX}:${slug}`;
  const fallback = (crmEnterpriseModules[slug as keyof typeof crmEnterpriseModules]?.initialRows ?? []) as CrmModuleRow[];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as CrmModuleRow[];
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * Normalizes a numeric value from any row field.
 */
function asNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

/**
 * CRM enterprise analytics overview page.
 */
export default function CrmEnterpriseAnalyticsPage() {
  const [rowsByModule, setRowsByModule] = useState<AnalyticsRows>({});

  useEffect(() => {
    const slugs = [
      "customers",
      "orders",
      "products",
      "expenses",
      "cash-movements",
      "returns",
      "tasks",
      "invoices",
      "warehouses",
      "shipping-companies",
    ];

    const next: AnalyticsRows = {};
    slugs.forEach((slug) => {
      next[slug] = getModuleRows(slug);
    });

    setRowsByModule(next);
  }, []);

  const analytics = useMemo(() => {
    const customers = rowsByModule.customers ?? [];
    const orders = rowsByModule.orders ?? [];
    const products = rowsByModule.products ?? [];
    const expenses = rowsByModule.expenses ?? [];
    const cash = rowsByModule["cash-movements"] ?? [];
    const returns = rowsByModule.returns ?? [];
    const tasks = rowsByModule.tasks ?? [];
    const invoices = rowsByModule.invoices ?? [];
    const warehouses = rowsByModule.warehouses ?? [];
    const shipping = rowsByModule["shipping-companies"] ?? [];

    const activeCustomers = customers.filter((row) => String(row.status ?? "") === "active").length;
    const totalOrdersValue = orders.reduce((sum, row) => sum + asNumber(row.total), 0);
    const deliveredOrders = orders.filter((row) => String(row.status ?? "") === "delivered").length;
    const totalExpenses = expenses.reduce((sum, row) => sum + asNumber(row.amount), 0);

    const cashIn = cash
      .filter((row) => String(row.type ?? "") === "in")
      .reduce((sum, row) => sum + asNumber(row.amount), 0);
    const cashOut = cash
      .filter((row) => String(row.type ?? "") === "out")
      .reduce((sum, row) => sum + asNumber(row.amount), 0);

    const totalInvoices = invoices.reduce((sum, row) => sum + asNumber(row.amount), 0);
    const paidInvoices = invoices
      .filter((row) => String(row.status ?? "") === "paid")
      .reduce((sum, row) => sum + asNumber(row.amount), 0);

    const totalReturnsValue = returns.reduce((sum, row) => sum + asNumber(row.amount), 0);

    const totalTarget = tasks.reduce((sum, row) => sum + asNumber(row.targetCount), 0);
    const totalCompleted = tasks.reduce((sum, row) => sum + asNumber(row.completedCount), 0);
    const tasksProgress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

    const avgProductPrice = products.length > 0
      ? Math.round(products.reduce((sum, row) => sum + asNumber(row.price), 0) / products.length)
      : 0;

    const avgWarehouseUtilization = warehouses.length > 0
      ? Math.round(warehouses.reduce((sum, row) => sum + asNumber(row.utilization), 0) / warehouses.length)
      : 0;

    const avgShippingCost = shipping.length > 0
      ? Math.round(shipping.reduce((sum, row) => sum + asNumber(row.avgCost), 0) / shipping.length)
      : 0;

    const netOperational = totalOrdersValue + paidInvoices + cashIn - (totalExpenses + cashOut + totalReturnsValue);

    return {
      totalCustomers: customers.length,
      activeCustomers,
      totalOrders: orders.length,
      deliveredOrders,
      totalOrdersValue,
      totalExpenses,
      cashIn,
      cashOut,
      totalInvoices,
      paidInvoices,
      totalReturnsValue,
      totalProducts: products.length,
      avgProductPrice,
      tasksProgress,
      totalTarget,
      totalCompleted,
      avgWarehouseUtilization,
      avgShippingCost,
      netOperational,
    };
  }, [rowsByModule]);

  const moduleStats = useMemo(
    () => [
      { label: "العملاء", count: rowsByModule.customers?.length ?? 0 },
      { label: "الطلبات", count: rowsByModule.orders?.length ?? 0 },
      { label: "المنتجات", count: rowsByModule.products?.length ?? 0 },
      { label: "المصاريف", count: rowsByModule.expenses?.length ?? 0 },
      { label: "المرتجعات", count: rowsByModule.returns?.length ?? 0 },
      { label: "المهام", count: rowsByModule.tasks?.length ?? 0 },
      { label: "الفواتير", count: rowsByModule.invoices?.length ?? 0 },
      { label: "المخازن", count: rowsByModule.warehouses?.length ?? 0 },
      { label: "شركات الشحن", count: rowsByModule["shipping-companies"]?.length ?? 0 },
    ],
    [rowsByModule]
  );

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="تحليلات CRM"
        description="لوحة تحليلات شاملة للمبيعات والعملاء والتشغيل مبنية على البيانات الفعلية للموديولات."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DynamicCard className="border-l-4 border-l-blue-600">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-500">إجمالي العملاء</p>
            <p className="text-3xl font-bold text-slate-900">{analytics.totalCustomers}</p>
            <p className="text-xs text-slate-500">نشط: {analytics.activeCustomers}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-emerald-600">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-500">قيمة الطلبات</p>
            <p className="text-3xl font-bold text-emerald-700">{analytics.totalOrdersValue.toLocaleString()}</p>
            <p className="text-xs text-slate-500">طلبات مُسلّمة: {analytics.deliveredOrders}/{analytics.totalOrders}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-red-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-500">إجمالي المصاريف</p>
            <p className="text-3xl font-bold text-red-600">{analytics.totalExpenses.toLocaleString()}</p>
            <p className="text-xs text-slate-500">مرتجعات: {analytics.totalReturnsValue.toLocaleString()}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-violet-600">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-500">صافي تشغيلي</p>
            <p className="text-3xl font-bold text-violet-700">{analytics.netOperational.toLocaleString()}</p>
            <p className="text-xs text-slate-500">تدفق نقدي وارد/صادر: {analytics.cashIn.toLocaleString()} / {analytics.cashOut.toLocaleString()}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DynamicCard>
          <DynamicCard.Header title="تقدم مهام الفريق" description="نسبة الإنجاز مقابل العدد المستهدف للمهام." />
          <DynamicCard.Content className="space-y-3 pt-4">
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${analytics.tasksProgress}%` }} />
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>المنجز: {analytics.totalCompleted}</span>
              <span>المطلوب: {analytics.totalTarget}</span>
              <span className="font-semibold text-blue-700">{analytics.tasksProgress}%</span>
            </div>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard>
          <DynamicCard.Header title="كفاءة التشغيل" description="مؤشرات داعمة لإدارة التشغيل اليومية." />
          <DynamicCard.Content className="grid grid-cols-2 gap-3 pt-4">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">متوسط سعر المنتج</p>
              <p className="text-xl font-bold text-slate-900">{analytics.avgProductPrice.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">متوسط استخدام المخازن</p>
              <p className="text-xl font-bold text-slate-900">{analytics.avgWarehouseUtilization}%</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">متوسط تكلفة الشحن</p>
              <p className="text-xl font-bold text-slate-900">{analytics.avgShippingCost.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">تحصيل الفواتير</p>
              <p className="text-xl font-bold text-slate-900">
                {analytics.totalInvoices > 0 ? Math.round((analytics.paidInvoices / analytics.totalInvoices) * 100) : 0}%
              </p>
            </div>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="توزيع السجلات حسب الموديول" description="صورة سريعة لحجم البيانات في كل جزء من النظام." />
        <DynamicCard.Content className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {moduleStats.map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm text-slate-600">{item.label}</p>
                <p className="text-2xl font-bold text-slate-900">{item.count}</p>
              </div>
            ))}
          </div>
        </DynamicCard.Content>
      </DynamicCard>
    </section>
  );
}
