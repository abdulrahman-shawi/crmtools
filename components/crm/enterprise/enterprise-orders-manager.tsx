"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, MessageCircle, Pencil, Share2, Trash2, Truck } from "lucide-react";
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

interface EditOrderFormState {
  receiverName: string;
  receiverPhone: string;
  receiverCity: string;
  deliveryNotes: string;
  status: SalesOrder["status"];
  receivedAmount: string;
  shippingCompanyId: string;
  shippingCost: string;
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
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedShippingCompanyId, setSelectedShippingCompanyId] = useState("");
  const [shippingAmountInput, setShippingAmountInput] = useState("");
  const [editForm, setEditForm] = useState<EditOrderFormState>({
    receiverName: "",
    receiverPhone: "",
    receiverCity: "",
    deliveryNotes: "",
    status: "new",
    receivedAmount: "0",
    shippingCompanyId: "",
    shippingCost: "",
  });

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

  const editingOrder = useMemo(
    () => orders.find((order) => order.id === editingOrderId) ?? null,
    [orders, editingOrderId]
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDetailsOrderId(row.id)}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
            >
              <Eye className="h-3.5 w-3.5" /> رؤية تفاصيل الفاتورة
            </button>
            <button
              type="button"
              onClick={() => shareInvoiceOnWhatsApp(row)}
              className="inline-flex items-center gap-1 rounded-md border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
            >
              <MessageCircle className="h-3.5 w-3.5" /> واتساب
            </button>
            <button
              type="button"
              onClick={() => shareInvoiceGeneric(row)}
              className="inline-flex items-center gap-1 rounded-md border border-violet-200 px-2 py-1 text-xs text-violet-700 hover:bg-violet-50"
            >
              <Share2 className="h-3.5 w-3.5" /> مشاركة
            </button>
            <button
              type="button"
              onClick={() => openShippingModal(row)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
            >
              <Truck className="h-3.5 w-3.5" /> تعيين شركة الشحن
            </button>
            <button
              type="button"
              onClick={() => openEditOrderModal(row)}
              className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
            >
              <Pencil className="h-3.5 w-3.5" /> تعديل
            </button>
            <button
              type="button"
              onClick={() => deleteOrder(row)}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> حذف
            </button>
          </div>
        ),
      },
    ],
    [orders]
  );

  /**
   * Builds details page URL for the invoice.
   */
  function getInvoiceUrl(invoiceId: string): string {
    if (typeof window === "undefined") {
      return `/dashboard/crm-enterprise/invoices/${invoiceId}`;
    }

    return `${window.location.origin}/dashboard/crm-enterprise/invoices/${invoiceId}`;
  }

  /**
   * Produces a sales invoice text in a common printable/shareable format.
   */
  function buildSalesInvoiceText(order: SalesOrder): string {
    const invoice = invoices.find((item) => item.id === order.invoiceId);
    const lines = invoice?.items ?? [];
    const subtotal = invoice?.subtotal ?? order.total;
    const discountAmount = invoice?.discountAmount ?? 0;
    const taxAmount = invoice?.taxAmount ?? 0;
    const totalBeforeShipping = invoice?.total ?? order.total;
    const grandTotal = totalBeforeShipping + order.shippingCost;
    const invoiceUrl = getInvoiceUrl(order.invoiceId);

    const itemsText =
      lines.length > 0
        ? lines
            .map((line, index) => {
              const lineTotal = line.price * line.quantity;
              return `${index + 1}) ${line.name} | ${line.sku} | ${line.quantity} x ${line.price.toLocaleString()} = ${lineTotal.toLocaleString()}`;
            })
            .join("\n")
        : "لا توجد بنود مفصلة";

    return [
      "فاتورة مبيعات",
      `رقم الفاتورة: ${order.invoiceNo}`,
      `رقم الطلب: ${order.orderNo}`,
      `التاريخ: ${order.date}`,
      `العميل: ${order.customerName}`,
      `المستلم: ${order.receiverName || "-"}`,
      `الجوال: ${order.receiverPhone || "-"}`,
      `المدينة: ${order.receiverCity || "-"}`,
      `طريقة الدفع: ${paymentMethodLabel[order.paymentMethod]}`,
      "",
      "بنود الفاتورة:",
      itemsText,
      "",
      `المجموع الفرعي: ${subtotal.toLocaleString()}`,
      `الخصم: ${discountAmount.toLocaleString()}`,
      `الضريبة: ${taxAmount.toLocaleString()}`,
      `الشحن: ${order.shippingCost.toLocaleString()}`,
      `الإجمالي النهائي: ${grandTotal.toLocaleString()}`,
      `المستلم: ${order.receivedAmount.toLocaleString()}`,
      `المتبقي: ${order.remainingAmount.toLocaleString()}`,
      "",
      `رابط الفاتورة: ${invoiceUrl}`,
    ].join("\n");
  }

  /**
   * Shares invoice via WhatsApp with prefilled standard sales invoice text.
   */
  function shareInvoiceOnWhatsApp(order: SalesOrder) {
    const shareText = buildSalesInvoiceText(order);
    const cleanedPhone = (order.receiverPhone || "").replace(/[^\d]/g, "");
    const encoded = encodeURIComponent(shareText);
    const whatsappUrl = cleanedPhone
      ? `https://wa.me/${cleanedPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    toast.success("تم تجهيز مشاركة الفاتورة عبر واتساب");
  }

  /**
   * Shares invoice using Web Share API or clipboard fallback.
   */
  async function shareInvoiceGeneric(order: SalesOrder) {
    const text = buildSalesInvoiceText(order);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `فاتورة ${order.invoiceNo}`,
          text,
          url: getInvoiceUrl(order.invoiceId),
        });
        return;
      }

      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ نص الفاتورة للمشاركة");
    } catch {
      toast.error("تعذر مشاركة الفاتورة");
    }
  }

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

  /**
   * Opens order edit modal and seeds form state.
   */
  function openEditOrderModal(order: SalesOrder) {
    setEditingOrderId(order.id);
    setEditForm({
      receiverName: order.receiverName ?? "",
      receiverPhone: order.receiverPhone ?? "",
      receiverCity: order.receiverCity ?? "",
      deliveryNotes: order.deliveryNotes ?? "",
      status: order.status,
      receivedAmount: String(order.receivedAmount ?? 0),
      shippingCompanyId: order.shippingCompanyId ?? "",
      shippingCost: order.shippingCost > 0 ? String(order.shippingCost) : "",
    });
  }

  /**
   * Saves edited order fields from modal.
   */
  function saveOrderEdits() {
    if (!editingOrder) {
      return;
    }

    const receivedAmountParsed = Number(editForm.receivedAmount || 0);
    const receivedAmount = Number.isNaN(receivedAmountParsed) || receivedAmountParsed < 0 ? 0 : receivedAmountParsed;

    const selectedShipping = shippingCompanies.find((company) => company.id === editForm.shippingCompanyId) ?? null;
    const shippingParsed = Number(editForm.shippingCost || 0);
    const shippingCost =
      editForm.shippingCost.trim() === ""
        ? selectedShipping?.avgCost ?? 0
        : Number.isNaN(shippingParsed) || shippingParsed < 0
          ? selectedShipping?.avgCost ?? 0
          : shippingParsed;

    const totalWithShipping = editingOrder.total + shippingCost;
    const remainingAmount = Math.max(0, totalWithShipping - receivedAmount);

    setOrders((prev) =>
      prev.map((order) =>
        order.id === editingOrder.id
          ? {
              ...order,
              receiverName: editForm.receiverName.trim(),
              receiverPhone: editForm.receiverPhone.trim(),
              receiverCity: editForm.receiverCity.trim(),
              deliveryNotes: editForm.deliveryNotes.trim(),
              status: editForm.status,
              receivedAmount,
              remainingAmount,
              shippingCompanyId: selectedShipping?.id ?? null,
              shippingCompanyName: selectedShipping?.company ?? "",
              shippingCost,
            }
          : order
      )
    );

    setEditingOrderId(null);
    toast.success("تم تعديل الطلب");
  }

  /**
   * Deletes one order row from table and storage.
   */
  function deleteOrder(order: SalesOrder) {
    const confirmed = window.confirm(`هل تريد حذف الطلب ${order.orderNo}؟`);
    if (!confirmed) {
      return;
    }

    setOrders((prev) => prev.filter((item) => item.id !== order.id));

    if (detailsOrderId === order.id) {
      setDetailsOrderId(null);
    }

    toast.success("تم حذف الطلب");
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

            <div className="rounded-lg border-2 border-slate-300 bg-white p-4">
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <p className="text-base font-bold text-slate-900">فاتورة مبيعات</p>
                  <p className="text-xs text-slate-500">Sales Invoice</p>
                </div>
                <div className="text-left text-xs text-slate-600">
                  <p>Invoice No: {detailsOrder.invoiceNo}</p>
                  <p>Order No: {detailsOrder.orderNo}</p>
                  <p>Date: {detailsOrder.date}</p>
                </div>
              </div>

              <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 p-3 text-sm md:grid-cols-2">
                <p>Customer: <span className="font-semibold">{detailsOrder.customerName}</span></p>
                <p>Receiver: <span className="font-semibold">{detailsOrder.receiverName || "-"}</span></p>
                <p>Phone: <span className="font-semibold">{detailsOrder.receiverPhone || "-"}</span></p>
                <p>City: <span className="font-semibold">{detailsOrder.receiverCity || "-"}</span></p>
                <p>Payment: <span className="font-semibold">{paymentMethodLabel[detailsOrder.paymentMethod]}</span></p>
                <p>Shipping: <span className="font-semibold">{detailsOrder.shippingCompanyName || "غير محددة"}</span></p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2 text-right font-semibold text-slate-700">الوصف</th>
                      <th className="p-2 text-right font-semibold text-slate-700">الكمية</th>
                      <th className="p-2 text-right font-semibold text-slate-700">السعر</th>
                      <th className="p-2 text-right font-semibold text-slate-700">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsInvoice?.items?.length ? (
                      detailsInvoice.items.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="p-2">{item.name}</td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2">{item.price.toLocaleString()}</td>
                          <td className="p-2 font-semibold">{(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-500">لا توجد بنود فاتورة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm md:grid-cols-2">
                <p>Subtotal: <span className="font-semibold">{(detailsInvoice?.subtotal ?? detailsOrder.total).toLocaleString()}</span></p>
                <p>Discount: <span className="font-semibold">{(detailsInvoice?.discountAmount ?? 0).toLocaleString()}</span></p>
                <p>Tax: <span className="font-semibold">{(detailsInvoice?.taxAmount ?? 0).toLocaleString()}</span></p>
                <p>Shipping: <span className="font-semibold">{detailsOrder.shippingCost.toLocaleString()}</span></p>
                <p className="md:col-span-2">Grand Total: <span className="font-bold text-emerald-700">{((detailsInvoice?.total ?? detailsOrder.total) + detailsOrder.shippingCost).toLocaleString()}</span></p>
              </div>
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

      <AppModal
        isOpen={editingOrder !== null}
        onClose={() => setEditingOrderId(null)}
        title={editingOrder ? `تعديل الطلب ${editingOrder.orderNo}` : "تعديل الطلب"}
        size="md"
        footer={
          <>
            <Button onClick={saveOrderEdits}>حفظ التعديل</Button>
            <Button variant="outline" onClick={() => setEditingOrderId(null)}>إلغاء</Button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="اسم المستلم"
            value={editForm.receiverName}
            onChange={(event) => setEditForm((prev) => ({ ...prev, receiverName: event.target.value }))}
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="رقم المستلم"
              value={editForm.receiverPhone}
              onChange={(event) => setEditForm((prev) => ({ ...prev, receiverPhone: event.target.value }))}
            />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="مدينة الاستلام"
              value={editForm.receiverCity}
              onChange={(event) => setEditForm((prev) => ({ ...prev, receiverCity: event.target.value }))}
            />
          </div>

          <select
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            value={editForm.status}
            onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value as SalesOrder["status"] }))}
          >
            <option value="new">جديد</option>
            <option value="processing">قيد التنفيذ</option>
            <option value="completed">مكتمل</option>
          </select>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="number"
              min={0}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="المبلغ المستلم"
              value={editForm.receivedAmount}
              onChange={(event) => setEditForm((prev) => ({ ...prev, receivedAmount: event.target.value }))}
            />
            <input
              type="number"
              min={0}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="قيمة الشحن"
              value={editForm.shippingCost}
              onChange={(event) => setEditForm((prev) => ({ ...prev, shippingCost: event.target.value }))}
            />
          </div>

          <select
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            value={editForm.shippingCompanyId}
            onChange={(event) => setEditForm((prev) => ({ ...prev, shippingCompanyId: event.target.value }))}
          >
            <option value="">بدون شركة شحن</option>
            {shippingCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.company}
              </option>
            ))}
          </select>

          <textarea
            className="min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="ملاحظات التسليم"
            value={editForm.deliveryNotes}
            onChange={(event) => setEditForm((prev) => ({ ...prev, deliveryNotes: event.target.value }))}
          />
        </div>
      </AppModal>
    </section>
  );
}
