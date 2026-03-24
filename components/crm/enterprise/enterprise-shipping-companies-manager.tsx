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

interface ShippingCompanyRow {
  id: string;
  company: string;
  serviceLevel: string;
  region: string;
  avgCost: number;
  sla: number;
}

interface ShippingCompanyFormState {
  company: string;
  serviceLevel: string;
  region: string;
  avgCost: string;
  sla: string;
}

const SHIPPING_COMPANIES_STORAGE_KEY = "crm-enterprise-shipping-companies";

const initialRows: ShippingCompanyRow[] = [
  { id: "sh_1", company: "FastShip", serviceLevel: "Express", region: "GCC", avgCost: 22, sla: 2 },
  { id: "sh_2", company: "CargoLink", serviceLevel: "Standard", region: "KSA", avgCost: 12, sla: 4 },
  { id: "sh_3", company: "BlueLogix", serviceLevel: "Economy", region: "MENA", avgCost: 9, sla: 6 },
];

const initialFormState: ShippingCompanyFormState = {
  company: "",
  serviceLevel: "",
  region: "",
  avgCost: "",
  sla: "",
};

/**
 * Converts row values into searchable text.
 */
function toSearchText(row: ShippingCompanyRow): string {
  return `${row.company} ${row.serviceLevel} ${row.region} ${row.avgCost} ${row.sla}`;
}

/**
 * Manages shipping companies with local persistence.
 */
export function EnterpriseShippingCompaniesManager() {
  const { user } = useAuth();

  // Permission checks
  const canCreate = can(user, RBAC_PERMISSIONS.companiesCreate);
  const canEdit = can(user, RBAC_PERMISSIONS.companiesEdit);
  const canDelete = can(user, RBAC_PERMISSIONS.companiesDelete);

  const [rows, setRows] = useState<ShippingCompanyRow[]>(initialRows);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ShippingCompanyFormState>(initialFormState);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(SHIPPING_COMPANIES_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as ShippingCompanyRow[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setRows(parsed);
      }
    } catch {
      // keep defaults
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SHIPPING_COMPANIES_STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const totals = useMemo(() => {
    const count = rows.length;
    const averageCost = count > 0 ? rows.reduce((sum, row) => sum + row.avgCost, 0) / count : 0;

    return {
      count,
      averageCost,
    };
  }, [rows]);

  const columns = useMemo<Column<ShippingCompanyRow>[]>(
    () => [
      { header: "الشركة", accessor: "company" },
      { header: "الخدمة", accessor: "serviceLevel" },
      { header: "النطاق", accessor: "region" },
      { header: "متوسط تكلفة الشحنة", accessor: (row) => row.avgCost.toLocaleString() },
      { header: "SLA يوم", accessor: "sla" },
      {
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
    ],
    [canEdit, canDelete]
  );

  /**
   * Opens create modal.
   */
  function openCreateModal() {
    if (!canCreate) {
      toast.error("ليس لديك صلاحية لإضافة شركة شحن");
      return;
    }

    setEditingId(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  }

  /**
   * Opens edit modal.
   */
  function openEditModal(row: ShippingCompanyRow) {
    if (!canEdit) {
      toast.error("ليس لديك صلاحية لتعديل شركات الشحن");
      return;
    }
    setEditingId(row.id);
    setFormState({
      company: row.company,
      serviceLevel: row.serviceLevel,
      region: row.region,
      avgCost: String(row.avgCost),
      sla: String(row.sla),
    });
    setIsModalOpen(true);
  }

  /**
   * Validates and saves company row.
   */
  function handleSave() {
    if (!formState.company.trim()) {
      toast.error("اسم الشركة مطلوب");
      return;
    }

    const avgCost = Number(formState.avgCost || 0);
    const sla = Number(formState.sla || 0);

    if (Number.isNaN(avgCost) || avgCost < 0) {
      toast.error("متوسط تكلفة الشحنة غير صحيح");
      return;
    }

    if (Number.isNaN(sla) || sla < 0) {
      toast.error("قيمة SLA غير صحيحة");
      return;
    }

    const payload: ShippingCompanyRow = {
      id: editingId ?? `sh_${Date.now()}`,
      company: formState.company.trim(),
      serviceLevel: formState.serviceLevel.trim(),
      region: formState.region.trim(),
      avgCost,
      sla,
    };

    if (editingId) {
      setRows((prev) => prev.map((row) => (row.id === editingId ? payload : row)));
      toast.success("تم تعديل شركة الشحن");
    } else {
      setRows((prev) => [payload, ...prev]);
      toast.success("تمت إضافة شركة الشحن");
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormState(initialFormState);
  }

  /**
   * Deletes company row.
   */
  function handleDelete(row: ShippingCompanyRow) {
    if (!canDelete) {
      toast.error("ليس لديك صلاحية لحذف شركات الشحن");
      return;
    }

    const confirmed = window.confirm("هل تريد حذف شركة الشحن؟");
    if (!confirmed) {
      return;
    }

    setRows((prev) => prev.filter((item) => item.id !== row.id));
    toast.success("تم حذف شركة الشحن");
  }

  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader align="right" title="إدارة شركات الشحن" description="تحديث تكلفة الشحن الافتراضية المستخدمة في الطلبات.">
      {canCreate && (
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
          إضافة شركة شحن
        </Button>
      )}
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">عدد الشركات</p>
            <p className="text-3xl font-bold text-slate-900">{totals.count}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">متوسط تكلفة الشحن</p>
            <p className="text-3xl font-bold text-emerald-700">{totals.averageCost.toLocaleString()}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="قائمة شركات الشحن" description="تعديلات هذه الصفحة تُستخدم تلقائياً في صفحة الطلبات." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={columns}
            data={rows}
            dir="rtl"
            pageSize={8}
            totalCount={rows.length}
            currentPage={page}
            onPageChange={setPage}
            title="شركات الشحن"
            getRowSearchText={toSearchText}
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "تعديل شركة شحن" : "إضافة شركة شحن"}
        size="md"
        footer={
          <>
            <Button onClick={handleSave}>{editingId ? "حفظ التعديل" : "إضافة"}</Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="اسم الشركة"
            value={formState.company}
            onChange={(event) => setFormState((prev) => ({ ...prev, company: event.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="مستوى الخدمة"
            value={formState.serviceLevel}
            onChange={(event) => setFormState((prev) => ({ ...prev, serviceLevel: event.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="النطاق"
            value={formState.region}
            onChange={(event) => setFormState((prev) => ({ ...prev, region: event.target.value }))}
          />
          <input
            type="number"
            min={0}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="متوسط تكلفة الشحنة"
            value={formState.avgCost}
            onChange={(event) => setFormState((prev) => ({ ...prev, avgCost: event.target.value }))}
          />
          <input
            type="number"
            min={0}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="SLA يوم"
            value={formState.sla}
            onChange={(event) => setFormState((prev) => ({ ...prev, sla: event.target.value }))}
          />
        </div>
      </AppModal>
    </section>
  );
}
