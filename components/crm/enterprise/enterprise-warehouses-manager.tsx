"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";

interface WarehouseRecord {
  id: string;
  name: string;
  country: string;
  notes: string;
  createdAt: string;
}

interface WarehouseFormState {
  name: string;
  country: string;
  notes: string;
}

const WAREHOUSES_STORAGE_KEY = "crm-enterprise-warehouses";

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
  const [rows, setRows] = useState<WarehouseRecord[]>(initialWarehouses);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<WarehouseFormState>(initialFormState);

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

  const columns = useMemo<Column<WarehouseRecord>[]>(
    () => [
      { header: "اسم المخزن", accessor: "name" },
      {
        header: "بلد المخزن",
        accessor: (row) => countryOptions.find((country) => country.value === row.country)?.label ?? row.country,
      },
      { header: "الملاحظات", accessor: (row) => row.notes || "-" },
      { header: "التاريخ", accessor: "createdAt" },
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
   * Opens create modal with empty fields.
   */
  function openCreateModal() {
    setEditingId(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  }

  /**
   * Opens edit modal with existing record data.
   */
  function openEditModal(row: WarehouseRecord) {
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
    if (!formState.name.trim()) {
      toast.error("اسم المخزن مطلوب");
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
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
          إضافة مخزن
        </Button>
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
            placeholder="اسم المخزن"
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
            placeholder="الملاحظات"
            value={formState.notes}
            onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </div>
      </AppModal>
    </section>
  );
}
