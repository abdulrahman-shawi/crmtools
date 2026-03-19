"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";

interface PosLineItem {
  id: string;
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

interface InvoiceDetailsPageProps {
  params: {
    invoiceId: string;
  };
}

/**
 * Shows full invoice details for selected POS invoice.
 */
export default function InvoiceDetailsPage({ params }: InvoiceDetailsPageProps) {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isReady, setIsReady] = useState(false);

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

  if (!isReady) {
    return (
      <section className="space-y-6" dir="rtl">
        <SectionHeader align="right" title="تفصيل الفاتورة" description="جاري تحميل بيانات الفاتورة..." />
      </section>
    );
  }

  if (!invoice) {
    return (
      <section className="space-y-6" dir="rtl">
        <SectionHeader align="right" title="تفصيل الفاتورة" description="لم يتم العثور على الفاتورة المطلوبة." />
        <Link href="/dashboard/crm-enterprise/customers" className="text-sm font-semibold text-blue-700 hover:underline">
          العودة إلى صفحة العملاء
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title={`تفصيل الفاتورة ${invoice.invoiceNo}`}
        description={`عميل: ${invoice.customerName} - التاريخ: ${invoice.date}`}
      >
        <Link href="/dashboard/crm-enterprise/customers" className="text-sm font-semibold text-blue-700 hover:underline">
          العودة إلى العملاء
        </Link>
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">الحالة</p>
            <p className="text-xl font-bold text-slate-900">{invoice.status === "issued" ? "مصدرة" : "مسودة"}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-indigo-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">طريقة الدفع</p>
            <p className="text-xl font-bold text-indigo-700">{paymentMethodLabel[invoice.paymentMethod]}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-orange-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">الضريبة</p>
            <p className="text-xl font-bold text-orange-700">{invoice.taxRate}%</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">الإجمالي</p>
            <p className="text-2xl font-bold text-emerald-700">{invoice.total.toLocaleString()} ر.س</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

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
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="p-3 text-slate-800">{item.name}</td>
                    <td className="p-3 text-slate-600">{item.sku}</td>
                    <td className="p-3 text-slate-600">{item.quantity}</td>
                    <td className="p-3 text-slate-600">{item.price.toLocaleString()} ر.س</td>
                    <td className="p-3 font-semibold text-slate-900">{(item.price * item.quantity).toLocaleString()} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 max-w-md space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span>المجموع الفرعي</span>
              <span>{invoice.subtotal.toLocaleString()} ر.س</span>
            </div>
            <div className="flex items-center justify-between">
              <span>الخصم</span>
              <span>- {invoice.discountAmount.toLocaleString()} ر.س</span>
            </div>
            <div className="flex items-center justify-between">
              <span>الضريبة ({invoice.taxRate}%)</span>
              <span>+ {invoice.taxAmount.toLocaleString()} ر.س</span>
            </div>
            <div className="border-t border-slate-200 pt-2 text-base font-bold">
              <div className="flex items-center justify-between">
                <span>الإجمالي النهائي</span>
                <span>{invoice.total.toLocaleString()} ر.س</span>
              </div>
            </div>
          </div>
        </DynamicCard.Content>
      </DynamicCard>
    </section>
  );
}
