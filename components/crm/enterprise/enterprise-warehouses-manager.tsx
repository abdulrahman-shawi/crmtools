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
  readGeneralPageSettings,
  type GeneralPageRule,
} from "@/lib/crm-general-settings";

interface WarehouseRecord {
  id: string;
  name: string;
  country: string;
  notes: string;
  createdAt: string;
}

interface WarehouseAllocationReportItem {
  warehouseId: string;
  quantity: number;
}

interface ProductCatalogForReport {
  id: string;
  type: "product" | "category";
  productName?: string;
  wholesalePrice?: number;
  warehouseAllocations?: WarehouseAllocationReportItem[];
  categoryWarehouseId?: string;
}

interface WarehouseInventoryReportRow {
  warehouseId: string;
  warehouseName: string;
  productsCount: number;
  categoriesCount: number;
  totalQuantity: number;
  estimatedValue: number;
}

interface WarehouseFormState {
  name: string;
  country: string;
  notes: string;
}

const WAREHOUSES_STORAGE_KEY = "crm-enterprise-warehouses";
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

const initialWarehouses: WarehouseRecord[] = [
  {
    id: "wh_1",
    name: "مخزن الرياض الرئيسي",
    country: "SA",
    notes: "المخزن الرئيسي للتوزيع داخل المملكة.",
    createdAt: "2026-03-20",
  },
  {
    id: "wh_2",
    name: "مخزن جدة",
    country: "SA",
    notes: "يغطي المنطقة الغربية.",
    createdAt: "2026-03-21",
  },
  {
    id: "wh_3",
    name: "مخزن دبي",
    country: "AE",
    notes: "فرع الإمارات.",
    createdAt: "2026-03-22",
  },
];

const initialFormState: WarehouseFormState = {
  name: "",
  country: "SA",
  notes: "",
};

/**
 * Converts row values into searchable text.
 */
function toSearchText(row: WarehouseRecord): string {
  return `${row.name} ${row.country} ${row.notes} ${row.createdAt}`;
}

/**
 * Manages warehouses CRUD with local persistence.
 */
export function EnterpriseWarehousesManager() {
  const { user } = useAuth();

  // Permission checks
  const canCreate = can(user, RBAC_PERMISSIONS.warehousesCreate);
  const canEdit = can(user, RBAC_PERMISSIONS.warehousesEdit);
  const canDelete = can(user, RBAC_PERMISSIONS.warehousesDelete);

  const [rows, setRows] = useState<WarehouseRecord[]>(initialWarehouses);
  const [catalogRows, setCatalogRows] = useState<ProductCatalogForReport[]>([]);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<WarehouseFormState>(initialFormState);
  const [pageSettings, setPageSettings] = useState<GeneralPageRule | null>(null);

  useEffect(() => {
    const applySettings = () => {
      setPageSettings(readGeneralPageSettings("warehouses"));
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
      const raw = window.localStorage.getItem(WAREHOUSES_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as WarehouseRecord[];
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

    /**
     * Loads products catalog rows from localStorage for stock report.
     */
    function loadCatalogRows() {
      try {
        const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY);
        if (!raw) {
          setCatalogRows([]);
          return;
        }

        const parsed = JSON.parse(raw) as ProductCatalogForReport[];
        setCatalogRows(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCatalogRows([]);
      }
    }

    loadCatalogRows();

    const onStorage = (event: StorageEvent) => {
      if (event.key === CATALOG_STORAGE_KEY) {
        loadCatalogRows();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(WAREHOUSES_STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const totals = useMemo(() => {
    const totalWarehouses = rows.length;
    const countriesCount = new Set(rows.map((row) => row.country)).size;

    return {
      totalWarehouses,
      countriesCount,
    };
  }, [rows]);

  const warehouseInventoryReport = useMemo<WarehouseInventoryReportRow[]>(() => {
    return rows.map((warehouse) => {
      const relatedProducts = catalogRows.filter(
        (row) => row.type === "product" && row.warehouseAllocations?.some((allocation) => allocation.warehouseId === warehouse.id)
      );

      const relatedCategories = catalogRows.filter(
        (row) => row.type === "category" && row.categoryWarehouseId === warehouse.id
      );

      const totalQuantity = relatedProducts.reduce((sum, product) => {
        const quantityInWarehouse = (product.warehouseAllocations ?? [])
          .filter((allocation) => allocation.warehouseId === warehouse.id)
          .reduce((innerSum, allocation) => innerSum + allocation.quantity, 0);

        return sum + quantityInWarehouse;
      }, 0);

      const estimatedValue = relatedProducts.reduce((sum, product) => {
        const quantityInWarehouse = (product.warehouseAllocations ?? [])
          .filter((allocation) => allocation.warehouseId === warehouse.id)
          .reduce((innerSum, allocation) => innerSum + allocation.quantity, 0);

        return sum + quantityInWarehouse * Number(product.wholesalePrice ?? 0);
      }, 0);

      return {
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        productsCount: relatedProducts.length,
        categoriesCount: relatedCategories.length,
        totalQuantity,
        estimatedValue,
      };
    });
  }, [rows, catalogRows]);

  const columns = useMemo<Column<WarehouseRecord>[]>(
    () => {
      const baseColumns: Array<Column<WarehouseRecord> & { keyName: string }> = [
      { keyName: "name", header: getColumnLabel(pageSettings, "name", "اسم المخزن"), accessor: "name" },
      {
        keyName: "country",
        header: getColumnLabel(pageSettings, "country", "بلد المخزن"),
        accessor: (row) => countryOptions.find((country) => country.value === row.country)?.label ?? row.country,
      },
      { keyName: "notes", header: getColumnLabel(pageSettings, "notes", "الملاحظات"), accessor: (row) => row.notes || "-" },
      { keyName: "createdAt", header: getColumnLabel(pageSettings, "createdAt", "التاريخ"), accessor: "createdAt" },
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
   * Opens create modal with empty fields.
   */
  function openCreateModal() {
    if (!canCreate) {
      toast.error("ليس لديك صلاحية لإضافة مخزن");
      return;
    }

    setEditingId(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  }

  /**
   * Opens edit modal with existing record data.
   */
  function openEditModal(row: WarehouseRecord) {
    if (!canEdit) {
      toast.error("ليس لديك صلاحية لتعديل المخازن");
      return;
    }
    setEditingId(row.id);
    setFormState({
      name: row.name,
      country: row.country,
      notes: row.notes,
    });
    setIsModalOpen(true);
  }

  /**
   * Validates and saves warehouse record.
   */
  function handleSave() {
    if (isFieldRequired(pageSettings, "name") && !formState.name.trim()) {
      toast.error("اسم المخزن مطلوب");
      return;
    }

    if (isFieldRequired(pageSettings, "country") && !formState.country.trim()) {
      toast.error("بلد المخزن مطلوب");
      return;
    }

    const payload: WarehouseRecord = {
      id: editingId ?? `wh_${Date.now()}`,
      name: formState.name.trim(),
      country: formState.country,
      notes: formState.notes.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    if (editingId) {
      setRows((prev) => prev.map((row) => (row.id === editingId ? { ...row, ...payload, createdAt: row.createdAt } : row)));
      toast.success("تم تعديل المخزن");
    } else {
      setRows((prev) => [payload, ...prev]);
      toast.success("تمت إضافة المخزن");
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormState(initialFormState);
  }

  /**
   * Deletes warehouse record after confirmation.
   */
  function handleDelete(row: WarehouseRecord) {
    if (!canDelete) {
      toast.error("ليس لديك صلاحية لحذف المخازن");
      return;
    }

    const confirmed = window.confirm("هل تريد حذف هذا المخزن؟");
    if (!confirmed) {
      return;
    }

    setRows((prev) => prev.filter((item) => item.id !== row.id));
    toast.success("تم حذف المخزن");
  }

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="إدارة المستودعات"
        description="يمكنك إدارة المخازن وربطها بالمنتجات عبر بلد المخزن والملاحظات."
      >
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            إضافة مخزن
          </Button>
        )}
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">عدد المخازن</p>
            <p className="text-3xl font-bold text-slate-900">{totals.totalWarehouses}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">عدد الدول</p>
            <p className="text-3xl font-bold text-emerald-600">{totals.countriesCount}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="تقرير مخزون مجمع حسب كل مستودع" description="ملخص الكميات والقيمة التقديرية وعدد المنتجات بكل مستودع." />
        <DynamicCard.Content className="pt-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-right font-semibold text-slate-700">المستودع</th>
                  <th className="p-3 text-right font-semibold text-slate-700">عدد المنتجات</th>
                  <th className="p-3 text-right font-semibold text-slate-700">عدد التصنيفات</th>
                  <th className="p-3 text-right font-semibold text-slate-700">إجمالي الكمية</th>
                  <th className="p-3 text-right font-semibold text-slate-700">القيمة التقديرية</th>
                </tr>
              </thead>
              <tbody>
                {warehouseInventoryReport.map((reportRow) => (
                  <tr key={reportRow.warehouseId} className="border-t border-slate-100">
                    <td className="p-3 text-slate-800">{reportRow.warehouseName}</td>
                    <td className="p-3 text-slate-700">{reportRow.productsCount}</td>
                    <td className="p-3 text-slate-700">{reportRow.categoriesCount}</td>
                    <td className="p-3 text-slate-700">{reportRow.totalQuantity.toLocaleString()}</td>
                    <td className="p-3 font-semibold text-emerald-700">{reportRow.estimatedValue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DynamicCard.Content>
      </DynamicCard>

      <DynamicCard>
        <DynamicCard.Header title="قائمة المخازن" description="بحث وتعديل وحذف مخازن النظام." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={columns}
            data={rows}
            dir="rtl"
            pageSize={8}
            totalCount={rows.length}
            currentPage={page}
            onPageChange={setPage}
            title="المستودعات"
            getRowSearchText={toSearchText}
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "تعديل مخزن" : "إضافة مخزن"}
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
        <div className="grid grid-cols-1 gap-3">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder={getFieldLabel(pageSettings, "name", "اسم المخزن")}
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
          />
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
          <textarea
            className="min-h-[100px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder={getFieldLabel(pageSettings, "notes", "ملاحظات")}
            value={formState.notes}
            onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </div>
      </AppModal>
    </section>
  );
}
