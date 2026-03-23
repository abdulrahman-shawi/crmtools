"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";

interface PosLineItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface SalesInvoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  date: string;
  paymentMethod: "bank_transfer" | "cod" | "other";
  paymentStatus: "unpaid" | "partial" | "paid";
  receiverName: string;
  receiverPhone: string;
  receiverCity: string;
  receivedAmount: number;
  remainingAmount: number;
  deliveryNotes: string;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: "draft" | "issued";
  items: PosLineItem[];
}

interface SalesOrder {
  id: string;
  orderNo: string;
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  date: string;
  receiverName: string;
  receiverPhone: string;
  receiverCity: string;
  paymentMethod: SalesInvoice["paymentMethod"];
  receivedAmount: number;
  remainingAmount: number;
  deliveryNotes: string;
  shippingCompanyId: string | null;
  shippingCompanyName: string;
  shippingCost: number;
  total: number;
  itemCount: number;
  status: "new" | "processing" | "completed";
}

interface ShippingCompany {
  id: string;
  company: string;
  avgCost: number;
}

const SALES_INVOICES_STORAGE_KEY = "crm-enterprise-sales-invoices";
const SALES_ORDERS_STORAGE_KEY = "crm-enterprise-sales-orders";
const SHIPPING_COMPANIES_STORAGE_KEY = "crm-enterprise-shipping-companies";

const paymentMethodLabel: Record<SalesInvoice["paymentMethod"], string> = {
  bank_transfer: "دفع بنكي",
  cod: "عند الاستلام",
  other: "طرق أخرى",
};

const orderStatusLabel: Record<SalesOrder["status"], string> = {
  new: "جديد",
  processing: "قيد التنفيذ",
  completed: "مكتمل",
};

const defaultShippingCompanies: ShippingCompany[] = [
  { id: "sh_1", company: "FastShip", avgCost: 22 },
  { id: "sh_2", company: "CargoLink", avgCost: 12 },
  { id: "sh_3", company: "BlueLogix", avgCost: 9 },
];

/**
 * Reads and parses localStorage array payload safely.
 */
function readStorageArray<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Manages enterprise orders with invoice details and shipping assignment.
 */
export function EnterpriseOrdersManager() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [shippingCompanies, setShippingCompanies] = useState<ShippingCompany[]>(defaultShippingCompanies);
  const [page, setPage] = useState(1);
  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [selectedShippingCompanyId, setSelectedShippingCompanyId] = useState("");
  const [shippingAmountInput, setShippingAmountInput] = useState("");

  useEffect(() => {
    setOrders(readStorageArray<SalesOrder>(SALES_ORDERS_STORAGE_KEY));
    setInvoices(readStorageArray<SalesInvoice>(SALES_INVOICES_STORAGE_KEY));

    const storedShipping = readStorageArray<ShippingCompany>(SHIPPING_COMPANIES_STORAGE_KEY);
    if (storedShipping.length > 0) {
      setShippingCompanies(storedShipping);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SALES_ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const detailsOrder = useMemo(
    () => orders.find((order) => order.id === detailsOrderId) ?? null,
    [orders, detailsOrderId]
  );

  const detailsInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === detailsOrder?.invoiceId) ?? null,
    [invoices, detailsOrder?.invoiceId]
  );

  const shippingOrder = useMemo(
    () => orders.find((order) => order.id === shippingOrderId) ?? null,
    [orders, shippingOrderId]
  );

  const totals = useMemo(() => {
    const totalOrders = orders.length;
    const openOrders = orders.filter((order) => order.status !== "completed").length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total + order.shippingCost, 0);

    return {
      totalOrders,
      openOrders,
      totalRevenue,
    };
  }, [orders]);

  const columns = useMemo<Column<SalesOrder>[]>(
    () => [
      { header: "رقم الطلب", accessor: "orderNo" },
      { header: "رقم الفاتورة", accessor: "invoiceNo" },
      { header: "العميل", accessor: "customerName" },
      { header: "التاريخ", accessor: "date" },
      { header: "المجموع", accessor: (row) => row.total.toLocaleString() },
      { header: "الشحن", accessor: (row) => row.shippingCost.toLocaleString() },
      {
        header: "الحالة",
        accessor: (row) => (
          <select
            className="h-8 rounded-md border border-slate-200 px-2 text-xs"
            value={row.status}
            onChange={(event) => updateOrderStatus(row.id, event.target.value as SalesOrder["status"])}
          >
            <option value="new">جديد</option>
            <option value="processing">قيد التنفيذ</option>
            <option value="completed">مكتمل</option>
          </select>
        ),
      },
      {
        header: "إجراءات",
        accessor: (row) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDetailsOrderId(row.id)}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
            >
              <Eye className="h-3.5 w-3.5" /> رؤية تفاصيل الفاتورة
            </button>
            <button
              type="button"
              onClick={() => openShippingModal(row)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
            >
              <Truck className="h-3.5 w-3.5" /> تعيين شركة الشحن
            </button>
          </div>
        ),
      },
    ],
    [orders]
  );

  /**
   * Updates order status from table select.
   */
  function updateOrderStatus(orderId: string, status: SalesOrder["status"]) {
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
    toast.success("تم تحديث حالة الطلب");
  }

  /**
   * Opens shipping assignment modal for selected order.
   */
  function openShippingModal(order: SalesOrder) {
    setShippingOrderId(order.id);
    setSelectedShippingCompanyId(order.shippingCompanyId ?? "");
    setShippingAmountInput(order.shippingCost > 0 ? String(order.shippingCost) : "");
  }

  /**
   * Saves shipping company and amount for order.
   */
  function saveShippingAssignment() {
    if (!shippingOrder) {
      return;
    }

    if (!selectedShippingCompanyId) {
      toast.error("يرجى اختيار شركة الشحن");
      return;
    }

    const company = shippingCompanies.find((item) => item.id === selectedShippingCompanyId);
    if (!company) {
      toast.error("شركة الشحن المحددة غير موجودة");
      return;
    }

    const parsedInput = Number(shippingAmountInput || 0);
    const shippingCost = shippingAmountInput.trim() === ""
      ? company.avgCost
      : Number.isNaN(parsedInput) || parsedInput < 0
        ? company.avgCost
        : parsedInput;

    setOrders((prev) =>
      prev.map((order) =>
        order.id === shippingOrder.id
          ? {
              ...order,
              shippingCompanyId: company.id,
              shippingCompanyName: company.company,
              shippingCost,
            }
          : order
      )
    );

    setShippingOrderId(null);
    setSelectedShippingCompanyId("");
    setShippingAmountInput("");
    toast.success("تم تعيين شركة الشحن وتحديث قيمة الشحنة");
  }

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="إدارة الطلبات"
        description="متابعة الطلبات، تفاصيل الفاتورة، الشحن، وتحديث الحالة من الجدول."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">عدد الطلبات</p>
            <p className="text-3xl font-bold text-slate-900">{totals.totalOrders}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-yellow-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">طلبات مفتوحة</p>
            <p className="text-3xl font-bold text-yellow-600">{totals.openOrders}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي القيمة مع الشحن</p>
            <p className="text-3xl font-bold text-emerald-700">{totals.totalRevenue.toLocaleString()}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="قائمة الطلبات" description="بدون زر إضافة، مع إجراءات التفاصيل والشحن." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={columns}
            data={orders}
            dir="rtl"
            pageSize={8}
            totalCount={orders.length}
            currentPage={page}
            onPageChange={setPage}
            title="الطلبات"
            getRowSearchText={(row) => `${row.orderNo} ${row.invoiceNo} ${row.customerName} ${row.date} ${row.shippingCompanyName} ${orderStatusLabel[row.status]}`}
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={detailsOrder !== null}
        onClose={() => setDetailsOrderId(null)}
        title={detailsOrder ? `تفاصيل الطلب ${detailsOrder.orderNo}` : "تفاصيل الطلب"}
        size="xl"
        footer={<Button variant="outline" onClick={() => setDetailsOrderId(null)}>إغلاق</Button>}
      >
        {detailsOrder ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
              <p>رقم الطلب: <span className="font-semibold">{detailsOrder.orderNo}</span></p>
              <p>رقم الفاتورة: <span className="font-semibold">{detailsOrder.invoiceNo}</span></p>
              <p>العميل: <span className="font-semibold">{detailsOrder.customerName}</span></p>
              <p>طريقة الدفع: <span className="font-semibold">{paymentMethodLabel[detailsOrder.paymentMethod]}</span></p>
              <p>اسم المستلم: <span className="font-semibold">{detailsOrder.receiverName || "-"}</span></p>
              <p>رقم المستلم: <span className="font-semibold">{detailsOrder.receiverPhone || "-"}</span></p>
              <p>مدينة الاستلام: <span className="font-semibold">{detailsOrder.receiverCity || "-"}</span></p>
              <p>المبلغ المستلم: <span className="font-semibold">{detailsOrder.receivedAmount.toLocaleString()}</span></p>
              <p>المبلغ المتبقي: <span className="font-semibold">{detailsOrder.remainingAmount.toLocaleString()}</span></p>
              <p>شركة الشحن: <span className="font-semibold">{detailsOrder.shippingCompanyName || "غير محددة"}</span></p>
              <p>قيمة الشحن: <span className="font-semibold">{detailsOrder.shippingCost.toLocaleString()}</span></p>
              <p>الإجمالي: <span className="font-semibold">{detailsOrder.total.toLocaleString()}</span></p>
              <p>الإجمالي مع الشحن: <span className="font-semibold text-emerald-700">{(detailsOrder.total + detailsOrder.shippingCost).toLocaleString()}</span></p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">ملاحظات التسليم</p>
              <p className="text-sm text-slate-600">{detailsOrder.deliveryNotes || "لا توجد ملاحظات"}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">بنود الفاتورة</p>
              {detailsInvoice && detailsInvoice.items.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3 text-right font-semibold text-slate-700">المنتج</th>
                        <th className="p-3 text-right font-semibold text-slate-700">SKU</th>
                        <th className="p-3 text-right font-semibold text-slate-700">الكمية</th>
                        <th className="p-3 text-right font-semibold text-slate-700">السعر</th>
                        <th className="p-3 text-right font-semibold text-slate-700">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsInvoice.items.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3">{item.sku}</td>
                          <td className="p-3">{item.quantity}</td>
                          <td className="p-3">{item.price.toLocaleString()}</td>
                          <td className="p-3 font-semibold">{(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">لا توجد بنود فاتورة مرتبطة.</p>
              )}
            </div>
          </div>
        ) : null}
      </AppModal>

      <AppModal
        isOpen={shippingOrder !== null}
        onClose={() => setShippingOrderId(null)}
        title={shippingOrder ? `تعيين الشحن للطلب ${shippingOrder.orderNo}` : "تعيين الشحن"}
        size="md"
        footer={
          <>
            <Button onClick={saveShippingAssignment}>حفظ</Button>
            <Button variant="outline" onClick={() => setShippingOrderId(null)}>إلغاء</Button>
          </>
        }
      >
        <div className="space-y-3">
          <select
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            value={selectedShippingCompanyId}
            onChange={(event) => setSelectedShippingCompanyId(event.target.value)}
          >
            <option value="">اختر شركة الشحن</option>
            {shippingCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.company}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={0}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="قيمة الشحن (اتركه فارغاً لاستخدام القيمة الافتراضية)"
            value={shippingAmountInput}
            onChange={(event) => setShippingAmountInput(event.target.value)}
          />

          {selectedShippingCompanyId ? (
            <p className="text-xs text-slate-600">
              القيمة الافتراضية من شركة الشحن: {shippingCompanies.find((item) => item.id === selectedShippingCompanyId)?.avgCost ?? 0}
            </p>
          ) : null}
        </div>
      </AppModal>
    </section>
  );
}
