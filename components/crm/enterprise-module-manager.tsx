"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import type { CrmModuleDefinition, CrmModuleField, CrmModuleRow } from "@/lib/types/crm-enterprise";

interface EnterpriseModuleManagerProps {
  module: CrmModuleDefinition;
}

/**
 * Builds initial form state from module fields.
 */
function buildInitialForm(fields: CrmModuleField[]): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => {
      if (field.type === "select" && field.options?.length) {
        return [field.key, field.options[0].value];
      }
      return [field.key, ""];
    })
  );
}

/**
 * Converts row values into a searchable text snapshot.
 */
function toSearchText(row: CrmModuleRow): string {
  return Object.values(row)
    .map((value) => String(value))
    .join(" ");
}

/**
 * Renders full CRUD module for CRM enterprise entities.
 */
export function EnterpriseModuleManager({ module }: EnterpriseModuleManagerProps) {
  const [rows, setRows] = useState<CrmModuleRow[]>(module.initialRows);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, string>>(() => buildInitialForm(module.fields));

  const numericFieldKey = useMemo(() => {
    const preferred = ["amount", "total", "value", "annualValue", "price"];
    const preferredMatch = preferred.find((key) => module.fields.some((field) => field.key === key && field.type === "number"));
    if (preferredMatch) {
      return preferredMatch;
    }

    return module.fields.find((field) => field.type === "number")?.key;
  }, [module.fields]);

  const totals = useMemo(() => {
    const totalRows = rows.length;
    const activeRows = rows.filter((row) => String(row.status ?? row.health ?? "").toLowerCase().includes("active") || String(row.status ?? row.health ?? "").includes("نشط")).length;
    const totalValue = numericFieldKey
      ? rows.reduce((sum, row) => sum + Number(row[numericFieldKey] ?? 0), 0)
      : 0;

    return {
      totalRows,
      activeRows,
      totalValue,
    };
  }, [rows, numericFieldKey]);

  const columns = useMemo<Column<CrmModuleRow>[]>(
    () => [
      ...module.columns.map((column) => ({
        header: column.label,
        accessor: (row: CrmModuleRow) => String(row[column.key] ?? "-"),
      })),
      {
        header: "الإجراءات",
        accessor: (row: CrmModuleRow) => (
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
    [module.columns]
  );

  /**
   * Opens create modal with empty form.
   */
  function openCreateModal() {
    setEditingId(null);
    setFormState(buildInitialForm(module.fields));
    setIsModalOpen(true);
  }

  /**
   * Opens edit modal using current row values.
   */
  function openEditModal(row: CrmModuleRow) {
    const nextState = buildInitialForm(module.fields);
    module.fields.forEach((field) => {
      nextState[field.key] = String(row[field.key] ?? "");
    });

    setEditingId(row.id);
    setFormState(nextState);
    setIsModalOpen(true);
  }

  /**
   * Saves create or edit operation in local state.
   */
  function handleSave() {
    for (const field of module.fields) {
      if (field.required && !String(formState[field.key] ?? "").trim()) {
        toast.error(`يرجى تعبئة حقل ${field.label}`);
        return;
      }
    }

    const normalizedValues = Object.fromEntries(
      module.fields.map((field) => {
        const rawValue = formState[field.key] ?? "";
        if (field.type === "number") {
          return [field.key, Number(rawValue || 0)];
        }
        return [field.key, rawValue.trim()];
      })
    );

    if (editingId) {
      setRows((prev) =>
        prev.map((row) => (row.id === editingId ? { ...row, ...normalizedValues } : row))
      );
      toast.success("تم حفظ التعديل");
    } else {
      const newRow: CrmModuleRow = {
        id: `${module.slug}_${Date.now()}`,
        ...normalizedValues,
      };
      setRows((prev) => [newRow, ...prev]);
      toast.success("تمت الإضافة بنجاح");
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormState(buildInitialForm(module.fields));
  }

  /**
   * Deletes row after user confirmation.
   */
  function handleDelete(row: CrmModuleRow) {
    const confirmed = window.confirm("هل تريد حذف هذا السجل؟");
    if (!confirmed) {
      return;
    }

    setRows((prev) => prev.filter((item) => item.id !== row.id));
    toast.success("تم حذف السجل");
  }

  return (
    <section className="space-y-6">
      <SectionHeader align="right" title={module.title} description={module.description}>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
          {module.addLabel}
        </Button>
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي السجلات</p>
            <p className="text-3xl font-bold text-slate-900">{totals.totalRows}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">السجلات النشطة</p>
            <p className="text-3xl font-bold text-emerald-600">{totals.activeRows}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-orange-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي القيمة</p>
            <p className="text-3xl font-bold text-orange-600">{totals.totalValue.toLocaleString()}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title={module.title} description="بحث، تصدير، استيراد وإدارة كاملة." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={columns}
            data={rows}
            dir="rtl"
            pageSize={8}
            totalCount={rows.length}
            currentPage={page}
            onPageChange={setPage}
            title={module.title}
            getRowSearchText={toSearchText}
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "تعديل سجل" : module.addLabel}
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
          {module.fields.map((field) => {
            if (field.type === "textarea") {
              return (
                <textarea
                  key={field.key}
                  className="min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                  placeholder={field.placeholder ?? field.label}
                  value={formState[field.key] ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              );
            }

            if (field.type === "select") {
              return (
                <select
                  key={field.key}
                  className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                  value={formState[field.key] ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              );
            }

            return (
              <input
                key={field.key}
                type={field.type === "number" || field.type === "date" ? field.type : "text"}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder={field.placeholder ?? field.label}
                value={formState[field.key] ?? ""}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    [field.key]: event.target.value,
                  }))
                }
              />
            );
          })}
        </div>
      </AppModal>
    </section>
  );
}
