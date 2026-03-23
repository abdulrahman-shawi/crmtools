"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, Pencil, Plus, ReceiptText, Search, Share2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";

interface EnterpriseCustomer {
  id: string;
  companyName: string;
  companySize: "medium" | "large";
  industry: string;
  contactPerson: string;
  phone: string;
  email: string;
  status: "lead" | "active" | "at-risk";
  tier: "gold" | "silver" | "bronze";
  annualValue: number;
  lastCommunication: string;
  nextFollowUp: string;
  notes: string;
}

interface CustomerCommunication {
  id: string;
  channel: "call" | "email" | "meeting" | "whatsapp";
  date: string;
  agent: string;
  message: string;
  lastContactSummary: string;
}

interface CustomerFormState {
  companyName: string;
  companySize: EnterpriseCustomer["companySize"];
  industry: string;
  contactPerson: string;
  phone: string;
  email: string;
  status: EnterpriseCustomer["status"];
  tier: EnterpriseCustomer["tier"];
  annualValue: string;
  lastCommunication: string;
  nextFollowUp: string;
  notes: string;
}

interface CommunicationFormState {
  channel: CustomerCommunication["channel"];
  date: string;
  agent: string;
  message: string;
  lastContactSummary: string;
}

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

interface SalesOrder {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  date: string;
  total: number;
  itemCount: number;
  status: "new" | "processing" | "completed";
}

const SALES_INVOICES_STORAGE_KEY = "crm-enterprise-sales-invoices";

const sizeLabel: Record<EnterpriseCustomer["companySize"], string> = {
  medium: "متوسطة",
  large: "كبيرة",
};

const statusLabel: Record<EnterpriseCustomer["status"], { label: string; color: string }> = {
  lead: { label: "عميل محتمل", color: "bg-yellow-50 text-yellow-700" },
  active: { label: "نشط", color: "bg-emerald-50 text-emerald-700" },
  "at-risk": { label: "معرّض للفقد", color: "bg-red-50 text-red-700" },
};

const tierLabel: Record<EnterpriseCustomer["tier"], { label: string; color: string }> = {
  gold: { label: "ذهبي", color: "bg-amber-50 text-amber-700" },
  silver: { label: "فضي", color: "bg-slate-100 text-slate-700" },
  bronze: { label: "برونزي", color: "bg-orange-50 text-orange-700" },
};

const channelLabel: Record<CustomerCommunication["channel"], string> = {
  call: "مكالمة",
  email: "بريد",
  meeting: "اجتماع",
  whatsapp: "واتساب",
};

const paymentMethodLabel: Record<"cash" | "card" | "transfer", string> = {
  cash: "نقد",
  card: "شبكة",
  transfer: "تحويل",
};

const paymentStatusLabel: Record<"unpaid" | "partial" | "paid", { label: string; color: string }> = {
  unpaid: { label: "غير مدفوعة", color: "bg-red-50 text-red-700" },
  partial: { label: "مدفوعة جزئياً", color: "bg-yellow-50 text-yellow-700" },
  paid: { label: "مدفوعة", color: "bg-emerald-50 text-emerald-700" },
};

const orderStatusLabel: Record<SalesOrder["status"], { label: string; color: string }> = {
  new: { label: "جديد", color: "bg-blue-50 text-blue-700" },
  processing: { label: "قيد التنفيذ", color: "bg-yellow-50 text-yellow-700" },
  completed: { label: "مكتمل", color: "bg-emerald-50 text-emerald-700" },
};

const initialFormState: CustomerFormState = {
  companyName: "",
  companySize: "medium",
  industry: "",
  contactPerson: "",
  phone: "",
  email: "",
  status: "lead",
  tier: "silver",
  annualValue: "",
  lastCommunication: "",
  nextFollowUp: "",
  notes: "",
};

const initialCommunicationFormState: CommunicationFormState = {
  channel: "call",
  date: new Date().toISOString().slice(0, 10),
  agent: "",
  message: "",
  lastContactSummary: "",
};

/**
 * Converts unknown numeric input to a safe number with fallback.
 */
function toSafeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Normalizes invoice line item payloads loaded from localStorage.
 */
function normalizeLineItem(raw: unknown): PosLineItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Partial<PosLineItem>;
  const id = typeof item.id === "string" ? item.id : `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const productId = typeof item.productId === "string" ? item.productId : "unknown_product";
  const name = typeof item.name === "string" ? item.name : "منتج";
  const sku = typeof item.sku === "string" ? item.sku : "N/A";
  const price = Math.max(0, toSafeNumber(item.price, 0));
  const quantity = Math.max(1, Math.trunc(toSafeNumber(item.quantity, 1)));

  return { id, productId, name, sku, price, quantity };
}

/**
 * Normalizes invoice payloads to support legacy data shape.
 */
function normalizeSalesInvoice(raw: unknown): SalesInvoice | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const invoice = raw as Partial<SalesInvoice>;
  if (typeof invoice.id !== "string" || typeof invoice.customerId !== "string") {
    return null;
  }

  const items = Array.isArray(invoice.items)
    ? invoice.items.map(normalizeLineItem).filter((item): item is PosLineItem => item !== null)
    : [];

  const subtotal = Math.max(0, toSafeNumber(invoice.subtotal, items.reduce((sum, item) => sum + item.price * item.quantity, 0)));
  const discountAmount = Math.max(0, Math.min(toSafeNumber(invoice.discountAmount, 0), subtotal));
  const taxRate = Math.max(0, toSafeNumber(invoice.taxRate, 0));
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.max(0, toSafeNumber(invoice.taxAmount, (taxableAmount * taxRate) / 100));
  const total = Math.max(0, toSafeNumber(invoice.total, taxableAmount + taxAmount));

  const paymentMethod: SalesInvoice["paymentMethod"] =
    invoice.paymentMethod === "cash" || invoice.paymentMethod === "card" || invoice.paymentMethod === "transfer"
      ? invoice.paymentMethod
      : "cash";

  const paymentStatus: SalesInvoice["paymentStatus"] =
    invoice.paymentStatus === "unpaid" || invoice.paymentStatus === "partial" || invoice.paymentStatus === "paid"
      ? invoice.paymentStatus
      : "unpaid";

  const status: SalesInvoice["status"] = invoice.status === "draft" || invoice.status === "issued" ? invoice.status : "issued";

  return {
    id: invoice.id,
    invoiceNo: typeof invoice.invoiceNo === "string" ? invoice.invoiceNo : `INV-${invoice.id.slice(-6)}`,
    customerId: invoice.customerId,
    customerName: typeof invoice.customerName === "string" ? invoice.customerName : "عميل",
    date: typeof invoice.date === "string" ? invoice.date : new Date().toISOString().slice(0, 10),
    paymentMethod,
    paymentStatus,
    subtotal,
    discountAmount,
    taxRate,
    taxAmount,
    total,
    status,
    items,
  };
}

const posProducts: PosProduct[] = [
  { id: "pos_pr_1", name: "CRM Pro License", sku: "CRM-PRO", price: 1999 },
  { id: "pos_pr_2", name: "Analytics Plus", sku: "ANL-PLUS", price: 799 },
  { id: "pos_pr_3", name: "Priority Support", sku: "SUP-PRIO", price: 1200 },
  { id: "pos_pr_4", name: "Onboarding Pack", sku: "ONB-PACK", price: 650 },
  { id: "pos_pr_5", name: "WhatsApp Integration", sku: "WA-INT", price: 420 },
];

const initialCustomers: EnterpriseCustomer[] = [
  {
    id: "ent_cus_1",
    companyName: "شركة النخبة للتقنية",
    companySize: "large",
    industry: "تقنية معلومات",
    contactPerson: "أحمد الزهراني",
    phone: "0501234567",
    email: "a.alzahrani@nukhba.sa",
    status: "active",
    tier: "gold",
    annualValue: 420000,
    lastCommunication: "اجتماع مراجعة التجديد وتم الاتفاق على خطة التوسع.",
    nextFollowUp: "2026-03-24",
    notes: "عميل استراتيجي وخطة توسع سنوية.",
  },
  {
    id: "ent_cus_2",
    companyName: "مؤسسة رواد الأعمال",
    companySize: "medium",
    industry: "خدمات أعمال",
    contactPerson: "ريم القحطاني",
    phone: "0559876543",
    email: "reem@rowad.sa",
    status: "lead",
    tier: "silver",
    annualValue: 90000,
    lastCommunication: "مكالمة تعريفية وتم إرسال عرض أولي.",
    nextFollowUp: "2026-03-22",
    notes: "تحتاج عرض باقة Pro مع تدريب أولي.",
  },
  {
    id: "ent_cus_3",
    companyName: "مجموعة المجد اللوجستية",
    companySize: "large",
    industry: "لوجستيات",
    contactPerson: "ليلى عمر",
    phone: "0532468101",
    email: "l.omar@majdlog.com",
    status: "at-risk",
    tier: "bronze",
    annualValue: 210000,
    lastCommunication: "بريد متابعة حول مشكلة في التقارير قيد المعالجة.",
    nextFollowUp: "2026-03-20",
    notes: "شكاوى مرتبطة بالتقارير وتحتاج متابعة دعم.",
  },
];

const initialCommunicationsByCustomer: Record<string, CustomerCommunication[]> = {
  ent_cus_1: [
    {
      id: "comm_1",
      channel: "meeting",
      date: "2026-03-17",
      agent: "أحمد الزهراني",
      message: "مراجعة بنود العقد السنوي ومناقشة زيادة عدد المستخدمين.",
      lastContactSummary: "تمت الموافقة على التجديد مع إضافة وحدات تحليل.",
    },
  ],
  ent_cus_2: [
    {
      id: "comm_2",
      channel: "call",
      date: "2026-03-14",
      agent: "ريم القحطاني",
      message: "مكالمة استيضاح عن خطة الأسعار لباقة Pro.",
      lastContactSummary: "بانتظار موافقة الإدارة على العرض.",
    },
  ],
  ent_cus_3: [
    {
      id: "comm_3",
      channel: "email",
      date: "2026-03-16",
      agent: "ليلى عمر",
      message: "إرسال تفاصيل المشاكل الفنية في التقارير الأسبوعية.",
      lastContactSummary: "تم تحويل الطلب لفريق الدعم الفني.",
    },
  ],
};

const initialSalesInvoices: SalesInvoice[] = [
  {
    id: "inv_1",
    invoiceNo: "INV-3001",
    customerId: "ent_cus_1",
    customerName: "شركة النخبة للتقنية",
    date: "2026-03-12",
    paymentMethod: "card",
    paymentStatus: "paid",
    subtotal: 4797,
    discountAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 4798,
    status: "issued",
    items: [
      { id: "inv_1_ln_1", productId: "pos_pr_1", name: "CRM Pro License", sku: "CRM-PRO", price: 1999, quantity: 2 },
      { id: "inv_1_ln_2", productId: "pos_pr_2", name: "Analytics Plus", sku: "ANL-PLUS", price: 799, quantity: 1 },
    ],
  },
  {
    id: "inv_2",
    invoiceNo: "INV-3002",
    customerId: "ent_cus_2",
    customerName: "مؤسسة رواد الأعمال",
    date: "2026-03-15",
    paymentMethod: "transfer",
    paymentStatus: "partial",
    subtotal: 1490,
    discountAmount: 50,
    taxRate: 24.16,
    taxAmount: 360,
    total: 1850,
    status: "issued",
    items: [
      { id: "inv_2_ln_1", productId: "pos_pr_4", name: "Onboarding Pack", sku: "ONB-PACK", price: 650, quantity: 1 },
      { id: "inv_2_ln_2", productId: "pos_pr_5", name: "WhatsApp Integration", sku: "WA-INT", price: 420, quantity: 2 },
    ],
  },
];

const initialSalesOrders: SalesOrder[] = [
  {
    id: "ord_1",
    orderNo: "SO-4101",
    customerId: "ent_cus_1",
    customerName: "شركة النخبة للتقنية",
    date: "2026-03-12",
    total: 4798,
    itemCount: 3,
    status: "processing",
  },
  {
    id: "ord_2",
    orderNo: "SO-4102",
    customerId: "ent_cus_2",
    customerName: "مؤسسة رواد الأعمال",
    date: "2026-03-15",
    total: 1850,
    itemCount: 3,
    status: "new",
  },
];

/**
 * صفحة إدارة عملاء CRM Enterprise للشركات المتوسطة والكبيرة.
 */
export function EnterpriseCustomersManager() {
  const [customers, setCustomers] = useState<EnterpriseCustomer[]>(initialCustomers);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<CustomerFormState>(initialFormState);
  const [isCommunicationModalOpen, setIsCommunicationModalOpen] = useState(false);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [communicationFormState, setCommunicationFormState] = useState<CommunicationFormState>(initialCommunicationFormState);
  const [communicationsByCustomer, setCommunicationsByCustomer] = useState<Record<string, CustomerCommunication[]>>(
    initialCommunicationsByCustomer
  );
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [posCustomerId, setPosCustomerId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [posItems, setPosItems] = useState<PosLineItem[]>([]);
  const [posDiscountAmount, setPosDiscountAmount] = useState("0");
  const [posTaxRate, setPosTaxRate] = useState("15");
  const [posPaymentMethod, setPosPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [posPaymentStatus, setPosPaymentStatus] = useState<"unpaid" | "partial" | "paid">("unpaid");
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(initialSalesInvoices);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(initialSalesOrders);
  const [isCustomerHistoryModalOpen, setIsCustomerHistoryModalOpen] = useState(false);
  const [historyCustomerId, setHistoryCustomerId] = useState<string | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(SALES_INVOICES_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((invoice) => normalizeSalesInvoice(invoice))
          .filter((invoice): invoice is SalesInvoice => invoice !== null);
        if (normalized.length > 0) {
          setSalesInvoices(normalized);
        }
      }
    } catch {
      // Fallback to in-memory defaults if storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SALES_INVOICES_STORAGE_KEY, JSON.stringify(salesInvoices));
  }, [salesInvoices]);

  const activeCustomer = useMemo(
    () => customers.find((customer) => customer.id === activeCustomerId) ?? null,
    [customers, activeCustomerId]
  );

  const activeCustomerMessages = useMemo(
    () => (activeCustomerId ? communicationsByCustomer[activeCustomerId] ?? [] : []),
    [communicationsByCustomer, activeCustomerId]
  );

  const posCustomer = useMemo(
    () => customers.find((customer) => customer.id === posCustomerId) ?? null,
    [customers, posCustomerId]
  );

  const historyCustomer = useMemo(
    () => customers.find((customer) => customer.id === historyCustomerId) ?? null,
    [customers, historyCustomerId]
  );

  const filteredPosProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) {
      return posProducts;
    }

    return posProducts.filter(
      (product) => product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)
    );
  }, [productSearch]);

  const posSubtotal = useMemo(
    () => posItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [posItems]
  );

  const posDiscount = useMemo(() => {
    const numericDiscount = Number(posDiscountAmount || 0);
    if (Number.isNaN(numericDiscount) || numericDiscount < 0) {
      return 0;
    }

    return Math.min(numericDiscount, posSubtotal);
  }, [posDiscountAmount, posSubtotal]);

  const posTaxableAmount = useMemo(() => Math.max(0, posSubtotal - posDiscount), [posSubtotal, posDiscount]);

  const posTaxValue = useMemo(() => {
    const numericTaxRate = Number(posTaxRate || 0);
    if (Number.isNaN(numericTaxRate) || numericTaxRate < 0) {
      return 0;
    }

    return (posTaxableAmount * numericTaxRate) / 100;
  }, [posTaxRate, posTaxableAmount]);

  const posGrandTotal = useMemo(() => posTaxableAmount + posTaxValue, [posTaxableAmount, posTaxValue]);

  const customerHistoryInvoices = useMemo(
    () => salesInvoices.filter((invoice) => invoice.customerId === historyCustomerId),
    [salesInvoices, historyCustomerId]
  );

  const customerHistoryOrders = useMemo(
    () => salesOrders.filter((order) => order.customerId === historyCustomerId),
    [salesOrders, historyCustomerId]
  );

  const previewInvoice = useMemo(
    () => salesInvoices.find((invoice) => invoice.id === previewInvoiceId) ?? null,
    [salesInvoices, previewInvoiceId]
  );

  const totals = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((customer) => customer.status === "active").length;
    const annualRevenue = customers.reduce((sum, customer) => sum + customer.annualValue, 0);

    return { totalCustomers, activeCustomers, annualRevenue };
  }, [customers]);

  const columns = useMemo<Column<EnterpriseCustomer>[]>(
    () => [
      {
        header: "الشركة",
        accessor: (row) => (
          <button
            type="button"
            onClick={() => openCustomerHistoryModal(row)}
            className="font-semibold text-blue-700 underline-offset-2 hover:underline"
            title="عرض كل الفواتير والطلبات للعميل"
          >
            {row.companyName}
          </button>
        ),
      },
      { header: "الحجم", accessor: (row) => sizeLabel[row.companySize] },
      { header: "القطاع", accessor: "industry" },
      { header: "مسؤول التواصل", accessor: "contactPerson" },
      { header: "الجوال", accessor: "phone" },
      {
        header: "الحالة",
        accessor: (row) => {
          const status = statusLabel[row.status];
          return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>{status.label}</span>;
        },
      },
      { header: "آخر تواصل", accessor: (row) => row.lastCommunication || "-" },
      {
        header: "التصنيف",
        accessor: (row) => {
          const tier = tierLabel[row.tier];
          return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${tier.color}`}>{tier.label}</span>;
        },
      },
      { header: "القيمة السنوية", accessor: (row) => row.annualValue.toLocaleString() },
      {
        header: "الإجراءات",
        accessor: (row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openPosModal(row)}
              className="rounded-md border border-emerald-200 p-1.5 text-emerald-700 hover:bg-emerald-50"
              title="طلب فاتورة مبيعات POS"
            >
              <ReceiptText className="h-4 w-4" />
            </button>
            <button
              onClick={() => openCommunicationModal(row)}
              className="rounded-md border border-blue-200 p-1.5 text-blue-700 hover:bg-blue-50"
              title="إضافة تواصل وعرض الرسائل"
            >
              <MessageSquareText className="h-4 w-4" />
            </button>
            <button
              onClick={() => openEditModal(row)}
              className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
              title="تعديل"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(row)}
              className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  /**
   * يفتح نافذة إنشاء عميل جديد.
   */
  function openCreateModal() {
    setEditingId(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  }

  /**
   * يفتح نافذة التعديل بناءً على بيانات العميل المحدد.
   */
  function openEditModal(customer: EnterpriseCustomer) {
    setEditingId(customer.id);
    setFormState({
      companyName: customer.companyName,
      companySize: customer.companySize,
      industry: customer.industry,
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      email: customer.email,
      status: customer.status,
      tier: customer.tier,
      annualValue: String(customer.annualValue),
      lastCommunication: customer.lastCommunication,
      nextFollowUp: customer.nextFollowUp,
      notes: customer.notes,
    });
    setIsModalOpen(true);
  }

  /**
   * يفتح مودال التواصل لعميل محدد ويعرض الرسائل السابقة.
   */
  function openCommunicationModal(customer: EnterpriseCustomer) {
    setActiveCustomerId(customer.id);
    setCommunicationFormState({
      channel: "call",
      date: new Date().toISOString().slice(0, 10),
      agent: customer.contactPerson,
      message: "",
      lastContactSummary: customer.lastCommunication,
    });
    setIsCommunicationModalOpen(true);
  }

  /**
   * يفتح مودال POS لإصدار فاتورة مبيعات متعددة المنتجات.
   */
  function openPosModal(customer: EnterpriseCustomer) {
    setPosCustomerId(customer.id);
    setProductSearch("");
    setPosItems([]);
    setPosDiscountAmount("0");
    setPosTaxRate("15");
    setPosPaymentMethod("cash");
    setPosPaymentStatus("unpaid");
    setIsPosModalOpen(true);
  }

  /**
   * يفتح مودال سجل العميل ويعرض كل الطلبات والفواتير.
   */
  function openCustomerHistoryModal(customer: EnterpriseCustomer) {
    setHistoryCustomerId(customer.id);
    const firstInvoice = salesInvoices.find((invoice) => invoice.customerId === customer.id);
    setPreviewInvoiceId(firstInvoice?.id ?? null);
    setIsCustomerHistoryModalOpen(true);
  }

  /**
   * Sets selected invoice to preview inside the same customer history modal.
   */
  function openInvoicePreview(invoiceId: string) {
    setPreviewInvoiceId(invoiceId);
  }

  /**
   * Shares invoice link using Web Share API with clipboard fallback.
   */
  async function shareInvoice(invoiceId: string) {
    const shareUrl = `${window.location.origin}/dashboard/crm-enterprise/invoices/${invoiceId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "مشاركة فاتورة",
          text: "تفاصيل فاتورة العميل",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("تم نسخ رابط الفاتورة");
      }
    } catch {
      toast.error("تعذر مشاركة الفاتورة");
    }
  }

  /**
   * Updates order status directly from customer history list.
   */
  function updateOrderStatus(orderId: string, status: SalesOrder["status"]) {
    setSalesOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status } : order))
    );
    toast.success("تم تحديث حالة الطلب");
  }

  /**
   * يضيف منتجًا إلى سلة POS أو يزيد الكمية إذا كان موجودًا.
   */
  function addProductToPos(product: PosProduct) {
    setPosItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          id: `line_${Date.now()}_${product.id}`,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }

  /**
   * يحدّث كمية عنصر داخل سلة POS.
   */
  function updatePosItemQuantity(itemId: string, quantity: number) {
    const normalizedQuantity = Number.isNaN(quantity) ? 1 : Math.max(1, quantity);
    setPosItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, quantity: normalizedQuantity } : item)));
  }

  /**
   * يحذف عنصرًا من سلة POS.
   */
  function removePosItem(itemId: string) {
    setPosItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  /**
   * ينشئ فاتورة مبيعات وطلب بيع من سلة POS للعميل الحالي.
   */
  function submitPosInvoice() {
    if (!posCustomer) {
      toast.error("يرجى اختيار عميل");
      return;
    }

    if (posItems.length === 0) {
      toast.error("أضف منتجًا واحدًا على الأقل للفاتورة");
      return;
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const invoiceNo = `INV-${now.getTime().toString().slice(-6)}`;
    const orderNo = `SO-${now.getTime().toString().slice(-6)}`;
    const total = posGrandTotal;
    const taxRate = Number(posTaxRate || 0);

    const invoice: SalesInvoice = {
      id: `invoice_${now.getTime()}`,
      invoiceNo,
      customerId: posCustomer.id,
      customerName: posCustomer.companyName,
      date: today,
      paymentMethod: posPaymentMethod,
      paymentStatus: posPaymentStatus,
      subtotal: posSubtotal,
      discountAmount: posDiscount,
      taxRate: Number.isNaN(taxRate) ? 0 : taxRate,
      taxAmount: posTaxValue,
      total,
      status: "issued",
      items: posItems,
    };

    const order: SalesOrder = {
      id: `order_${now.getTime()}`,
      orderNo,
      customerId: posCustomer.id,
      customerName: posCustomer.companyName,
      date: today,
      total,
      itemCount: posItems.reduce((sum, item) => sum + item.quantity, 0),
      status: "new",
    };

    setSalesInvoices((prev) => [invoice, ...prev]);
    setSalesOrders((prev) => [order, ...prev]);

    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === posCustomer.id
          ? {
              ...customer,
              lastCommunication: `فاتورة ${invoice.invoiceNo} بقيمة ${total.toLocaleString()}`,
            }
          : customer
      )
    );

    setIsPosModalOpen(false);
    setPosItems([]);
    setProductSearch("");
    setPosDiscountAmount("0");
    setPosTaxRate("15");
    setPosPaymentMethod("cash");
    setPosPaymentStatus("unpaid");
    toast.success(`تم إنشاء ${invoice.invoiceNo} و ${order.orderNo}`);
  }

  /**
   * يحفظ العميل الجديد أو تحديث العميل الحالي.
   */
  function handleSave() {
    if (!formState.companyName.trim() || !formState.contactPerson.trim() || !formState.phone.trim()) {
      toast.error("يرجى تعبئة الحقول الأساسية");
      return;
    }

    const annualValue = Number(formState.annualValue || 0);
    if (Number.isNaN(annualValue) || annualValue < 0) {
      toast.error("القيمة السنوية يجب أن تكون رقمًا صحيحًا");
      return;
    }

    const payload: Omit<EnterpriseCustomer, "id"> = {
      companyName: formState.companyName.trim(),
      companySize: formState.companySize,
      industry: formState.industry.trim(),
      contactPerson: formState.contactPerson.trim(),
      phone: formState.phone.trim(),
      email: formState.email.trim(),
      status: formState.status,
      tier: formState.tier,
      annualValue,
      lastCommunication: formState.lastCommunication.trim(),
      nextFollowUp: formState.nextFollowUp,
      notes: formState.notes.trim(),
    };

    if (editingId) {
      setCustomers((prev) => prev.map((customer) => (customer.id === editingId ? { ...customer, ...payload } : customer)));
      toast.success("تم تعديل العميل");
    } else {
      setCustomers((prev) => [{ id: `ent_cus_${Date.now()}`, ...payload }, ...prev]);
      toast.success("تمت إضافة العميل");
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormState(initialFormState);
  }

  /**
   * يحفظ رسالة تواصل جديدة ويحدّث حقل آخر تواصل للعميل.
   */
  function handleSaveCommunication() {
    if (!activeCustomerId) {
      return;
    }

    if (!communicationFormState.message.trim() || !communicationFormState.lastContactSummary.trim()) {
      toast.error("يرجى كتابة الرسالة وملخص آخر تواصل");
      return;
    }

    const newCommunication: CustomerCommunication = {
      id: `comm_${Date.now()}`,
      channel: communicationFormState.channel,
      date: communicationFormState.date,
      agent: communicationFormState.agent.trim() || "غير محدد",
      message: communicationFormState.message.trim(),
      lastContactSummary: communicationFormState.lastContactSummary.trim(),
    };

    setCommunicationsByCustomer((prev) => ({
      ...prev,
      [activeCustomerId]: [newCommunication, ...(prev[activeCustomerId] ?? [])],
    }));

    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === activeCustomerId
          ? {
              ...customer,
              lastCommunication: communicationFormState.lastContactSummary.trim(),
            }
          : customer
      )
    );

    setCommunicationFormState((prev) => ({
      ...prev,
      message: "",
      date: new Date().toISOString().slice(0, 10),
    }));

    toast.success("تم حفظ سجل التواصل");
  }

  /**
   * يحذف العميل بعد تأكيد المستخدم.
   */
  function handleDelete(customer: EnterpriseCustomer) {
    const confirmed = window.confirm(`هل تريد حذف ${customer.companyName}؟`);
    if (!confirmed) {
      return;
    }

    setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
    setCommunicationsByCustomer((prev) => {
      const next = { ...prev };
      delete next[customer.id];
      return next;
    });
    setSalesInvoices((prev) => prev.filter((invoice) => invoice.customerId !== customer.id));
    setSalesOrders((prev) => prev.filter((order) => order.customerId !== customer.id));
    toast.success("تم حذف العميل");
  }

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="إضافة العملاء - CRM Enterprise"
        description="إدارة عملاء الشركات المتوسطة والكبيرة مع متابعة الحالة والقيمة السنوية."
      >
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
          إضافة عميل
        </Button>
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي العملاء</p>
            <p className="text-3xl font-bold text-slate-900">{totals.totalCustomers}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">العملاء النشطون</p>
            <p className="text-3xl font-bold text-emerald-600">{totals.activeCustomers}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="border-l-4 border-l-orange-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي القيمة السنوية</p>
            <p className="text-3xl font-bold text-orange-600">{totals.annualRevenue.toLocaleString()}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="قائمة العملاء" description="بحث وتصدير واستيراد وإدارة كاملة للعملاء." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={columns}
            data={customers}
            dir="rtl"
            pageSize={6}
            totalCount={customers.length}
            currentPage={page}
            onPageChange={setPage}
            title="عملاء CRM Enterprise"
            getRowSearchText={(customer) => {
              const communicationText = (communicationsByCustomer[customer.id] ?? [])
                .map((item) => `${channelLabel[item.channel]} ${item.message} ${item.lastContactSummary} ${item.agent} ${item.date}`)
                .join(" ");

              const invoiceText = salesInvoices
                .filter((invoice) => invoice.customerId === customer.id)
                .map((invoice) => `${invoice.invoiceNo} ${invoice.total} ${invoice.date}`)
                .join(" ");

              const orderText = salesOrders
                .filter((order) => order.customerId === customer.id)
                .map((order) => `${order.orderNo} ${order.total} ${order.date}`)
                .join(" ");

              return `${customer.companyName} ${sizeLabel[customer.companySize]} ${customer.industry} ${customer.contactPerson} ${statusLabel[customer.status].label} ${tierLabel[customer.tier].label} ${customer.lastCommunication} ${customer.notes} ${communicationText} ${invoiceText} ${orderText}`;
            }}
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "تعديل عميل" : "إضافة عميل"}
        size="md"
        footer={
          <>
            <Button onClick={handleSave}>{editingId ? "حفظ التعديل" : "إضافة"}</Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="اسم الشركة"
            value={formState.companyName}
            onChange={(event) => setFormState((prev) => ({ ...prev, companyName: event.target.value }))}
          />
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.companySize}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, companySize: event.target.value as EnterpriseCustomer["companySize"] }))
            }
          >
            <option value="medium">متوسطة</option>
            <option value="large">كبيرة</option>
          </select>
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="القطاع"
            value={formState.industry}
            onChange={(event) => setFormState((prev) => ({ ...prev, industry: event.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="مسؤول التواصل"
            value={formState.contactPerson}
            onChange={(event) => setFormState((prev) => ({ ...prev, contactPerson: event.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="رقم الجوال"
            value={formState.phone}
            onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <input
            type="email"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="البريد الإلكتروني"
            value={formState.email}
            onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
          />
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.status}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, status: event.target.value as EnterpriseCustomer["status"] }))
            }
          >
            <option value="lead">عميل محتمل</option>
            <option value="active">نشط</option>
            <option value="at-risk">معرّض للفقد</option>
          </select>
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.tier}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, tier: event.target.value as EnterpriseCustomer["tier"] }))
            }
          >
            <option value="gold">ذهبي</option>
            <option value="silver">فضي</option>
            <option value="bronze">برونزي</option>
          </select>
          <input
            type="number"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="القيمة السنوية"
            value={formState.annualValue}
            onChange={(event) => setFormState((prev) => ({ ...prev, annualValue: event.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="آخر تواصل"
            value={formState.lastCommunication}
            onChange={(event) => setFormState((prev) => ({ ...prev, lastCommunication: event.target.value }))}
          />
          <input
            type="date"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.nextFollowUp}
            onChange={(event) => setFormState((prev) => ({ ...prev, nextFollowUp: event.target.value }))}
          />
          <textarea
            className="min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            placeholder="ملاحظات"
            value={formState.notes}
            onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </div>
      </AppModal>

      <AppModal
        isOpen={isCommunicationModalOpen}
        onClose={() => setIsCommunicationModalOpen(false)}
        title={activeCustomer ? `سجل تواصل: ${activeCustomer.companyName}` : "سجل التواصل"}
        size="xl"
        footer={
          <>
            <Button onClick={handleSaveCommunication}>حفظ التواصل</Button>
            <Button variant="outline" onClick={() => setIsCommunicationModalOpen(false)}>
              إغلاق
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">إضافة تواصل جديد</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                value={communicationFormState.channel}
                onChange={(event) =>
                  setCommunicationFormState((prev) => ({
                    ...prev,
                    channel: event.target.value as CustomerCommunication["channel"],
                  }))
                }
              >
                <option value="call">مكالمة</option>
                <option value="email">بريد</option>
                <option value="meeting">اجتماع</option>
                <option value="whatsapp">واتساب</option>
              </select>
              <input
                type="date"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                value={communicationFormState.date}
                onChange={(event) => setCommunicationFormState((prev) => ({ ...prev, date: event.target.value }))}
              />
              <input
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm md:col-span-2"
                placeholder="اسم المسؤول عن التواصل"
                value={communicationFormState.agent}
                onChange={(event) => setCommunicationFormState((prev) => ({ ...prev, agent: event.target.value }))}
              />
              <textarea
                className="min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                placeholder="الرسالة / تفاصيل التواصل"
                value={communicationFormState.message}
                onChange={(event) => setCommunicationFormState((prev) => ({ ...prev, message: event.target.value }))}
              />
              <textarea
                className="min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                placeholder="آخر ما تم التواصل عليه مع العميل"
                value={communicationFormState.lastContactSummary}
                onChange={(event) =>
                  setCommunicationFormState((prev) => ({ ...prev, lastContactSummary: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">كل الرسائل التي تمت مع العميل</p>
            {activeCustomerMessages.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد رسائل تواصل لهذا العميل حتى الآن.</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {activeCustomerMessages.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                      <span>{channelLabel[item.channel]}</span>
                      <span>{item.date}</span>
                    </div>
                    <p className="text-sm text-slate-700">{item.message}</p>
                    <p className="mt-2 text-xs font-semibold text-blue-700">آخر تواصل: {item.lastContactSummary}</p>
                    <p className="mt-1 text-xs text-slate-500">المسؤول: {item.agent}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppModal>

      <AppModal
        isOpen={isPosModalOpen}
        onClose={() => setIsPosModalOpen(false)}
        title={posCustomer ? `طلب فاتورة مبيعات POS - ${posCustomer.companyName}` : "طلب فاتورة مبيعات POS"}
        size="xl"
        footer={
          <>
            <Button onClick={submitPosInvoice}>إصدار الفاتورة والطلب</Button>
            <Button variant="outline" onClick={() => setIsPosModalOpen(false)}>
              إغلاق
            </Button>
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">بحث المنتجات وإضافتها</p>
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
              {filteredPosProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.sku}</p>
                    <p className="text-xs text-emerald-700">{product.price.toLocaleString()} ر.س</p>
                  </div>
                  <Button size="sm" onClick={() => addProductToPos(product)}>
                    إضافة
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">بنود الفاتورة</p>
            {posItems.length === 0 ? (
              <p className="text-sm text-slate-500">لم تتم إضافة منتجات بعد.</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {posItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.sku}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePosItem(item.id)}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        حذف
                      </button>
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
                        value={item.quantity}
                        onChange={(event) => updatePosItemQuantity(item.id, Number(event.target.value))}
                      />
                      <p className="text-sm text-slate-600">{item.price.toLocaleString()} ر.س</p>
                      <p className="text-left text-sm font-semibold text-emerald-700">
                        {(item.price * item.quantity).toLocaleString()} ر.س
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                <p>المجموع الفرعي</p>
                <p className="text-left">{posSubtotal.toLocaleString()} ر.س</p>
                <p>الخصم</p>
                <p className="text-left">- {posDiscount.toLocaleString()} ر.س</p>
                <p>الضريبة</p>
                <p className="text-left">+ {posTaxValue.toLocaleString()} ر.س</p>
              </div>
              <div className="mt-2 border-t border-emerald-200 pt-2">
                <p className="text-sm text-slate-700">الإجمالي النهائي</p>
                <p className="text-2xl font-bold text-emerald-700">{posGrandTotal.toLocaleString()} ر.س</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-4">
              <div>
                <p className="mb-1 text-xs text-slate-600">الخصم (قيمة)</p>
                <input
                  type="number"
                  min={0}
                  className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                  value={posDiscountAmount}
                  onChange={(event) => setPosDiscountAmount(event.target.value)}
                />
              </div>

              <div>
                <p className="mb-1 text-xs text-slate-600">الضريبة %</p>
                <input
                  type="number"
                  min={0}
                  className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                  value={posTaxRate}
                  onChange={(event) => setPosTaxRate(event.target.value)}
                />
              </div>

              <div>
                <p className="mb-1 text-xs text-slate-600">طريقة الدفع</p>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                  value={posPaymentMethod}
                  onChange={(event) => setPosPaymentMethod(event.target.value as "cash" | "card" | "transfer")}
                >
                  <option value="cash">نقد</option>
                  <option value="card">شبكة</option>
                  <option value="transfer">تحويل</option>
                </select>
              </div>

              <div>
                <p className="mb-1 text-xs text-slate-600">حالة الدفع</p>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                  value={posPaymentStatus}
                  onChange={(event) => setPosPaymentStatus(event.target.value as "unpaid" | "partial" | "paid")}
                >
                  <option value="unpaid">غير مدفوعة</option>
                  <option value="partial">مدفوعة جزئياً</option>
                  <option value="paid">مدفوعة</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </AppModal>

      <AppModal
        isOpen={isCustomerHistoryModalOpen}
        onClose={() => setIsCustomerHistoryModalOpen(false)}
        title={historyCustomer ? `سجل الطلبات والفواتير: ${historyCustomer.companyName}` : "سجل الطلبات والفواتير"}
        size="xl"
        footer={
          <Button variant="outline" onClick={() => setIsCustomerHistoryModalOpen(false)}>
            إغلاق
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">الفواتير</p>
            {customerHistoryInvoices.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد فواتير لهذا العميل.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-right font-semibold text-slate-700">رقم الفاتورة</th>
                      <th className="p-3 text-right font-semibold text-slate-700">التاريخ</th>
                      <th className="p-3 text-right font-semibold text-slate-700">المبلغ</th>
                      <th className="p-3 text-right font-semibold text-slate-700">طريقة الدفع</th>
                      <th className="p-3 text-right font-semibold text-slate-700">حالة الدفع</th>
                      <th className="p-3 text-right font-semibold text-slate-700">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerHistoryInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t border-slate-100">
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => openInvoicePreview(invoice.id)}
                            className="font-semibold text-blue-700 hover:underline"
                          >
                            {invoice.invoiceNo}
                          </button>
                        </td>
                        <td className="p-3 text-slate-600">{invoice.date}</td>
                        <td className="p-3 text-slate-700">{invoice.total.toLocaleString()} ر.س</td>
                        <td className="p-3 text-slate-600">{paymentMethodLabel[invoice.paymentMethod]}</td>
                        <td className="p-3">
                          <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${paymentStatusLabel[invoice.paymentStatus].color}`}>
                            {paymentStatusLabel[invoice.paymentStatus].label}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => shareInvoice(invoice.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                            >
                              <Share2 className="h-3.5 w-3.5" /> مشاركة
                            </button>
                            <Link
                              href={`/dashboard/crm-enterprise/invoices/${invoice.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                            >
                              فتح الصفحة
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">الطلبات</p>
            {customerHistoryOrders.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد طلبات لهذا العميل.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-right font-semibold text-slate-700">رقم الطلب</th>
                      <th className="p-3 text-right font-semibold text-slate-700">التاريخ</th>
                      <th className="p-3 text-right font-semibold text-slate-700">القطع</th>
                      <th className="p-3 text-right font-semibold text-slate-700">الإجمالي</th>
                      <th className="p-3 text-right font-semibold text-slate-700">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerHistoryOrders.map((order) => (
                      <tr key={order.id} className="border-t border-slate-100">
                        <td className="p-3 text-slate-700">{order.orderNo}</td>
                        <td className="p-3 text-slate-600">{order.date}</td>
                        <td className="p-3 text-slate-600">{order.itemCount}</td>
                        <td className="p-3 text-slate-700">{order.total.toLocaleString()} ر.س</td>
                        <td className="p-3">
                          <select
                            className="h-8 rounded-md border border-slate-200 px-2 text-xs"
                            value={order.status}
                            onChange={(event) => updateOrderStatus(order.id, event.target.value as SalesOrder["status"])}
                          >
                            <option value="new">جديد</option>
                            <option value="processing">قيد التنفيذ</option>
                            <option value="completed">مكتمل</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">معاينة الفاتورة داخل نفس المودال</p>
            {previewInvoice ? (
              <div className="space-y-3">
                <div className="grid gap-2 rounded-lg border border-slate-200 p-3 text-sm md:grid-cols-2">
                  <p>العميل: <span className="font-semibold">{previewInvoice.customerName}</span></p>
                  <p>التاريخ: <span className="font-semibold">{previewInvoice.date}</span></p>
                  <p>طريقة الدفع: <span className="font-semibold">{paymentMethodLabel[previewInvoice.paymentMethod]}</span></p>
                  <p>حالة الدفع: <span className="font-semibold">{paymentStatusLabel[previewInvoice.paymentStatus].label}</span></p>
                </div>

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
                      {previewInvoice.items.map((item) => (
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

                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 md:max-w-md">
                  <p>الفرعي</p>
                  <p className="text-left">{previewInvoice.subtotal.toLocaleString()} ر.س</p>
                  <p>الخصم</p>
                  <p className="text-left">- {previewInvoice.discountAmount.toLocaleString()} ر.س</p>
                  <p>الضريبة ({previewInvoice.taxRate}%)</p>
                  <p className="text-left">+ {previewInvoice.taxAmount.toLocaleString()} ر.س</p>
                  <p className="font-bold">الإجمالي</p>
                  <p className="text-left font-bold text-emerald-700">{previewInvoice.total.toLocaleString()} ر.س</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">اختر فاتورة من الجدول أعلاه لعرض محتواها هنا.</p>
            )}
          </div>
        </div>
      </AppModal>
    </section>
  );
}
