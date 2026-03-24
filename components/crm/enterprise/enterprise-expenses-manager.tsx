"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";

type ExpenseType = "general" | "purchase";
type GeneralExpensePeriod = "daily" | "monthly" | "yearly";
type PurchasePaymentMethod = "bank_transfer" | "cod" | "other";

interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
}

interface PurchaseItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface ShippingCompanyRow {
  id: string;
  company: string;
  avgCost: number;
}

interface GeneralExpenseDetails {
  expenseName: string;
  expenseQuantity: number;
  expensePrice: number;
  period: GeneralExpensePeriod;
  notes: string;
}

interface PurchaseExpenseDetails {
  supplierName: string;
  country: string;
  city: string;
  discountAmount: number;
  notes: string;
  items: PurchaseItem[];
  paymentMethod: PurchasePaymentMethod;
  paidAmount: number;
  remainingAmount: number;
  shippingCompanyId: string | null;
  shippingCompanyName: string;
  shippingCost: number;
}

interface ExpenseRecord {
  id: string;
  type: ExpenseType;
  date: string;
  totalAmount: number;
  general: GeneralExpenseDetails | null;
  purchase: PurchaseExpenseDetails | null;
}

interface ExpenseFormState {
  type: ExpenseType;
  date: string;
  expenseName: string;
  expenseQuantity: string;
  expensePrice: string;
  generalPeriod: GeneralExpensePeriod;
  generalNotes: string;
  supplierName: string;
  country: string;
  city: string;
  discountAmount: string;
  purchaseNotes: string;
  items: PurchaseItem[];
  paymentMethod: PurchasePaymentMethod;
  paidAmount: string;
  shippingCompanyId: string;
  shippingCost: string;
}

interface ProductCatalogStorageRow {
  id: string;
  type: "product" | "category";
  productName?: string;
  price?: number;
}

const EXPENSES_STORAGE_KEY = "crm-enterprise-expenses";
const CATALOG_STORAGE_KEY = "crm-enterprise-products-catalog";
const SHIPPING_COMPANIES_STORAGE_KEY = "crm-enterprise-shipping-companies";

const countryOptions = [
  { value: "SA", label: "السعودية" },
  { value: "AE", label: "الإمارات" },
  { value: "KW", label: "الكويت" },
  { value: "QA", label: "قطر" },
  { value: "BH", label: "البحرين" },
  { value: "OM", label: "عُمان" },
  { value: "EG", label: "مصر" },
  { value: "JO", label: "الأردن" },
];

const fallbackProducts: CatalogProduct[] = [
  { id: "pos_pr_1", name: "CRM Pro License", sku: "CRM-PRO", price: 1999 },
  { id: "pos_pr_2", name: "Analytics Plus", sku: "ANL-PLUS", price: 799 },
  { id: "pos_pr_3", name: "Priority Support", sku: "SUP-PRIO", price: 1200 },
  { id: "pos_pr_4", name: "Onboarding Pack", sku: "ONB-PACK", price: 650 },
  { id: "pos_pr_5", name: "WhatsApp Integration", sku: "WA-INT", price: 420 },
];

const fallbackShippingCompanies: ShippingCompanyRow[] = [
  { id: "sh_1", company: "FastShip", avgCost: 22 },
  { id: "sh_2", company: "CargoLink", avgCost: 12 },
  { id: "sh_3", company: "BlueLogix", avgCost: 9 },
];

const initialExpenses: ExpenseRecord[] = [
  {
    id: "exp_1",
    type: "general",
    date: "2026-03-23",
    totalAmount: 250,
    general: {
      expenseName: "مستلزمات مكتبية",
      expenseQuantity: 10,
      expensePrice: 25,
      period: "monthly",
      notes: "شراء ورق وطباعة",
    },
    purchase: null,
  },
  {
    id: "exp_2",
    type: "purchase",
    date: "2026-03-23",
    totalAmount: 1800,
    general: null,
    purchase: {
      supplierName: "مورد التقنية",
      country: "SA",
      city: "الرياض",
      discountAmount: 100,
      notes: "توريد دفعة أولى",
      items: [
        {
          id: "line_1",
          productId: "pos_pr_1",
          name: "CRM Pro License",
          sku: "CRM-PRO",
          price: 950,
          quantity: 2,
        },
      ],
      paymentMethod: "other",
      paidAmount: 1000,
      remainingAmount: 800,
      shippingCompanyId: null,
      shippingCompanyName: "",
      shippingCost: 0,
    },
  },
];

const initialFormState: ExpenseFormState = {
  type: "general",
  date: new Date().toISOString().slice(0, 10),
  expenseName: "",
  expenseQuantity: "",
  expensePrice: "",
  generalPeriod: "daily",
  generalNotes: "",
  supplierName: "",
  country: "SA",
  city: "",
  discountAmount: "0",
  purchaseNotes: "",
  items: [],
  paymentMethod: "bank_transfer",
  paidAmount: "",
  shippingCompanyId: "",
  shippingCost: "",
};

const generalExpensePeriodLabel: Record<GeneralExpensePeriod, string> = {
  daily: "يومي",
  monthly: "شهري",
  yearly: "سنوي",
};

const purchasePaymentMethodLabel: Record<PurchasePaymentMethod, string> = {
  bank_transfer: "بنكي",
  cod: "عند الاستلام",
  other: "طرق أخرى",
};

/**
 * Safely reads JSON array from localStorage.
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
 * Maps product rows from products catalog storage into POS list.
 */
function mapCatalogProducts(rows: ProductCatalogStorageRow[]): CatalogProduct[] {
  const mapped = rows
    .filter((row) => row.type === "product" && typeof row.productName === "string")
    .map((row) => ({
      id: row.id,
      name: row.productName as string,
      sku: `SKU-${row.id.slice(-5).toUpperCase()}`,
      price: Number(row.price ?? 0),
    }))
    .filter((row) => row.price > 0);

  return mapped.length > 0 ? mapped : fallbackProducts;
}

/**
 * Checks if a date is inside optional date boundaries.
 */
function isDateInRange(targetDate: string, fromDate: string, toDate: string): boolean {
  if (fromDate && targetDate < fromDate) {
    return false;
  }

  if (toDate && targetDate > toDate) {
    return false;
  }

  return true;
}

/**
 * Normalizes legacy and partial expense rows from localStorage to safe shape.
 */
function normalizeStoredExpenses(input: unknown[]): ExpenseRecord[] {
  const toNumber = (value: unknown, fallback = 0): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const mapPaymentMethod = (value: unknown): PurchasePaymentMethod => {
    if (value === "bank_transfer" || value === "cod" || value === "other") {
      return value;
    }

    if (value === "transfer") {
      return "bank_transfer";
    }

    if (value === "cash") {
      return "cod";
    }

    if (value === "card") {
      return "other";
    }

    return "bank_transfer";
  };

  return input
    .map((raw, index) => {
      if (!raw || typeof raw !== "object") {
        return null;
      }

      const row = raw as Record<string, unknown>;
      const rowType: ExpenseType =
        row.type === "general" || row.type === "purchase"
          ? row.type
          : row.purchase
            ? "purchase"
            : "general";

      const rowDate = typeof row.date === "string" && row.date ? row.date : new Date().toISOString().slice(0, 10);
      const rowId = typeof row.id === "string" && row.id ? row.id : `exp_legacy_${Date.now()}_${index}`;

      const generalRaw = row.general && typeof row.general === "object" ? (row.general as Record<string, unknown>) : null;
      const purchaseRaw = row.purchase && typeof row.purchase === "object" ? (row.purchase as Record<string, unknown>) : null;

      let mappedGeneral: GeneralExpenseDetails | null = null;
      if (rowType === "general") {
        const periodValue = generalRaw?.period;
        const period: GeneralExpensePeriod =
          periodValue === "daily" || periodValue === "monthly" || periodValue === "yearly" ? periodValue : "daily";

        mappedGeneral = {
          expenseName: typeof generalRaw?.expenseName === "string" ? generalRaw.expenseName : "مصروف عام",
          expenseQuantity: Math.max(1, toNumber(generalRaw?.expenseQuantity, 1)),
          expensePrice: Math.max(0, toNumber(generalRaw?.expensePrice, 0)),
          period,
          notes: typeof generalRaw?.notes === "string" ? generalRaw.notes : "",
        };
      }

      let mappedPurchase: PurchaseExpenseDetails | null = null;
      if (rowType === "purchase") {
        const itemsRaw =
          Array.isArray(purchaseRaw?.items)
            ? purchaseRaw.items
            : Array.isArray(row.items)
              ? row.items
              : [];

        const items = itemsRaw
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map((item, itemIndex) => ({
            id: typeof item.id === "string" && item.id ? item.id : `line_legacy_${rowId}_${itemIndex}`,
            productId: typeof item.productId === "string" && item.productId ? item.productId : `legacy_${itemIndex}`,
            name: typeof item.name === "string" ? item.name : "منتج",
            sku: typeof item.sku === "string" ? item.sku : `LEG-${itemIndex + 1}`,
            price: Math.max(0, toNumber(item.price, 0)),
            quantity: Math.max(1, toNumber(item.quantity, 1)),
          }));

        const paymentMethod = mapPaymentMethod(purchaseRaw?.paymentMethod);
        const subTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discountAmount = Math.max(0, toNumber(purchaseRaw?.discountAmount, 0));
        const purchaseTotal = Math.max(0, subTotal - discountAmount);
        const paidAmount = Math.max(0, toNumber(purchaseRaw?.paidAmount, paymentMethod === "bank_transfer" ? purchaseTotal : 0));
        const remainingAmount =
          purchaseRaw?.remainingAmount !== undefined
            ? Math.max(0, toNumber(purchaseRaw.remainingAmount, 0))
            : paymentMethod === "other"
              ? Math.max(0, purchaseTotal - paidAmount)
              : paymentMethod === "cod"
                ? purchaseTotal
                : 0;

        mappedPurchase = {
          supplierName: typeof purchaseRaw?.supplierName === "string" ? purchaseRaw.supplierName : "",
          country: typeof purchaseRaw?.country === "string" ? purchaseRaw.country : "SA",
          city: typeof purchaseRaw?.city === "string" ? purchaseRaw.city : "",
          discountAmount,
          notes: typeof purchaseRaw?.notes === "string" ? purchaseRaw.notes : "",
          items,
          paymentMethod,
          paidAmount,
          remainingAmount,
          shippingCompanyId:
            typeof purchaseRaw?.shippingCompanyId === "string" && purchaseRaw.shippingCompanyId
              ? purchaseRaw.shippingCompanyId
              : null,
          shippingCompanyName: typeof purchaseRaw?.shippingCompanyName === "string" ? purchaseRaw.shippingCompanyName : "",
          shippingCost: Math.max(0, toNumber(purchaseRaw?.shippingCost, 0)),
        };
      }

      const fallbackTotal = mappedPurchase
        ? Math.max(0, mappedPurchase.items.reduce((sum, item) => sum + item.price * item.quantity, 0) - mappedPurchase.discountAmount) +
          mappedPurchase.shippingCost
        : mappedGeneral
          ? mappedGeneral.expenseQuantity * mappedGeneral.expensePrice
          : 0;

      return {
        id: rowId,
        type: rowType,
        date: rowDate,
        totalAmount: Math.max(0, toNumber(row.totalAmount, fallbackTotal)),
        general: mappedGeneral,
        purchase: mappedPurchase,
      } satisfies ExpenseRecord;
    })
    .filter((row): row is ExpenseRecord => row !== null);
}

/**
 * Expense manager with separate general/purchase tables and filters.
 */
export function EnterpriseExpensesManager() {
  const [rows, setRows] = useState<ExpenseRecord[]>(initialExpenses);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(fallbackProducts);
  const [shippingCompanies, setShippingCompanies] = useState<ShippingCompanyRow[]>(fallbackShippingCompanies);
  const [pageGeneral, setPageGeneral] = useState(1);
  const [pagePurchase, setPagePurchase] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailsExpenseId, setDetailsExpenseId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ExpenseFormState>(initialFormState);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [generalPeriodFilter, setGeneralPeriodFilter] = useState<"all" | GeneralExpensePeriod>("all");
  const [generalFilterVisible, setGeneralFilterVisible] = useState(true);

  const purchaseSubtotal = useMemo(
    () => formState.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [formState.items]
  );

  const purchaseDiscount = useMemo(() => {
    const value = Number(formState.discountAmount || 0);
    if (Number.isNaN(value) || value < 0) {
      return 0;
    }

    return Math.min(value, purchaseSubtotal);
  }, [formState.discountAmount, purchaseSubtotal]);

  const purchaseTotal = useMemo(() => Math.max(0, purchaseSubtotal - purchaseDiscount), [purchaseSubtotal, purchaseDiscount]);

  const paidAmountSafe = useMemo(() => {
    const value = Number(formState.paidAmount || 0);
    if (Number.isNaN(value) || value < 0) {
      return 0;
    }

    return value;
  }, [formState.paidAmount]);

  const remainingAmountAuto = useMemo(() => {
    if (formState.paymentMethod !== "other") {
      return 0;
    }

    return Math.max(0, purchaseTotal - paidAmountSafe);
  }, [formState.paymentMethod, purchaseTotal, paidAmountSafe]);

  const selectedShippingCompany = useMemo(
    () => shippingCompanies.find((item) => item.id === formState.shippingCompanyId) ?? null,
    [shippingCompanies, formState.shippingCompanyId]
  );

  const shippingCostResolved = useMemo(() => {
    const parsed = Number(formState.shippingCost || "");
    if (formState.shippingCost.trim() !== "" && !Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }

    return selectedShippingCompany?.avgCost ?? 0;
  }, [formState.shippingCost, selectedShippingCompany]);

  useEffect(() => {
    const storedExpenses = readStorageArray<unknown>(EXPENSES_STORAGE_KEY);
    if (storedExpenses.length > 0) {
      setRows(normalizeStoredExpenses(storedExpenses));
    }

    const catalogRows = readStorageArray<ProductCatalogStorageRow>(CATALOG_STORAGE_KEY);
    setCatalogProducts(mapCatalogProducts(catalogRows));

    const shippingRows = readStorageArray<ShippingCompanyRow>(SHIPPING_COMPANIES_STORAGE_KEY);
    if (shippingRows.length > 0) {
      setShippingCompanies(shippingRows);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const detailsExpense = useMemo(
    () => rows.find((row) => row.id === detailsExpenseId && row.type === "purchase") ?? null,
    [rows, detailsExpenseId]
  );

  const filteredGeneralRows = useMemo(() => {
    return rows
      .filter((row) => row.type === "general")
      .filter((row) => isDateInRange(row.date, dateFrom, dateTo))
      .filter((row) => (generalPeriodFilter === "all" ? true : row.general?.period === generalPeriodFilter));
  }, [rows, dateFrom, dateTo, generalPeriodFilter]);

  const filteredPurchaseRows = useMemo(() => {
    return rows
      .filter((row) => row.type === "purchase")
      .filter((row) => isDateInRange(row.date, dateFrom, dateTo));
  }, [rows, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const totalExpenses = rows.length;
    const purchaseExpenses = rows.filter((row) => row.type === "purchase").length;
    const totalValue = rows.reduce((sum, row) => sum + row.totalAmount, 0);

    return {
      totalExpenses,
      purchaseExpenses,
      totalValue,
    };
  }, [rows]);

  const generalColumns = useMemo<Column<ExpenseRecord>[]>(
    () => [
      { header: "اسم المصروف", accessor: (row) => row.general?.expenseName ?? "-" },
      { header: "الكمية", accessor: (row) => row.general?.expenseQuantity ?? 0 },
      { header: "سعر المصروف", accessor: (row) => (row.general?.expensePrice ?? 0).toLocaleString() },
      { header: "الإجمالي", accessor: (row) => row.totalAmount.toLocaleString() },
      { header: "النوع", accessor: (row) => generalExpensePeriodLabel[row.general?.period ?? "daily"] },
      { header: "ملاحظات", accessor: (row) => row.general?.notes ?? "-" },
      { header: "التاريخ", accessor: "date" },
      {
        header: "الإجراءات",
        accessor: (row) => (
          <div className="flex items-center gap-1">
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

  const purchaseColumns = useMemo<Column<ExpenseRecord>[]>(
    () => [
      { header: "المورد", accessor: (row) => row.purchase?.supplierName ?? "-" },
      { header: "المنتجات", accessor: (row) => row.purchase?.items?.length ?? 0 },
      { header: "طريقة الدفع", accessor: (row) => purchasePaymentMethodLabel[row.purchase?.paymentMethod ?? "bank_transfer"] },
      { header: "مدفوع", accessor: (row) => (row.purchase?.paidAmount ?? 0).toLocaleString() },
      { header: "متبقي", accessor: (row) => (row.purchase?.remainingAmount ?? 0).toLocaleString() },
      { header: "الشحن", accessor: (row) => (row.purchase?.shippingCost ?? 0).toLocaleString() },
      { header: "التاريخ", accessor: "date" },
      { header: "الإجمالي", accessor: (row) => row.totalAmount.toLocaleString() },
      {
        header: "الإجراءات",
        accessor: (row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDetailsExpenseId(row.id)}
              className="rounded-md border border-blue-200 p-1.5 text-blue-700 hover:bg-blue-50"
              title="رؤية تفاصيل الفاتورة"
            >
              <Eye className="h-4 w-4" />
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
   * Opens create modal with default state.
   */
  function openCreateModal() {
    setEditingId(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  }

  /**
   * Opens edit modal and maps selected row values.
   */
  function openEditModal(row: ExpenseRecord) {
    if (row.type === "general") {
      setGeneralFilterVisible(true);
      setFormState({
        type: "general",
        date: row.date,
        expenseName: row.general?.expenseName ?? "",
        expenseQuantity: String(row.general?.expenseQuantity ?? ""),
        expensePrice: String(row.general?.expensePrice ?? ""),
        generalPeriod: row.general?.period ?? "daily",
        generalNotes: row.general?.notes ?? "",
        supplierName: "",
        country: "SA",
        city: "",
        discountAmount: "0",
        purchaseNotes: "",
        items: [],
        paymentMethod: "bank_transfer",
        paidAmount: "",
        shippingCompanyId: "",
        shippingCost: "",
      });
    } else {
      setGeneralFilterVisible(false);
      setFormState({
        type: "purchase",
        date: row.date,
        expenseName: "",
        expenseQuantity: "",
        expensePrice: "",
        generalPeriod: "daily",
        generalNotes: "",
        supplierName: row.purchase?.supplierName ?? "",
        country: row.purchase?.country ?? "SA",
        city: row.purchase?.city ?? "",
        discountAmount: String(row.purchase?.discountAmount ?? 0),
        purchaseNotes: row.purchase?.notes ?? "",
        items: row.purchase?.items ?? [],
        paymentMethod: row.purchase?.paymentMethod ?? "bank_transfer",
        paidAmount: String(row.purchase?.paidAmount ?? 0),
        shippingCompanyId: row.purchase?.shippingCompanyId ?? "",
        shippingCost: row.purchase?.shippingCost ? String(row.purchase.shippingCost) : "",
      });
    }

    setEditingId(row.id);
    setIsModalOpen(true);
  }

  /**
   * Adds selected product to purchase list.
   */
  function addPurchaseProduct(product: CatalogProduct) {
    setFormState((prev) => {
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

  /**
   * Updates quantity for one purchased product line.
   */
  function updatePurchaseItemQuantity(itemId: string, quantity: number) {
    const safeQuantity = Number.isNaN(quantity) ? 1 : Math.max(1, quantity);
    setFormState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === itemId ? { ...item, quantity: safeQuantity } : item)),
    }));
  }

  /**
   * Removes one purchased product line.
   */
  function removePurchaseItem(itemId: string) {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  }

  /**
   * Validates and saves one expense row.
   */
  function handleSave() {
    const date = formState.date || new Date().toISOString().slice(0, 10);

    if (formState.type === "general") {
      if (!formState.expenseName.trim()) {
        toast.error("اسم المصروف مطلوب");
        return;
      }

      const quantity = Number(formState.expenseQuantity || 0);
      if (Number.isNaN(quantity) || quantity <= 0) {
        toast.error("كمية المصروف غير صحيحة");
        return;
      }

      const price = Number(formState.expensePrice || 0);
      if (Number.isNaN(price) || price < 0) {
        toast.error("سعر المصروف غير صحيح");
        return;
      }

      const generalTotal = quantity * price;

      const payload: ExpenseRecord = {
        id: editingId ?? `exp_${Date.now()}`,
        type: "general",
        date,
        totalAmount: generalTotal,
        general: {
          expenseName: formState.expenseName.trim(),
          expenseQuantity: quantity,
          expensePrice: price,
          period: formState.generalPeriod,
          notes: formState.generalNotes.trim(),
        },
        purchase: null,
      };

      if (editingId) {
        setRows((prev) => prev.map((row) => (row.id === editingId ? payload : row)));
        toast.success("تم تعديل المصروف العام");
      } else {
        setRows((prev) => [payload, ...prev]);
        toast.success("تمت إضافة المصروف العام");
      }
    } else {
      if (!formState.supplierName.trim()) {
        toast.error("اسم المورد مطلوب");
        return;
      }

      if (!formState.city.trim()) {
        toast.error("مدينة الشراء مطلوبة");
        return;
      }

      if (formState.items.length === 0) {
        toast.error("يرجى اختيار منتج واحد على الأقل");
        return;
      }

      const paidAmount =
        formState.paymentMethod === "other"
          ? Math.max(0, Number(formState.paidAmount || 0))
          : formState.paymentMethod === "bank_transfer"
            ? purchaseTotal
            : 0;

      const remainingAmount =
        formState.paymentMethod === "other"
          ? remainingAmountAuto
          : formState.paymentMethod === "cod"
            ? purchaseTotal
            : 0;

      const shippingCompany = shippingCompanies.find((item) => item.id === formState.shippingCompanyId) ?? null;

      const payload: ExpenseRecord = {
        id: editingId ?? `exp_${Date.now()}`,
        type: "purchase",
        date,
        totalAmount: purchaseTotal + shippingCostResolved,
        general: null,
        purchase: {
          supplierName: formState.supplierName.trim(),
          country: formState.country,
          city: formState.city.trim(),
          discountAmount: purchaseDiscount,
          notes: formState.purchaseNotes.trim(),
          items: formState.items,
          paymentMethod: formState.paymentMethod,
          paidAmount,
          remainingAmount,
          shippingCompanyId: shippingCompany?.id ?? null,
          shippingCompanyName: shippingCompany?.company ?? "",
          shippingCost: shippingCostResolved,
        },
      };

      if (editingId) {
        setRows((prev) => prev.map((row) => (row.id === editingId ? payload : row)));
        toast.success("تم تعديل مصروف شراء البضاعة");
      } else {
        setRows((prev) => [payload, ...prev]);
        toast.success("تمت إضافة مصروف شراء البضاعة");
      }
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormState(initialFormState);
    setGeneralFilterVisible(true);
  }

  /**
   * Deletes one expense row.
   */
  function handleDelete(row: ExpenseRecord) {
    const confirmed = window.confirm("هل تريد حذف هذا المصروف؟");
    if (!confirmed) {
      return;
    }

    setRows((prev) => prev.filter((item) => item.id !== row.id));
    toast.success("تم حذف المصروف");
  }

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="إدارة المصاريف"
        description="جدول منفصل للمصاريف العامة وجدول منفصل لمصاريف شراء البضاعة."
      >
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
          إضافة مصروف
        </Button>
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي المصاريف</p>
            <p className="text-3xl font-bold text-slate-900">{totals.totalExpenses}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-yellow-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">مصاريف شراء البضاعة</p>
            <p className="text-3xl font-bold text-yellow-600">{totals.purchaseExpenses}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي القيمة</p>
            <p className="text-3xl font-bold text-emerald-700">{totals.totalValue.toLocaleString()}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="فلترة المصاريف" description="فلترة حسب التاريخ، ونوع المصروف الدوري للمصاريف العامة." />
        <DynamicCard.Content className="pt-4">
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-3">
            <input
              type="date"
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <input
              type="date"
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
            {generalFilterVisible ? (
              <select
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                value={generalPeriodFilter}
                onChange={(event) => setGeneralPeriodFilter(event.target.value as "all" | GeneralExpensePeriod)}
              >
                <option value="all">كل الأنواع الدورية</option>
                <option value="daily">يومي</option>
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
              </select>
            ) : (
              <div className="flex h-10 items-center rounded-lg border border-dashed border-slate-300 px-3 text-xs text-slate-500">
                فلترة النوع الدوري تظهر فقط عند المصاريف العامة
              </div>
            )}
          </div>
        </DynamicCard.Content>
      </DynamicCard>

      <DynamicCard>
        <DynamicCard.Header title="جدول المصاريف العامة" description="عرض مصاريف النوع العام فقط." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={generalColumns}
            data={filteredGeneralRows}
            dir="rtl"
            pageSize={8}
            totalCount={filteredGeneralRows.length}
            currentPage={pageGeneral}
            onPageChange={setPageGeneral}
            title="المصاريف العامة"
            getRowSearchText={(row) => `${row.general?.expenseName ?? ""} ${row.general?.notes ?? ""} ${row.date}`}
          />
        </DynamicCard.Content>
      </DynamicCard>

      <DynamicCard>
        <DynamicCard.Header title="جدول شراء البضاعة" description="عرض مصاريف شراء المنتجات فقط." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={purchaseColumns}
            data={filteredPurchaseRows}
            dir="rtl"
            pageSize={8}
            totalCount={filteredPurchaseRows.length}
            currentPage={pagePurchase}
            onPageChange={setPagePurchase}
            title="شراء البضاعة"
            getRowSearchText={(row) => `${row.purchase?.supplierName ?? ""} ${row.purchase?.city ?? ""} ${row.purchase?.notes ?? ""} ${row.date}`}
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "تعديل المصروف" : "إضافة مصروف"}
        size="xl"
        footer={
          <>
            <Button onClick={handleSave}>{editingId ? "حفظ التعديل" : "إضافة"}</Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={formState.type}
              onChange={(event) => {
                const nextType = event.target.value as ExpenseType;
                setFormState((prev) => ({ ...prev, type: nextType }));
                setGeneralFilterVisible(nextType === "general");
              }}
            >
              <option value="general">مصروف عام</option>
              <option value="purchase">شراء بضاعة</option>
            </select>
            <input
              type="date"
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={formState.date}
              onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>

          {formState.type === "general" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="اسم المصروف"
                value={formState.expenseName}
                onChange={(event) => setFormState((prev) => ({ ...prev, expenseName: event.target.value }))}
              />
              <input
                type="number"
                min={1}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="كمية المصروف"
                value={formState.expenseQuantity}
                onChange={(event) => setFormState((prev) => ({ ...prev, expenseQuantity: event.target.value }))}
              />
              <input
                type="number"
                min={0}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="سعر المصروف"
                value={formState.expensePrice}
                onChange={(event) => setFormState((prev) => ({ ...prev, expensePrice: event.target.value }))}
              />
              <select
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                value={formState.generalPeriod}
                onChange={(event) => setFormState((prev) => ({ ...prev, generalPeriod: event.target.value as GeneralExpensePeriod }))}
              >
                <option value="daily">يومي</option>
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
              </select>
              <textarea
                className="min-h-[100px] rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                placeholder="ملاحظات"
                value={formState.generalNotes}
                onChange={(event) => setFormState((prev) => ({ ...prev, generalNotes: event.target.value }))}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">بيانات شراء البضاعة</p>
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  placeholder="اسم المورد"
                  value={formState.supplierName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, supplierName: event.target.value }))}
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <select
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    value={formState.country}
                    onChange={(event) => setFormState((prev) => ({ ...prev, country: event.target.value }))}
                  >
                    {countryOptions.map((country) => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder="المدينة"
                    value={formState.city}
                    onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))}
                  />
                </div>

                <select
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  value={formState.paymentMethod}
                  onChange={(event) => setFormState((prev) => ({ ...prev, paymentMethod: event.target.value as PurchasePaymentMethod }))}
                >
                  <option value="bank_transfer">بنكي</option>
                  <option value="cod">عند الاستلام</option>
                  <option value="other">طرق أخرى</option>
                </select>

                {formState.paymentMethod === "other" ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      type="number"
                      min={0}
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="المبلغ المدفوع"
                      value={formState.paidAmount}
                      onChange={(event) => setFormState((prev) => ({ ...prev, paidAmount: event.target.value }))}
                    />
                    <input
                      type="number"
                      className="h-10 rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm"
                      value={remainingAmountAuto}
                      readOnly
                    />
                  </div>
                ) : null}

                <select
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  value={formState.shippingCompanyId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, shippingCompanyId: event.target.value }))}
                >
                  <option value="">شركة الشحن (اختياري)</option>
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
                  placeholder="مصروف الشحن (اختياري - 0 افتراضي)"
                  value={formState.shippingCost}
                  onChange={(event) => setFormState((prev) => ({ ...prev, shippingCost: event.target.value }))}
                />

                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>المجموع الفرعي</span>
                    <span>{purchaseSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>الخصم</span>
                    <input
                      type="number"
                      min={0}
                      className="h-8 w-28 rounded-lg border border-slate-200 px-2 text-sm"
                      value={formState.discountAmount}
                      onChange={(event) => setFormState((prev) => ({ ...prev, discountAmount: event.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>الشحن</span>
                    <span>{shippingCostResolved.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 text-base font-bold">
                    <div className="flex items-center justify-between">
                      <span>إجمالي الفاتورة</span>
                      <span>{(purchaseTotal + shippingCostResolved).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <textarea
                  className="min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="ملاحظات عامة"
                  value={formState.purchaseNotes}
                  onChange={(event) => setFormState((prev) => ({ ...prev, purchaseNotes: event.target.value }))}
                />
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">اختيار المنتجات المشتراة (POS)</p>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {catalogProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.sku}</p>
                        <p className="text-xs text-emerald-700">{product.price.toLocaleString()}</p>
                      </div>
                      <Button size="sm" onClick={() => addPurchaseProduct(product)}>
                        <ShoppingCart className="h-4 w-4" />
                        إضافة
                      </Button>
                    </div>
                  ))}
                </div>

                {formState.items.length === 0 ? (
                  <p className="text-sm text-slate-500">لم يتم اختيار منتجات بعد.</p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {formState.items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.sku}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePurchaseItem(item.id)}
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
                            onChange={(event) => updatePurchaseItemQuantity(item.id, Number(event.target.value))}
                          />
                          <p className="text-sm text-slate-600">{item.price.toLocaleString()}</p>
                          <p className="text-left text-sm font-semibold text-emerald-700">
                            {(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </AppModal>

      <AppModal
        isOpen={detailsExpense !== null}
        onClose={() => setDetailsExpenseId(null)}
        title={detailsExpense ? `تفاصيل فاتورة شراء البضاعة - ${detailsExpense.id}` : "تفاصيل فاتورة الشراء"}
        size="xl"
        footer={<Button variant="outline" onClick={() => setDetailsExpenseId(null)}>إغلاق</Button>}
      >
        {detailsExpense?.purchase ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
              <p>اسم المورد: <span className="font-semibold">{detailsExpense.purchase.supplierName}</span></p>
              <p>طريقة الدفع: <span className="font-semibold">{purchasePaymentMethodLabel[detailsExpense.purchase.paymentMethod]}</span></p>
              <p>المدينة: <span className="font-semibold">{detailsExpense.purchase.city}</span></p>
              <p>البلد: <span className="font-semibold">{countryOptions.find((country) => country.value === detailsExpense.purchase?.country)?.label ?? detailsExpense.purchase.country}</span></p>
              <p>المبلغ المدفوع: <span className="font-semibold">{detailsExpense.purchase.paidAmount.toLocaleString()}</span></p>
              <p>المبلغ المتبقي: <span className="font-semibold">{detailsExpense.purchase.remainingAmount.toLocaleString()}</span></p>
              <p>شركة الشحن: <span className="font-semibold">{detailsExpense.purchase.shippingCompanyName || "غير محددة"}</span></p>
              <p>مصروف الشحن: <span className="font-semibold">{detailsExpense.purchase.shippingCost.toLocaleString()}</span></p>
              <p>الخصم: <span className="font-semibold">{detailsExpense.purchase.discountAmount.toLocaleString()}</span></p>
              <p>إجمالي الفاتورة: <span className="font-semibold text-emerald-700">{detailsExpense.totalAmount.toLocaleString()}</span></p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">ملاحظات عامة</p>
              <p className="text-sm text-slate-600">{detailsExpense.purchase.notes || "لا توجد ملاحظات"}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">المنتجات المشتراة</p>
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
                    {(detailsExpense.purchase.items ?? []).map((item) => (
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
            </div>
          </div>
        ) : null}
      </AppModal>
    </section>
  );
}
