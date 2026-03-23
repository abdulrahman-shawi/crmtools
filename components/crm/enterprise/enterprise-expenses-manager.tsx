"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";

type ExpenseType = "general" | "purchase";

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

interface GeneralExpenseDetails {
  expenseName: string;
  expenseQuantity: number;
  notes: string;
}

interface PurchaseExpenseDetails {
  supplierName: string;
  country: string;
  city: string;
  discountAmount: number;
  notes: string;
  items: PurchaseItem[];
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
  generalNotes: string;
  supplierName: string;
  country: string;
  city: string;
  discountAmount: string;
  purchaseNotes: string;
  items: PurchaseItem[];
}

interface ProductCatalogStorageRow {
  id: string;
  type: "product" | "category";
  productName?: string;
  price?: number;
}

const EXPENSES_STORAGE_KEY = "crm-enterprise-expenses";
const CATALOG_STORAGE_KEY = "crm-enterprise-products-catalog";

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

const initialExpenses: ExpenseRecord[] = [
  {
    id: "exp_1",
    type: "general",
    date: "2026-03-23",
    totalAmount: 0,
    general: {
      expenseName: "مستلزمات مكتبية",
      expenseQuantity: 10,
      notes: "شراء ورق وطباعة",
    },
    purchase: null,
  },
];

const initialFormState: ExpenseFormState = {
  type: "general",
  date: new Date().toISOString().slice(0, 10),
  expenseName: "",
  expenseQuantity: "",
  generalNotes: "",
  supplierName: "",
  country: "SA",
  city: "",
  discountAmount: "0",
  purchaseNotes: "",
  items: [],
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
 * Maps product rows from products catalog storage into POS product list.
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
 * Expense manager with conditional form based on expense type.
 */
export function EnterpriseExpensesManager() {
  const [rows, setRows] = useState<ExpenseRecord[]>(initialExpenses);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(fallbackProducts);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ExpenseFormState>(initialFormState);

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

  useEffect(() => {
    const storedExpenses = readStorageArray<ExpenseRecord>(EXPENSES_STORAGE_KEY);
    if (storedExpenses.length > 0) {
      setRows(storedExpenses);
    }

    const catalogRows = readStorageArray<ProductCatalogStorageRow>(CATALOG_STORAGE_KEY);
    setCatalogProducts(mapCatalogProducts(catalogRows));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

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

  const columns = useMemo<Column<ExpenseRecord>[]>(
    () => [
      {
        header: "نوع المصروف",
        accessor: (row) => (row.type === "general" ? "مصروف عام" : "شراء بضاعة"),
      },
      {
        header: "التفاصيل",
        accessor: (row) =>
          row.type === "general"
            ? `${row.general?.expenseName ?? "-"} | الكمية: ${row.general?.expenseQuantity ?? 0}`
            : `${row.purchase?.supplierName ?? "-"} | منتجات: ${row.purchase?.items.length ?? 0}`,
      },
      {
        header: "المدينة/البلد",
        accessor: (row) =>
          row.type === "purchase"
            ? `${row.purchase?.city ?? "-"} / ${countryOptions.find((country) => country.value === row.purchase?.country)?.label ?? row.purchase?.country ?? "-"}`
            : "-",
      },
      { header: "التاريخ", accessor: "date" },
      { header: "القيمة", accessor: (row) => row.totalAmount.toLocaleString() },
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

  /**
   * Opens create modal with default state.
   */
  function openCreateModal() {
    setEditingId(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  }

  /**
   * Opens edit modal and maps selected row into form.
   */
  function openEditModal(row: ExpenseRecord) {
    if (row.type === "general") {
      setFormState({
        type: "general",
        date: row.date,
        expenseName: row.general?.expenseName ?? "",
        expenseQuantity: String(row.general?.expenseQuantity ?? ""),
        generalNotes: row.general?.notes ?? "",
        supplierName: "",
        country: "SA",
        city: "",
        discountAmount: "0",
        purchaseNotes: "",
        items: [],
      });
    } else {
      setFormState({
        type: "purchase",
        date: row.date,
        expenseName: "",
        expenseQuantity: "",
        generalNotes: "",
        supplierName: row.purchase?.supplierName ?? "",
        country: row.purchase?.country ?? "SA",
        city: row.purchase?.city ?? "",
        discountAmount: String(row.purchase?.discountAmount ?? 0),
        purchaseNotes: row.purchase?.notes ?? "",
        items: row.purchase?.items ?? [],
      });
    }

    setEditingId(row.id);
    setIsModalOpen(true);
  }

  /**
   * Adds selected product to purchase list or increases quantity.
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
   * Validates and saves expense row.
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

      const payload: ExpenseRecord = {
        id: editingId ?? `exp_${Date.now()}`,
        type: "general",
        date,
        totalAmount: 0,
        general: {
          expenseName: formState.expenseName.trim(),
          expenseQuantity: quantity,
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

      const payload: ExpenseRecord = {
        id: editingId ?? `exp_${Date.now()}`,
        type: "purchase",
        date,
        totalAmount: purchaseTotal,
        general: null,
        purchase: {
          supplierName: formState.supplierName.trim(),
          country: formState.country,
          city: formState.city.trim(),
          discountAmount: purchaseDiscount,
          notes: formState.purchaseNotes.trim(),
          items: formState.items,
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
  }

  /**
   * Deletes expense row after confirmation.
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
        description="اختيار نوع المصروف: مصروف عام أو شراء بضاعة بنظام POS."
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
            <p className="text-sm text-slate-600">إجمالي قيمة المشتريات</p>
            <p className="text-3xl font-bold text-emerald-700">{totals.totalValue.toLocaleString()}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="قائمة المصاريف" description="إدارة المصروفات العامة ومصاريف شراء البضاعة." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={columns}
            data={rows}
            dir="rtl"
            pageSize={8}
            totalCount={rows.length}
            currentPage={page}
            onPageChange={setPage}
            title="المصاريف"
            getRowSearchText={(row) =>
              row.type === "general"
                ? `${row.general?.expenseName ?? ""} ${row.general?.notes ?? ""} ${row.date}`
                : `${row.purchase?.supplierName ?? ""} ${row.purchase?.city ?? ""} ${row.purchase?.notes ?? ""} ${row.purchase?.items.map((item) => item.name).join(" ")}`
            }
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
              onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value as ExpenseType }))}
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
                  <div className="border-t border-slate-200 pt-2 text-base font-bold">
                    <div className="flex items-center justify-between">
                      <span>الإجمالي بعد الخصم</span>
                      <span>{purchaseTotal.toLocaleString()}</span>
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
            </div>
          )}
        </div>
      </AppModal>
    </section>
  );
}
