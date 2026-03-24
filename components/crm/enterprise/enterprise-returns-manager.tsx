"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";

type ReturnType = "damaged" | "replacement" | "refund";
type ReturnStage = "received" | "inspection" | "maintenance" | "delivered";

interface ProductCatalogEntry {
  id: string;
  type: "product" | "category";
  productName?: string;
  categoryName?: string;
  quantity?: number;
}

interface ReturnRecord {
  id: string;
  returnType: ReturnType;
  productId: string;
  productName: string;
  returnedQuantity: number;
  reason: string;
  customer: string;
  stage: ReturnStage;
  createdAt: string;
}

interface ReturnFormState {
  returnType: ReturnType;
  productId: string;
  productName: string;
  returnedQuantity: string;
  reason: string;
  customer: string;
  stage: ReturnStage;
}

const RETURNS_STORAGE_KEY = "crm-enterprise-returns";
const CATALOG_STORAGE_KEY = "crm-enterprise-products-catalog";

const initialReturns: ReturnRecord[] = [
  {
    id: "ret_1",
    returnType: "damaged",
    productId: "pr_1",
    productName: "باقة ERP الأساسية",
    returnedQuantity: 1,
    reason: "عطل في الوحدة الرئيسية",
    customer: "شركة النخبة",
    stage: "inspection",
    createdAt: "2026-03-24",
  },
  {
    id: "ret_2",
    returnType: "refund",
    productId: "pr_2",
    productName: "Analytics Plus",
    returnedQuantity: 2,
    reason: "العميل طلب استرجاع خلال فترة السماح",
    customer: "مؤسسة رواد",
    stage: "received",
    createdAt: "2026-03-24",
  },
];

const initialFormState: ReturnFormState = {
  returnType: "refund",
  productId: "",
  productName: "",
  returnedQuantity: "",
  reason: "",
  customer: "",
  stage: "received",
};

const returnTypeLabel: Record<ReturnType, string> = {
  damaged: "تالف",
  replacement: "تبديل",
  refund: "ترجيع",
};

const returnStageLabel: Record<ReturnStage, string> = {
  received: "التسليم",
  inspection: "الفحص",
  maintenance: "الصيانة",
  delivered: "التسليم النهائي",
};

/**
 * Returns valid workflow stages based on return type.
 * Damaged returns include maintenance stage.
 */
function getStageOptions(type: ReturnType): ReturnStage[] {
  if (type === "damaged") {
    return ["received", "inspection", "maintenance", "delivered"];
  }

  return ["received", "inspection", "delivered"];
}

/**
 * Converts row fields to searchable text.
 */
function toSearchText(row: ReturnRecord): string {
  return `${row.productName} ${row.customer} ${row.reason} ${returnTypeLabel[row.returnType]} ${returnStageLabel[row.stage]} ${row.createdAt}`;
}

/**
 * Manages CRM enterprise returns with dynamic workflow stages.
 */
export function EnterpriseReturnsManager() {
  const [rows, setRows] = useState<ReturnRecord[]>(initialReturns);
  const [products, setProducts] = useState<ProductCatalogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ReturnFormState>(initialFormState);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(RETURNS_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as ReturnRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setRows(parsed);
      }
    } catch {
      // Keep defaults if local data is invalid.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY);
      if (!raw) {
        setProducts([]);
        return;
      }

      const parsed = JSON.parse(raw) as ProductCatalogEntry[];
      if (Array.isArray(parsed)) {
        const onlyProducts = parsed.filter((row) => row.type === "product" && row.productName);
        setProducts(onlyProducts);
      }
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    const validStages = getStageOptions(formState.returnType);
    if (!validStages.includes(formState.stage)) {
      setFormState((prev) => ({ ...prev, stage: validStages[0] }));
    }
  }, [formState.returnType, formState.stage]);

  const filteredProducts = useMemo(() => {
    const query = productSearchQuery.trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const name = String(product.productName ?? "").toLowerCase();
      const category = String(product.categoryName ?? "").toLowerCase();
      return name.includes(query) || category.includes(query);
    });
  }, [products, productSearchQuery]);

  const totals = useMemo(() => {
    const totalReturns = rows.length;
    const damagedReturns = rows.filter((row) => row.returnType === "damaged").length;
    const deliveredReturns = rows.filter((row) => row.stage === "delivered").length;

    return {
      totalReturns,
      damagedReturns,
      deliveredReturns,
    };
  }, [rows]);

  const columns = useMemo<Column<ReturnRecord>[]>(
    () => [
      {
        header: "نوع المرتجع",
        accessor: (row) => returnTypeLabel[row.returnType],
      },
      { header: "المنتج", accessor: "productName" },
      { header: "الكمية المرتجعة", accessor: "returnedQuantity" },
      { header: "سبب المرتجع", accessor: "reason" },
      { header: "العميل", accessor: "customer" },
      {
        header: "مرحلة المرتجع",
        accessor: (row) => returnStageLabel[row.stage],
      },
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
   * Opens create modal and resets form state.
   */
  function openCreateModal() {
    setEditingId(null);
    setFormState(initialFormState);
    setProductSearchQuery("");
    setShowProductDropdown(false);
    setIsModalOpen(true);
  }

  /**
   * Opens edit modal and preloads selected row.
   */
  function openEditModal(row: ReturnRecord) {
    setEditingId(row.id);
    setFormState({
      returnType: row.returnType,
      productId: row.productId,
      productName: row.productName,
      returnedQuantity: String(row.returnedQuantity),
      reason: row.reason,
      customer: row.customer,
      stage: row.stage,
    });
    setProductSearchQuery("");
    setShowProductDropdown(false);
    setIsModalOpen(true);
  }

  /**
   * Selects product from search dropdown and hides list.
   */
  function handleSelectProduct(product: ProductCatalogEntry) {
    setFormState((prev) => ({
      ...prev,
      productId: product.id,
      productName: String(product.productName ?? ""),
    }));
    setProductSearchQuery("");
    setShowProductDropdown(false);
  }

  /**
   * Validates and persists return record.
   */
  function handleSave() {
    if (!formState.productId || !formState.productName) {
      toast.error("اختيار المنتج مطلوب");
      return;
    }

    const returnedQuantity = Number(formState.returnedQuantity || 0);
    if (Number.isNaN(returnedQuantity) || returnedQuantity <= 0) {
      toast.error("الكمية المرتجعة غير صحيحة");
      return;
    }

    if (!formState.reason.trim()) {
      toast.error("سبب المرتجع مطلوب");
      return;
    }

    if (!formState.customer.trim()) {
      toast.error("اسم العميل مطلوب");
      return;
    }

    const payload: ReturnRecord = {
      id: editingId ?? `ret_${Date.now()}`,
      returnType: formState.returnType,
      productId: formState.productId,
      productName: formState.productName,
      returnedQuantity,
      reason: formState.reason.trim(),
      customer: formState.customer.trim(),
      stage: formState.stage,
      createdAt: editingId
        ? rows.find((item) => item.id === editingId)?.createdAt ?? new Date().toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    };

    if (editingId) {
      setRows((prev) => prev.map((row) => (row.id === editingId ? payload : row)));
      toast.success("تم تعديل المرتجع");
    } else {
      setRows((prev) => [payload, ...prev]);
      toast.success("تمت إضافة المرتجع");
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormState(initialFormState);
    setProductSearchQuery("");
    setShowProductDropdown(false);
  }

  /**
   * Deletes a selected return row after confirmation.
   */
  function handleDelete(row: ReturnRecord) {
    const confirmed = window.confirm("هل تريد حذف هذا المرتجع؟");
    if (!confirmed) {
      return;
    }

    setRows((prev) => prev.filter((item) => item.id !== row.id));
    toast.success("تم حذف المرتجع");
  }

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="إدارة المرتجعات"
        description="نوع المرتجع، اختيار المنتج، الكمية، السبب، العميل ومراحل المعالجة حتى التسليم النهائي."
      >
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
          إضافة مرتجع
        </Button>
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي المرتجعات</p>
            <p className="text-3xl font-bold text-slate-900">{totals.totalReturns}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-amber-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">مرتجعات تالف</p>
            <p className="text-3xl font-bold text-amber-600">{totals.damagedReturns}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">تم تسليمها نهائيا</p>
            <p className="text-3xl font-bold text-emerald-600">{totals.deliveredReturns}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="سجل المرتجعات" description="بحث، تعديل وحذف المرتجعات مع متابعة المرحلة الحالية." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={columns}
            data={rows}
            currentPage={page}
            totalCount={rows.length}
            pageSize={10}
            onPageChange={setPage}
            getRowSearchText={toSearchText}
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "تعديل المرتجع" : "إضافة مرتجع"}
        description="أدخل بيانات المرتجع وحدد المرحلة حسب نوعه."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">نوع المرتجع</label>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              value={formState.returnType}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  returnType: event.target.value as ReturnType,
                }))
              }
            >
              <option value="damaged">تالف</option>
              <option value="replacement">تبديل</option>
              <option value="refund">ترجيع</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">الكمية المرتجعة</label>
            <input
              type="number"
              min={1}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              value={formState.returnedQuantity}
              onChange={(event) => setFormState((prev) => ({ ...prev, returnedQuantity: event.target.value }))}
              placeholder="مثال: 2"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">اختيار المنتج</label>

            {!formState.productId ? (
              <div className="relative">
                <input
                  type="text"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  placeholder="ابحث عن المنتج..."
                  value={productSearchQuery}
                  onChange={(event) => {
                    setProductSearchQuery(event.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                />

                {showProductDropdown && (
                  <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="block w-full border-b border-slate-100 px-3 py-2 text-right text-sm hover:bg-slate-50"
                          onClick={() => handleSelectProduct(product)}
                        >
                          <span className="font-medium text-slate-800">{product.productName}</span>
                          <span className="mr-2 text-xs text-slate-500">{product.categoryName}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-slate-500">لا توجد نتائج</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-sm font-medium text-emerald-800">{formState.productName}</p>
                <button
                  type="button"
                  className="text-sm text-emerald-700 hover:underline"
                  onClick={() => {
                    setFormState((prev) => ({ ...prev, productId: "", productName: "" }));
                    setProductSearchQuery("");
                    setShowProductDropdown(true);
                  }}
                >
                  تغيير المنتج
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">سبب المرتجع</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={formState.reason}
              onChange={(event) => setFormState((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="اكتب سبب المرتجع..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">العميل</label>
            <input
              type="text"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              value={formState.customer}
              onChange={(event) => setFormState((prev) => ({ ...prev, customer: event.target.value }))}
              placeholder="اسم العميل"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">مرحلة المرتجع</label>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              value={formState.stage}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  stage: event.target.value as ReturnStage,
                }))
              }
            >
              {getStageOptions(formState.returnType).map((stageValue) => (
                <option key={stageValue} value={stageValue}>
                  {returnStageLabel[stageValue]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave}>{editingId ? "حفظ التعديلات" : "إضافة المرتجع"}</Button>
        </div>
      </AppModal>
    </section>
  );
}
