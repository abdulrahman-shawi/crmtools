"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import {
  GENERAL_SETTINGS_UPDATED_EVENT,
  getColumnLabel,
  getFieldLabel,
  isColumnVisible,
  isFieldRequired,
  isFieldVisible,
  readGeneralPageSettings,
  type GeneralPageRule,
} from "@/lib/crm-general-settings";

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
  replacementReturnedProductName?: string;
  replacementNewProductName?: string;
  returnedQuantity: number;
  reason: string;
  customer: string;
  stage: ReturnStage;
  stageNotes: Record<ReturnStage, string>;
  createdAt: string;
}

interface ReturnFormState {
  returnType: ReturnType;
  productId: string;
  productName: string;
  replacementNewProductName: string;
  replacementReturnedProductName: string;
  returnedQuantity: string;
  reason: string;
  customer: string;
  stage: ReturnStage;
  stageNotes: Record<ReturnStage, string>;
}

const RETURNS_STORAGE_KEY = "crm-enterprise-returns";
const CATALOG_STORAGE_KEY = "crm-enterprise-products-catalog";

/**
 * Creates empty note map for all return stages.
 */
function createEmptyStageNotes(): Record<ReturnStage, string> {
  return {
    received: "",
    inspection: "",
    maintenance: "",
    delivered: "",
  };
}

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
    stageNotes: {
      received: "تم استلام القطعة من العميل.",
      inspection: "تم اكتشاف خلل في اللوحة.",
      maintenance: "",
      delivered: "",
    },
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
    stageNotes: {
      received: "تمت مطابقة فاتورة الشراء.",
      inspection: "",
      maintenance: "",
      delivered: "",
    },
    createdAt: "2026-03-24",
  },
];

/**
 * Builds a fresh form state object.
 */
function createInitialFormState(): ReturnFormState {
  return {
    returnType: "refund",
    productId: "",
    productName: "",
    replacementNewProductName: "",
    replacementReturnedProductName: "",
    returnedQuantity: "",
    reason: "",
    customer: "",
    stage: "received",
    stageNotes: createEmptyStageNotes(),
  };
}

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
 * Calculates stage progress based on return type workflow.
 */
function getStageProgress(type: ReturnType, stage: ReturnStage): { currentStep: number; totalSteps: number; percent: number } {
  const stages = getStageOptions(type);
  const index = Math.max(stages.indexOf(stage), 0);
  const currentStep = index + 1;
  const totalSteps = stages.length;
  const percent = Math.round((currentStep / totalSteps) * 100);

  return {
    currentStep,
    totalSteps,
    percent,
  };
}

/**
 * Converts row fields to searchable text.
 */
function toSearchText(row: ReturnRecord): string {
  const notesText = Object.values(row.stageNotes ?? {}).join(" ");
  return `${row.productName} ${row.customer} ${row.reason} ${row.replacementReturnedProductName ?? ""} ${row.replacementNewProductName ?? ""} ${notesText} ${returnTypeLabel[row.returnType]} ${returnStageLabel[row.stage]} ${row.createdAt}`;
}

/**
 * Manages CRM enterprise returns with dynamic workflow stages.
 */
export function EnterpriseReturnsManager() {
  const { user } = useAuth();

  // Permission checks
  const canView = can(user, RBAC_PERMISSIONS.returnsView);
  const canCreate = can(user, RBAC_PERMISSIONS.returnsCreate);
  const canEdit = can(user, RBAC_PERMISSIONS.returnsEdit);
  const canDelete = can(user, RBAC_PERMISSIONS.returnsDelete);

  const [rows, setRows] = useState<ReturnRecord[]>(initialReturns);
  const [products, setProducts] = useState<ProductCatalogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ReturnFormState>(createInitialFormState);
  const [pageSettings, setPageSettings] = useState<GeneralPageRule | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [replacementNewSearchQuery, setReplacementNewSearchQuery] = useState("");
  const [showReplacementNewDropdown, setShowReplacementNewDropdown] = useState(false);

  useEffect(() => {
    const applySettings = () => {
      setPageSettings(readGeneralPageSettings("returns"));
    };

    applySettings();
    window.addEventListener("storage", applySettings);
    window.addEventListener(GENERAL_SETTINGS_UPDATED_EVENT, applySettings);

    return () => {
      window.removeEventListener("storage", applySettings);
      window.removeEventListener(GENERAL_SETTINGS_UPDATED_EVENT, applySettings);
    };
  }, []);

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
        const normalized = parsed.map((row) => ({
          ...row,
          stageNotes: {
            ...createEmptyStageNotes(),
            ...(row.stageNotes ?? {}),
          },
        }));
        setRows(normalized);
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

  const filteredReplacementNewProducts = useMemo(() => {
    const query = replacementNewSearchQuery.trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const name = String(product.productName ?? "").toLowerCase();
      const category = String(product.categoryName ?? "").toLowerCase();
      return name.includes(query) || category.includes(query);
    });
  }, [products, replacementNewSearchQuery]);

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
    () => {
      const baseColumns: Array<Column<ReturnRecord> & { keyName: string }> = [
      {
        keyName: "returnType",
        header: getColumnLabel(pageSettings, "returnType", "نوع المرتجع"),
        accessor: (row) => returnTypeLabel[row.returnType],
      },
      { keyName: "productName", header: getColumnLabel(pageSettings, "productName", "المنتج"), accessor: "productName" },
      { keyName: "returnedQuantity", header: getColumnLabel(pageSettings, "returnedQuantity", "الكمية المرتجعة"), accessor: "returnedQuantity" },
      { keyName: "reason", header: getColumnLabel(pageSettings, "reason", "سبب المرتجع"), accessor: "reason" },
      { keyName: "customer", header: getColumnLabel(pageSettings, "customer", "العميل"), accessor: "customer" },
      {
        keyName: "stage",
        header: getColumnLabel(pageSettings, "stage", "مرحلة المرتجع"),
        accessor: (row) => {
          const progress = getStageProgress(row.returnType, row.stage);

          return (
            <div className="min-w-[190px] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">{returnStageLabel[row.stage]}</span>
                <span className="text-slate-500">
                  {progress.currentStep}/{progress.totalSteps}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        keyName: "stageNote",
        header: getColumnLabel(pageSettings, "stageNote", "ملاحظة المرحلة الحالية"),
        accessor: (row) => (
          <div className="flex min-w-[220px] items-center justify-between gap-2">
            <p className="line-clamp-2 text-xs text-slate-700">{row.stageNotes?.[row.stage] || "-"}</p>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => handleQuickEditCurrentStageNote(row)}
            >
              تعديل سريع
            </button>
          </div>
        ),
      },
      {
        keyName: "actions",
        header: "الإجراءات",
        accessor: (row) => (
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={() => openEditModal(row)}
                className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
                title="تعديل"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(row)}
                className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                title="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ];

      if (!pageSettings) {
        return baseColumns.map(({ keyName: _keyName, ...column }) => column);
      }

      return baseColumns
        .filter((column) => column.keyName === "actions" || isColumnVisible(pageSettings, column.keyName))
        .map(({ keyName: _keyName, ...column }) => column);
    },
    [canEdit, canDelete, pageSettings]
  );

  /**
   * Opens create modal and resets form state.
   */
  function openCreateModal() {
    if (!canCreate) {
      toast.error("ليس لديك صلاحية لإضافة مرتجع");
      return;
    }

    setEditingId(null);
    setFormState(createInitialFormState());
    setProductSearchQuery("");
    setShowProductDropdown(false);
    setReplacementNewSearchQuery("");
    setShowReplacementNewDropdown(false);
    setIsModalOpen(true);
  }

  /**
   * Opens edit modal and preloads selected row.
   */
  function openEditModal(row: ReturnRecord) {
    if (!canEdit) {
      toast.error("ليس لديك صلاحية لتعديل المرتجعات");
      return;
    }

    setEditingId(row.id);
    setFormState({
      returnType: row.returnType,
      productId: row.productId,
      productName: row.productName,
      replacementNewProductName: row.replacementNewProductName ?? "",
      replacementReturnedProductName: row.replacementReturnedProductName ?? "",
      returnedQuantity: String(row.returnedQuantity),
      reason: row.reason,
      customer: row.customer,
      stage: row.stage,
      stageNotes: {
        ...createEmptyStageNotes(),
        ...(row.stageNotes ?? {}),
      },
    });
    setProductSearchQuery("");
    setShowProductDropdown(false);
    setReplacementNewSearchQuery("");
    setShowReplacementNewDropdown(false);
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
   * Selects replacement new product and hides search list.
   */
  function handleSelectReplacementNewProduct(product: ProductCatalogEntry) {
    setFormState((prev) => ({
      ...prev,
      replacementNewProductName: String(product.productName ?? ""),
    }));
    setReplacementNewSearchQuery("");
    setShowReplacementNewDropdown(false);
  }

  /**
   * Validates and persists return record.
   */
  function handleSave() {
    if (isFieldRequired(pageSettings, "productName") && (!formState.productId || !formState.productName)) {
      toast.error("اختيار المنتج مطلوب");
      return;
    }

    const returnedQuantity = Number(formState.returnedQuantity || 0);
    if (Number.isNaN(returnedQuantity) || returnedQuantity <= 0) {
      toast.error("الكمية المرتجعة غير صحيحة");
      return;
    }

    if (isFieldRequired(pageSettings, "reason") && !formState.reason.trim()) {
      toast.error("سبب المرتجع مطلوب");
      return;
    }

    if (isFieldRequired(pageSettings, "customer") && !formState.customer.trim()) {
      toast.error("اسم العميل مطلوب");
      return;
    }

    if (formState.returnType === "replacement") {
      if (!formState.replacementNewProductName.trim()) {
        toast.error("المنتج المبدل مطلوب في حالة التبديل");
        return;
      }
    }

    const payload: ReturnRecord = {
      id: editingId ?? `ret_${Date.now()}`,
      returnType: formState.returnType,
      productId: formState.productId,
      productName: formState.productName,
      replacementReturnedProductName:
        formState.returnType === "replacement" ? formState.productName : undefined,
      replacementNewProductName:
        formState.returnType === "replacement" ? formState.replacementNewProductName.trim() : undefined,
      returnedQuantity,
      reason: formState.reason.trim(),
      customer: formState.customer.trim(),
      stage: formState.stage,
      stageNotes: {
        ...createEmptyStageNotes(),
        ...formState.stageNotes,
      },
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
    setFormState(createInitialFormState());
    setProductSearchQuery("");
    setShowProductDropdown(false);
    setReplacementNewSearchQuery("");
    setShowReplacementNewDropdown(false);
  }

  /**
   * Deletes a selected return row after confirmation.
   */
  function handleDelete(row: ReturnRecord) {
    if (!canDelete) {
      toast.error("ليس لديك صلاحية لحذف المرتجعات");
      return;
    }

    const confirmed = window.confirm("هل تريد حذف هذا المرتجع؟");
    if (!confirmed) {
      return;
    }

    setRows((prev) => prev.filter((item) => item.id !== row.id));
    toast.success("تم حذف المرتجع");
  }

  /**
   * Edits current stage note directly from table without opening modal.
   */
  function handleQuickEditCurrentStageNote(row: ReturnRecord) {
    const currentNote = row.stageNotes?.[row.stage] ?? "";
    const nextNote = window.prompt(`ملاحظة مرحلة ${returnStageLabel[row.stage]}`, currentNote);

    if (nextNote === null) {
      return;
    }

    setRows((prev) =>
      prev.map((item) => {
        if (item.id !== row.id) {
          return item;
        }

        return {
          ...item,
          stageNotes: {
            ...createEmptyStageNotes(),
            ...item.stageNotes,
            [row.stage]: nextNote.trim(),
          },
        };
      })
    );

    toast.success("تم تحديث ملاحظة المرحلة");
  }

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="إدارة المرتجعات"
        description="نوع المرتجع، العميل، المنتج، الكمية، السبب ومراحل المعالجة. في التالف: اكتشاف الخطأ ثم تصليحه."
      >
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            إضافة مرتجع
          </Button>
        )}
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
        description="رتب إدخال البيانات: نوع المرتجع، العميل، المنتج، الكمية، ثم السبب والمرحلة."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {isFieldVisible(pageSettings, "returnType") && (
            <div className="space-y-2 md:col-span-2">
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
          )}
          {isFieldVisible(pageSettings, "customer") && (
            <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">اسم العميل</label>
            <input
              type="text"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              value={formState.customer}
              onChange={(event) => setFormState((prev) => ({ ...prev, customer: event.target.value }))}
              placeholder={getFieldLabel(pageSettings, "customer", "اسم العميل")}
            />
          </div>
          )}

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

          {isFieldVisible(pageSettings, "returnedQuantity") && (
            <div className="space-y-2 md:col-span-2">
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
          )}

          {formState.returnType === "replacement" && (
            <>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">المنتج المرتجع</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {formState.productName || "اختر المنتج الأساسي من حقل اختيار المنتج بالأعلى"}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">المنتج المبدل</label>
                {!formState.replacementNewProductName ? (
                  <div className="relative">
                    <input
                      type="text"
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="ابحث عن المنتج المبدل..."
                      value={replacementNewSearchQuery}
                      onChange={(event) => {
                        setReplacementNewSearchQuery(event.target.value);
                        setShowReplacementNewDropdown(true);
                      }}
                      onFocus={() => setShowReplacementNewDropdown(true)}
                    />

                    {showReplacementNewDropdown && (
                      <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {filteredReplacementNewProducts.length > 0 ? (
                          filteredReplacementNewProducts.map((product) => (
                            <button
                              key={`new_${product.id}`}
                              type="button"
                              className="block w-full border-b border-slate-100 px-3 py-2 text-right text-sm hover:bg-slate-50"
                              onClick={() => handleSelectReplacementNewProduct(product)}
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
                    <p className="text-sm font-medium text-emerald-800">{formState.replacementNewProductName}</p>
                    <button
                      type="button"
                      className="text-sm text-emerald-700 hover:underline"
                      onClick={() => {
                        setFormState((prev) => ({ ...prev, replacementNewProductName: "" }));
                        setReplacementNewSearchQuery("");
                        setShowReplacementNewDropdown(true);
                      }}
                    >
                      تغيير المنتج
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {isFieldVisible(pageSettings, "reason") && (
            <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">سبب المرتجع</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={formState.reason}
              onChange={(event) => setFormState((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder={getFieldLabel(pageSettings, "reason", "اكتب سبب المرتجع...")}
            />
          </div>
          )}

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

          <div className="space-y-3 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">ملاحظات كل مرحلة</label>
            <div className="grid gap-3 md:grid-cols-2">
              {getStageOptions(formState.returnType).map((stageValue) => (
                <div key={`note_${stageValue}`} className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">{returnStageLabel[stageValue]}</p>
                  <textarea
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder={`اكتب ملاحظة مرحلة ${returnStageLabel[stageValue]}...`}
                    value={formState.stageNotes[stageValue]}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        stageNotes: {
                          ...prev.stageNotes,
                          [stageValue]: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
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
