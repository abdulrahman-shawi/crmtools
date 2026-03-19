"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Printer, Save, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";

interface PosProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
}

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
  paymentMethod: "cash" | "card" | "transfer";
  paymentStatus: "unpaid" | "partial" | "paid";
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: "draft" | "issued";
  items: PosLineItem[];
}

const SALES_INVOICES_STORAGE_KEY = "crm-enterprise-sales-invoices";

const paymentMethodLabel: Record<SalesInvoice["paymentMethod"], string> = {
  cash: "نقد",
  card: "شبكة",
  transfer: "تحويل",
};

const paymentStatusLabel: Record<SalesInvoice["paymentStatus"], { label: string; color: string }> = {
  unpaid: { label: "غير مدفوعة", color: "bg-red-50 text-red-700" },
  partial: { label: "مدفوعة جزئياً", color: "bg-yellow-50 text-yellow-700" },
  paid: { label: "مدفوعة", color: "bg-emerald-50 text-emerald-700" },
};

const posProducts: PosProduct[] = [
  { id: "pos_pr_1", name: "CRM Pro License", sku: "CRM-PRO", price: 1999 },
  { id: "pos_pr_2", name: "Analytics Plus", sku: "ANL-PLUS", price: 799 },
  { id: "pos_pr_3", name: "Priority Support", sku: "SUP-PRIO", price: 1200 },
  { id: "pos_pr_4", name: "Onboarding Pack", sku: "ONB-PACK", price: 650 },
  { id: "pos_pr_5", name: "WhatsApp Integration", sku: "WA-INT", price: 420 },
];

interface InvoiceDetailsPageProps {
  params: {
    invoiceId: string;
  };
}

/**
 * Shows and edits POS invoice details for the selected invoice.
 */
export default function InvoiceDetailsPage({ params }: InvoiceDetailsPageProps) {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [draftInvoice, setDraftInvoice] = useState<SalesInvoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(SALES_INVOICES_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as SalesInvoice[]) : [];
      setInvoices(Array.isArray(parsed) ? parsed : []);
    } catch {
      setInvoices([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  const invoice = useMemo(
    () => invoices.find((item) => item.id === params.invoiceId) ?? null,
    [invoices, params.invoiceId]
  );

  useEffect(() => {
    setDraftInvoice(invoice ? JSON.parse(JSON.stringify(invoice)) as SalesInvoice : null);
  }, [invoice]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) {
      return posProducts;
    }

    return posProducts.filter((product) => product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query));
  }, [productSearch]);

  const computedDraft = useMemo(() => {
    if (!draftInvoice) {
      return null;
    }

    const subtotal = draftInvoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = Math.max(0, Math.min(draftInvoice.discountAmount, subtotal));
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = (taxableAmount * draftInvoice.taxRate) / 100;
    const total = taxableAmount + taxAmount;

    return {
      ...draftInvoice,
      subtotal,
      discountAmount,
      taxAmount,
      total,
    };
  }, [draftInvoice]);

  function persistInvoices(nextInvoices: SalesInvoice[]) {
    setInvoices(nextInvoices);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SALES_INVOICES_STORAGE_KEY, JSON.stringify(nextInvoices));
    }
  }

  function startEditing() {
    if (!invoice) {
      return;
    }

    setDraftInvoice(JSON.parse(JSON.stringify(invoice)) as SalesInvoice);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftInvoice(invoice ? (JSON.parse(JSON.stringify(invoice)) as SalesInvoice) : null);
    setProductSearch("");
    setIsEditing(false);
  }

  function saveInvoiceChanges() {
    if (!computedDraft) {
      return;
    }

    if (computedDraft.items.length === 0) {
      toast.error("يجب أن تحتوي الفاتورة على منتج واحد على الأقل");
      return;
    }

    const nextInvoices = invoices.map((item) => (item.id === computedDraft.id ? computedDraft : item));
    persistInvoices(nextInvoices);
    setIsEditing(false);
    toast.success("تم حفظ تعديلات الفاتورة");
  }

  function updateDraftField<Key extends keyof SalesInvoice>(key: Key, value: SalesInvoice[Key]) {
    setDraftInvoice((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateDraftItemQuantity(itemId: string, quantity: number) {
    const normalizedQuantity = Number.isNaN(quantity) ? 1 : Math.max(1, quantity);
    setDraftInvoice((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) => (item.id === itemId ? { ...item, quantity: normalizedQuantity } : item)),
          }
        : prev
    );
  }

  function removeDraftItem(itemId: string) {
    setDraftInvoice((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.filter((item) => item.id !== itemId),
          }
        : prev
    );
  }

  function addProductToDraft(product: PosProduct) {
    setDraftInvoice((prev) => {
      if (!prev) {
        return prev;
      }

      const existing = prev.items.find((item) => item.productId === product.id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            id: `line_${Date.now()}_${product.id}`,
            productId: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            quantity: 1,
          },
        ],
      };
    });
  }

  function printInvoice() {
    window.print();
  }

  if (!isReady) {
    return (
      <section className="space-y-6" dir="rtl">
        <SectionHeader align="right" title="تفصيل الفاتورة" description="جاري تحميل بيانات الفاتورة..." />
      </section>
    );
  }

  if (!invoice || !computedDraft) {
    return (
      <section className="space-y-6" dir="rtl">
        <SectionHeader align="right" title="تفصيل الفاتورة" description="لم يتم العثور على الفاتورة المطلوبة." />
        <Link href="/dashboard/crm-enterprise/customers" className="text-sm font-semibold text-blue-700 hover:underline">
          العودة إلى صفحة العملاء
        </Link>
      </section>
    );
  }

  const currentInvoice = isEditing ? computedDraft : invoice;

  return (
    <section className="space-y-6 print:space-y-4" dir="rtl">
      <SectionHeader
        align="right"
        title={`تفصيل الفاتورة ${currentInvoice.invoiceNo}`}
        description={`عميل: ${currentInvoice.customerName} - التاريخ: ${currentInvoice.date}`}
      >
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={printInvoice}>
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              <Button onClick={startEditing}>
                <Pencil className="h-4 w-4" />
                تعديل الفاتورة
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="h-4 w-4" />
                إلغاء
              </Button>
              <Button onClick={saveInvoiceChanges}>
                <Save className="h-4 w-4" />
                حفظ التعديلات
              </Button>
            </>
          )}
          <Link href="/dashboard/crm-enterprise/customers" className="text-sm font-semibold text-blue-700 hover:underline">
            العودة إلى العملاء
          </Link>
        </div>
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-5 print:grid-cols-5">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">الحالة</p>
            <p className="text-xl font-bold text-slate-900">{currentInvoice.status === "issued" ? "مصدرة" : "مسودة"}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-indigo-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">طريقة الدفع</p>
            {isEditing ? (
              <select
                className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                value={currentInvoice.paymentMethod}
                onChange={(event) => updateDraftField("paymentMethod", event.target.value as SalesInvoice["paymentMethod"])}
              >
                <option value="cash">نقد</option>
                <option value="card">شبكة</option>
                <option value="transfer">تحويل</option>
              </select>
            ) : (
              <p className="text-xl font-bold text-indigo-700">{paymentMethodLabel[currentInvoice.paymentMethod]}</p>
            )}
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-yellow-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">حالة الدفع</p>
            {isEditing ? (
              <select
                className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                value={currentInvoice.paymentStatus}
                onChange={(event) => updateDraftField("paymentStatus", event.target.value as SalesInvoice["paymentStatus"])}
              >
                <option value="unpaid">غير مدفوعة</option>
                <option value="partial">مدفوعة جزئياً</option>
                <option value="paid">مدفوعة</option>
              </select>
            ) : (
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${paymentStatusLabel[currentInvoice.paymentStatus].color}`}>
                {paymentStatusLabel[currentInvoice.paymentStatus].label}
              </span>
            )}
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-orange-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">الضريبة</p>
            {isEditing ? (
              <input
                type="number"
                min={0}
                className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                value={currentInvoice.taxRate}
                onChange={(event) => updateDraftField("taxRate", Number(event.target.value || 0))}
              />
            ) : (
              <p className="text-xl font-bold text-orange-700">{currentInvoice.taxRate}%</p>
            )}
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">الإجمالي</p>
            <p className="text-2xl font-bold text-emerald-700">{currentInvoice.total.toLocaleString()} ر.س</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <DynamicCard>
          <DynamicCard.Header title="بنود الفاتورة" description="تفاصيل المنتجات والكميات والأسعار." />
          <DynamicCard.Content className="pt-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-right font-semibold text-slate-700">المنتج</th>
                    <th className="p-3 text-right font-semibold text-slate-700">SKU</th>
                    <th className="p-3 text-right font-semibold text-slate-700">الكمية</th>
                    <th className="p-3 text-right font-semibold text-slate-700">السعر</th>
                    <th className="p-3 text-right font-semibold text-slate-700">الإجمالي</th>
                    {isEditing && <th className="p-3 text-right font-semibold text-slate-700 print:hidden">إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentInvoice.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="p-3 text-slate-800">{item.name}</td>
                      <td className="p-3 text-slate-600">{item.sku}</td>
                      <td className="p-3 text-slate-600">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-sm"
                            value={item.quantity}
                            onChange={(event) => updateDraftItemQuantity(item.id, Number(event.target.value))}
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{item.price.toLocaleString()} ر.س</td>
                      <td className="p-3 font-semibold text-slate-900">{(item.price * item.quantity).toLocaleString()} ر.س</td>
                      {isEditing && (
                        <td className="p-3 print:hidden">
                          <button
                            type="button"
                            onClick={() => removeDraftItem(item.id)}
                            className="rounded-md border border-red-200 p-2 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard>
          <DynamicCard.Header title="الملخص المالي" description="خصم، ضريبة، وطريقة السداد." />
          <DynamicCard.Content className="space-y-4 pt-4">
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span>المجموع الفرعي</span>
                <span>{currentInvoice.subtotal.toLocaleString()} ر.س</span>
              </div>
              <div className="flex items-center justify-between">
                <span>الخصم</span>
                {isEditing ? (
                  <input
                    type="number"
                    min={0}
                    className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm"
                    value={currentInvoice.discountAmount}
                    onChange={(event) => updateDraftField("discountAmount", Number(event.target.value || 0))}
                  />
                ) : (
                  <span>- {currentInvoice.discountAmount.toLocaleString()} ر.س</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>الضريبة ({currentInvoice.taxRate}%)</span>
                <span>+ {currentInvoice.taxAmount.toLocaleString()} ر.س</span>
              </div>
              <div className="border-t border-slate-200 pt-2 text-base font-bold">
                <div className="flex items-center justify-between">
                  <span>الإجمالي النهائي</span>
                  <span>{currentInvoice.total.toLocaleString()} ر.س</span>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-3 print:hidden">
                <p className="text-sm font-semibold text-slate-800">إضافة منتج إلى الفاتورة</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 pr-9 pl-3 text-sm"
                    placeholder="ابحث باسم المنتج أو SKU"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                  />
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.sku}</p>
                        <p className="text-xs text-emerald-700">{product.price.toLocaleString()} ر.س</p>
                      </div>
                      <Button size="sm" onClick={() => addProductToDraft(product)}>
                        إضافة
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DynamicCard.Content>
        </DynamicCard>
      </div>
    </section>
  );
}
