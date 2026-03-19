"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { DataTable, type Column, type TableAction } from "@/components/shared/DataTable";
import type { HrEmployee } from "@/lib/types/hr";

/**
 * Renders employees data table with paging and quick row actions.
 */
export function EmployeesTable({
  data,
  onEdit,
  onDelete,
}: {
  data: HrEmployee[];
  onEdit?: (employee: HrEmployee) => void;
  onDelete?: (employee: HrEmployee) => void;
}) {
  const [page, setPage] = useState(1);

  const statusMap: Record<HrEmployee["status"], string> = {
    active: "نشط",
    "on-leave": "إجازة",
    probation: "تجربة",
  };

  const typeMap: Record<HrEmployee["employmentType"], string> = {
    "full-time": "دوام كامل",
    "part-time": "دوام جزئي",
    contract: "عقد",
  };

  const columns = useMemo<Column<HrEmployee>[]>(
    () => [
      { header: "الموظف", accessor: "fullName" },
      { header: "المسمى الوظيفي", accessor: "jobTitle" },
      { header: "القسم", accessor: "department" },
      { header: "نوع التوظيف", accessor: (row) => typeMap[row.employmentType] },
      {
        header: "الحالة",
        accessor: (row) => (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {statusMap[row.status]}
          </span>
        ),
      },
      { header: "الراتب الشهري", accessor: (row) => `$${row.monthlySalary.toLocaleString()}` },
    ],
    []
  );

  const actions = useMemo<TableAction<HrEmployee>[]>(
    () => [
      { label: "تعديل", icon: <Pencil className="h-4 w-4" />, onClick: (item) => onEdit?.(item) },
      { label: "حذف", icon: <Trash2 className="h-4 w-4" />, variant: "danger", onClick: (item) => onDelete?.(item) },
    ],
    [onEdit, onDelete]
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      dir="ltr"
      actions={actions}
      totalCount={data.length}
      pageSize={5}
      currentPage={page}
      onPageChange={setPage}
    />
  );
}
