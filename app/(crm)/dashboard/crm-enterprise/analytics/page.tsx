"use client";

import { useEffect, useMemo, useState } from "react";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import { crmEnterpriseModules } from "@/lib/data/mock-crm-enterprise";

type DateRange = {
  from: string;
  to: string;
};

type SalesOrderRow = {
  id: string;
  date?: string;
  customerName?: string;
  receiverCity?: string;
  status?: string;
  total?: number;
};

type SalesInvoiceItemRow = {
  id: string;
  name?: string;
  quantity?: number;
};

type SalesInvoiceRow = {
  id: string;
  date?: string;
  status?: string;
  amount?: number;
  items?: SalesInvoiceItemRow[];
};

type ProductCatalogRow = {
  id: string;
  type?: string;
  createdAt?: string;
  productName?: string;
  quantity?: number;
  price?: number;
};

type ExpenseRow = {
  id: string;
  date?: string;
  totalAmount?: number;
};

type CashMovementRow = {
  id: string;
  date?: string;
  amount?: number;
  type?: string;
};

type ReturnRow = {
  id: string;
  createdAt?: string;
  amount?: number;
};

type TaskRow = {
  id: string;
  dueDate?: string;
  assignee?: string;
  taskType?: string;
  entityType?: string;
  targetCount?: number;
  completedCount?: number;
};

const STORAGE_KEYS = {
  orders: "crm-enterprise-sales-orders",
  invoices: "crm-enterprise-sales-invoices",
  products: "crm-enterprise-products-catalog",
  expenses: "crm-enterprise-expenses",
  cashMovements: "crm-enterprise-cash-movements",
  returns: "crm-enterprise-returns",
  tasks: "crm-enterprise-module-rows:tasks",
};

/**
 * Reads an array from localStorage with a typed fallback.
 */
function readStorageArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Converts unknown value to a safe number.
 */
function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Returns true when the date is within the selected range.
 */
function isInRange(dateValue: string | undefined, range: DateRange): boolean {
  if (!dateValue) {
    return true;
  }

  if (range.from && dateValue < range.from) {
    return false;
  }

  if (range.to && dateValue > range.to) {
    return false;
  }

  return true;
}

/**
 * Returns country name based on city fallback mapping.
 */
function inferCountryByCity(city: string): string {
  const normalized = city.trim().toLowerCase();
  const map: Record<string, string> = {
    "الرياض": "السعودية",
    "جدة": "السعودية",
    "الدمام": "السعودية",
    "مكة": "السعودية",
    "المدينة": "السعودية",
    "دبي": "الإمارات",
    "أبوظبي": "الإمارات",
    "الشارقة": "الإمارات",
    "الدوحة": "قطر",
    "الكويت": "الكويت",
    "المنامة": "البحرين",
    "مسقط": "عمان",
    "القاهرة": "مصر",
    "عمان": "الأردن",
  };

  for (const [key, country] of Object.entries(map)) {
    if (normalized.includes(key.toLowerCase())) {
      return country;
    }
  }

  return "غير محدد";
}

/**
 * Builds top list by numeric values.
 */
function topEntries(input: Record<string, number>, limit = 7): Array<{ name: string; value: number }> {
  return Object.entries(input)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * Date range control used in analytics sections.
 */
function DateRangeControl({ value, onChange, idPrefix }: { value: DateRange; onChange: (next: DateRange) => void; idPrefix: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <input
        id={`${idPrefix}-from`}
        type="date"
        className="h-9 rounded-lg border border-slate-200 px-2 text-xs"
        value={value.from}
        onChange={(event) => onChange({ ...value, from: event.target.value })}
      />
      <input
        id={`${idPrefix}-to`}
        type="date"
        className="h-9 rounded-lg border border-slate-200 px-2 text-xs"
        value={value.to}
        onChange={(event) => onChange({ ...value, to: event.target.value })}
      />
    </div>
  );
}

/**
 * CRM analytics page with multi-domain insights and section-level time filters.
 */
export default function CrmEnterpriseAnalyticsPage() {
  const [orders, setOrders] = useState<SalesOrderRow[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoiceRow[]>([]);
  const [products, setProducts] = useState<ProductCatalogRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovementRow[]>([]);
  const [returnsRows, setReturnsRows] = useState<ReturnRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const [salesRange, setSalesRange] = useState<DateRange>({ from: "", to: "" });
  const [ordersRange, setOrdersRange] = useState<DateRange>({ from: "", to: "" });
  const [productsRange, setProductsRange] = useState<DateRange>({ from: "", to: "" });
  const [employeesRange, setEmployeesRange] = useState<DateRange>({ from: "", to: "" });
  const [financeRange, setFinanceRange] = useState<DateRange>({ from: "", to: "" });

  useEffect(() => {
    setOrders(
      readStorageArray<SalesOrderRow>(
        STORAGE_KEYS.orders,
        (crmEnterpriseModules.orders?.initialRows ?? []) as SalesOrderRow[]
      )
    );

    setInvoices(
      readStorageArray<SalesInvoiceRow>(
        STORAGE_KEYS.invoices,
        (crmEnterpriseModules.invoices?.initialRows ?? []) as SalesInvoiceRow[]
      )
    );

    setProducts(
      readStorageArray<ProductCatalogRow>(
        STORAGE_KEYS.products,
        (crmEnterpriseModules.products?.initialRows ?? []) as ProductCatalogRow[]
      )
    );

    setExpenses(readStorageArray<ExpenseRow>(STORAGE_KEYS.expenses, []));
    setCashMovements(readStorageArray<CashMovementRow>(STORAGE_KEYS.cashMovements, []));
    setReturnsRows(readStorageArray<ReturnRow>(STORAGE_KEYS.returns, []));

    setTasks(
      readStorageArray<TaskRow>(
        STORAGE_KEYS.tasks,
        (crmEnterpriseModules.tasks?.initialRows ?? []) as TaskRow[]
      )
    );
  }, []);

  const salesAnalytics = useMemo(() => {
    const filteredOrders = orders.filter((row) => isInRange(row.date, salesRange));
    const filteredInvoices = invoices.filter((row) => isInRange(row.date, salesRange));

    const ordersValue = filteredOrders.reduce((sum, row) => sum + toNumber(row.total), 0);
    const paidInvoices = filteredInvoices.filter((row) => String(row.status ?? "") === "paid");
    const paidInvoicesValue = paidInvoices.reduce((sum, row) => sum + toNumber(row.amount), 0);

    const totalInvoiceItems = filteredInvoices.flatMap((invoice) => (Array.isArray(invoice.items) ? invoice.items : []));

    const productQtyMap: Record<string, number> = {};
    totalInvoiceItems.forEach((item) => {
      const productName = String(item.name ?? "منتج غير معروف");
      productQtyMap[productName] = (productQtyMap[productName] ?? 0) + toNumber(item.quantity);
    });

    return {
      ordersCount: filteredOrders.length,
      ordersValue,
      paidInvoicesValue,
      totalInvoiceItemsCount: totalInvoiceItems.length,
      topProductsSold: topEntries(productQtyMap, 8),
    };
  }, [orders, invoices, salesRange]);

  const ordersAnalytics = useMemo(() => {
    const filteredOrders = orders.filter((row) => isInRange(row.date, ordersRange));

    const byStatus: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    const byCountry: Record<string, number> = {};

    filteredOrders.forEach((row) => {
      const status = String(row.status ?? "غير محدد");
      const city = String(row.receiverCity ?? "غير محدد");
      const country = inferCountryByCity(city);

      byStatus[status] = (byStatus[status] ?? 0) + 1;
      byCity[city] = (byCity[city] ?? 0) + 1;
      byCountry[country] = (byCountry[country] ?? 0) + 1;
    });

    return {
      totalOrders: filteredOrders.length,
      byStatus: topEntries(byStatus, 10),
      byCity: topEntries(byCity, 10),
      byCountry: topEntries(byCountry, 10),
    };
  }, [orders, ordersRange]);

  const productsAnalytics = useMemo(() => {
    const filteredProducts = products.filter((row) => isInRange(row.createdAt, productsRange));
    const productOnly = filteredProducts.filter((row) => String(row.type ?? "product") === "product");

    const lowStock = productOnly
      .map((row) => ({
        name: String(row.productName ?? "منتج غير معروف"),
        stock: toNumber(row.quantity),
        price: toNumber(row.price),
      }))
      .filter((row) => row.stock <= 10)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 12);

    const avgPrice = productOnly.length > 0
      ? Math.round(productOnly.reduce((sum, row) => sum + toNumber(row.price), 0) / productOnly.length)
      : 0;

    return {
      totalProducts: productOnly.length,
      avgPrice,
      lowStock,
    };
  }, [products, productsRange]);

  const employeesAnalytics = useMemo(() => {
    const filteredTasks = tasks.filter((row) => isInRange(row.dueDate, employeesRange));

    const salesByAssignee: Record<string, number> = {};
    const customerAddsByAssignee: Record<string, number> = {};

    filteredTasks.forEach((row) => {
      const assignee = String(row.assignee ?? "غير محدد");
      const entityType = String(row.entityType ?? "");
      const completedCount = toNumber(row.completedCount);
      const taskType = String(row.taskType ?? "");

      if (entityType === "orders") {
        salesByAssignee[assignee] = (salesByAssignee[assignee] ?? 0) + completedCount;
      }

      if (entityType === "customers" && taskType === "addition") {
        customerAddsByAssignee[assignee] = (customerAddsByAssignee[assignee] ?? 0) + completedCount;
      }
    });

    const totalTarget = filteredTasks.reduce((sum, row) => sum + toNumber(row.targetCount), 0);
    const totalCompleted = filteredTasks.reduce((sum, row) => sum + toNumber(row.completedCount), 0);
    const progress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

    return {
      totalTasks: filteredTasks.length,
      totalTarget,
      totalCompleted,
      progress,
      topSellers: topEntries(salesByAssignee, 8),
      topCustomerAdders: topEntries(customerAddsByAssignee, 8),
    };
  }, [tasks, employeesRange]);

  const financeAnalytics = useMemo(() => {
    const filteredExpenses = expenses.filter((row) => isInRange(row.date, financeRange));
    const filteredCash = cashMovements.filter((row) => isInRange(row.date, financeRange));
    const filteredReturns = returnsRows.filter((row) => isInRange(row.createdAt, financeRange));
    const filteredInvoices = invoices.filter((row) => isInRange(row.date, financeRange));

    const totalExpenses = filteredExpenses.reduce((sum, row) => sum + toNumber(row.totalAmount), 0);
    const cashIn = filteredCash
      .filter((row) => String(row.type ?? "") === "in")
      .reduce((sum, row) => sum + toNumber(row.amount), 0);
    const cashOut = filteredCash
      .filter((row) => String(row.type ?? "") === "out")
      .reduce((sum, row) => sum + toNumber(row.amount), 0);
    const totalReturns = filteredReturns.reduce((sum, row) => sum + toNumber(row.amount), 0);

    const totalInvoices = filteredInvoices.reduce((sum, row) => sum + toNumber(row.amount), 0);
    const paidInvoices = filteredInvoices
      .filter((row) => String(row.status ?? "") === "paid")
      .reduce((sum, row) => sum + toNumber(row.amount), 0);

    const netFlow = cashIn + paidInvoices - (cashOut + totalExpenses + totalReturns);

    return {
      totalExpenses,
      cashIn,
      cashOut,
      totalReturns,
      totalInvoices,
      paidInvoices,
      netFlow,
      collectionRate: totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0,
    };
  }, [expenses, cashMovements, returnsRows, invoices, financeRange]);

  const totalOverviewCount =
    orders.length + invoices.length + products.length + expenses.length + cashMovements.length + returnsRows.length + tasks.length;

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="تحليلات CRM المتقدمة"
        description="تحليلات تفصيلية شاملة مع فلاتر زمنية مستقلة لكل قسم لقراءة أداء المبيعات والطلبات والمنتجات والموظفين والمالية."
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <DynamicCard><DynamicCard.Content className="py-3"><p className="text-xs text-slate-500">إجمالي الطلبات</p><p className="text-2xl font-bold">{orders.length}</p></DynamicCard.Content></DynamicCard>
        <DynamicCard><DynamicCard.Content className="py-3"><p className="text-xs text-slate-500">إجمالي الفواتير</p><p className="text-2xl font-bold">{invoices.length}</p></DynamicCard.Content></DynamicCard>
        <DynamicCard><DynamicCard.Content className="py-3"><p className="text-xs text-slate-500">المنتجات</p><p className="text-2xl font-bold">{products.length}</p></DynamicCard.Content></DynamicCard>
        <DynamicCard><DynamicCard.Content className="py-3"><p className="text-xs text-slate-500">المهام</p><p className="text-2xl font-bold">{tasks.length}</p></DynamicCard.Content></DynamicCard>
        <DynamicCard><DynamicCard.Content className="py-3"><p className="text-xs text-slate-500">المصاريف</p><p className="text-2xl font-bold">{expenses.length}</p></DynamicCard.Content></DynamicCard>
        <DynamicCard><DynamicCard.Content className="py-3"><p className="text-xs text-slate-500">إجمالي السجلات</p><p className="text-2xl font-bold">{totalOverviewCount}</p></DynamicCard.Content></DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="المبيعات والمنتجات الأكثر مبيعًا" description="يتضمن الموظفين الأعلى مبيعًا والمنتجات الأكثر بيعًا من بنود الفواتير." />
        <DynamicCard.Content className="space-y-4 pt-4">
          <DateRangeControl value={salesRange} onChange={setSalesRange} idPrefix="sales" />

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">عدد الطلبات</p><p className="text-xl font-bold">{salesAnalytics.ordersCount}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">قيمة الطلبات</p><p className="text-xl font-bold">{salesAnalytics.ordersValue.toLocaleString()}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">الفواتير المدفوعة</p><p className="text-xl font-bold">{salesAnalytics.paidInvoicesValue.toLocaleString()}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">بنود البيع</p><p className="text-xl font-bold">{salesAnalytics.totalInvoiceItemsCount}</p></div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">المنتجات الأكثر مبيعًا</p>
            <div className="space-y-2">
              {salesAnalytics.topProductsSold.length === 0 ? (
                <p className="text-xs text-slate-500">لا توجد بيانات كافية ضمن الفترة المحددة.</p>
              ) : (
                salesAnalytics.topProductsSold.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span>{item.name}</span>
                    <span className="font-bold text-blue-700">{item.value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </DynamicCard.Content>
      </DynamicCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <DynamicCard className="lg:col-span-2">
          <DynamicCard.Header title="تحليلات الطلبات" description="توزيع الطلبات حسب البلد والمدينة والحالة." />
          <DynamicCard.Content className="space-y-4 pt-4">
            <DateRangeControl value={ordersRange} onChange={setOrdersRange} idPrefix="orders" />
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-sm font-semibold">الطلبات حسب الحالة</p>
              <div className="space-y-2">
                {ordersAnalytics.byStatus.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span>{item.name}</span>
                    <span className="font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-sm font-semibold">توزيع الطلبات حسب البلد</p>
                <div className="space-y-2">
                  {ordersAnalytics.byCountry.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <span>{item.name}</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-sm font-semibold">عدد الطلبات في كل مدينة</p>
                <div className="space-y-2">
                  {ordersAnalytics.byCity.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <span>{item.name}</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard>
          <DynamicCard.Header title="ملخص الطلبات" description="إجمالي الطلبات في الفترة المحددة." />
          <DynamicCard.Content className="pt-4">
            <p className="text-xs text-slate-500">عدد الطلبات</p>
            <p className="text-4xl font-bold text-blue-700">{ordersAnalytics.totalOrders}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="تحليلات المنتجات والمخزون" description="المنتجات منخفضة المخزون ومتوسط الأسعار." />
        <DynamicCard.Content className="space-y-4 pt-4">
          <DateRangeControl value={productsRange} onChange={setProductsRange} idPrefix="products" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">إجمالي المنتجات</p><p className="text-xl font-bold">{productsAnalytics.totalProducts}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">متوسط السعر</p><p className="text-xl font-bold">{productsAnalytics.avgPrice.toLocaleString()}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">منتجات منخفضة المخزون</p><p className="text-xl font-bold text-red-600">{productsAnalytics.lowStock.length}</p></div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold">المنتجات منخفضة المخزون</p>
            <div className="space-y-2">
              {productsAnalytics.lowStock.length === 0 ? (
                <p className="text-xs text-slate-500">لا توجد منتجات منخفضة المخزون ضمن الفلتر المحدد.</p>
              ) : (
                productsAnalytics.lowStock.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span>{item.name}</span>
                    <span className="font-bold text-red-600">المخزون: {item.stock}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </DynamicCard.Content>
      </DynamicCard>

      <DynamicCard>
        <DynamicCard.Header title="تحليلات أداء الموظفين والفرق" description="الموظفون/الفرق الأكثر مبيعًا والأكثر إضافة للعملاء حسب إنجاز المهام." />
        <DynamicCard.Content className="space-y-4 pt-4">
          <DateRangeControl value={employeesRange} onChange={setEmployeesRange} idPrefix="employees" />
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">المهام</p><p className="text-xl font-bold">{employeesAnalytics.totalTasks}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">المطلوب</p><p className="text-xl font-bold">{employeesAnalytics.totalTarget}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">المنجز</p><p className="text-xl font-bold">{employeesAnalytics.totalCompleted}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">نسبة الإنجاز</p><p className="text-xl font-bold text-blue-700">{employeesAnalytics.progress}%</p></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-sm font-semibold">الموظفون/الفرق الأكثر مبيعًا</p>
              <div className="space-y-2">
                {employeesAnalytics.topSellers.length === 0 ? (
                  <p className="text-xs text-slate-500">لا توجد مهام مبيعات كافية.</p>
                ) : (
                  employeesAnalytics.topSellers.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <span>{item.name}</span>
                      <span className="font-bold text-emerald-700">{item.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-sm font-semibold">الأكثر إضافة للعملاء</p>
              <div className="space-y-2">
                {employeesAnalytics.topCustomerAdders.length === 0 ? (
                  <p className="text-xs text-slate-500">لا توجد مهام إضافة عملاء كافية.</p>
                ) : (
                  employeesAnalytics.topCustomerAdders.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <span>{item.name}</span>
                      <span className="font-bold text-blue-700">{item.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DynamicCard.Content>
      </DynamicCard>

      <DynamicCard>
        <DynamicCard.Header title="التحليلات المالية" description="المصاريف، التدفقات النقدية، التحصيل، وصافي الحركة المالية." />
        <DynamicCard.Content className="space-y-4 pt-4">
          <DateRangeControl value={financeRange} onChange={setFinanceRange} idPrefix="finance" />
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">المصاريف</p><p className="text-lg font-bold text-red-600">{financeAnalytics.totalExpenses.toLocaleString()}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">وارد</p><p className="text-lg font-bold text-emerald-700">{financeAnalytics.cashIn.toLocaleString()}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">صادر</p><p className="text-lg font-bold text-orange-700">{financeAnalytics.cashOut.toLocaleString()}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">المرتجعات</p><p className="text-lg font-bold text-red-700">{financeAnalytics.totalReturns.toLocaleString()}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">نسبة التحصيل</p><p className="text-lg font-bold text-blue-700">{financeAnalytics.collectionRate}%</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">صافي الحركة</p><p className="text-lg font-bold text-violet-700">{financeAnalytics.netFlow.toLocaleString()}</p></div>
          </div>
        </DynamicCard.Content>
      </DynamicCard>
    </section>
  );
}
