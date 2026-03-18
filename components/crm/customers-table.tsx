"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { DataTable, type Column, type TableAction } from "@/components/shared/DataTable";
import type { Customer } from "@/lib/types/crm";
import { formatPhoneForDisplay } from "@/lib/utils";

/**
 * Renders paginated customers table with lightweight action handlers.
 */
export function CustomersTable({ data }: { data: Customer[] }) {
  const [page, setPage] = useState(1);

  const statusLabel: Record<Customer["status"], string> = {
    lead: "عميل محتمل",
    qualified: "مؤهل",
    customer: "عميل",
  };

  const columns = useMemo<Column<Customer>[]>(
    () => [
      {
        header: "الاسم",
        accessor: "name",
      },
      {
        header: "البريد الإلكتروني",
        accessor: "email",
      },
      {
        header: "الهاتف",
        accessor: (row) => formatPhoneForDisplay(row.phone),
      },
      {
        header: "المدينة",
        accessor: "city",
      },
      {
        header: "الحالة",
        accessor: (row) => (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {statusLabel[row.status]}
          </span>
        ),
      },
      {
        header: "القيمة السنوية",
        accessor: (row) => `$${row.annualValue.toLocaleString()}`,
      },
    ],
    []
  );

  const actions = useMemo<TableAction<Customer>[]>(
    () => [
      {
        label: "تعديل",
        icon: <Pencil className="h-4 w-4" />,
        onClick: () => undefined,
      },
      {
        label: "حذف",
        icon: <Trash2 className="h-4 w-4" />,
        variant: "danger",
        onClick: () => undefined,
      },
    ],
    []
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
