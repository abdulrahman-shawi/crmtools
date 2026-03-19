"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import type { KPI } from "@/lib/types/hr";

interface KPIsTableProps {
  data: KPI[];
}

export default function KPIsTable({ data }: KPIsTableProps) {
  const [page, setPage] = useState(1);

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500";
    if (progress >= 80) return "bg-blue-500";
    if (progress >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const columns: Column<KPI>[] = [
    {
      header: "الموظف",
      accessor: "employeeName",
    },
    {
      header: "المؤشر",
      accessor: "metricName",
    },
    {
      header: "القيمة المستهدفة",
      accessor: (row) => (
        <span className="text-sm">
          {row.targetValue} {row.unit}
        </span>
      ),
    },
    {
      header: "القيمة الفعلية",
      accessor: (row) => (
        <span className="font-semibold text-slate-900">
          {row.actualValue} {row.unit}
        </span>
      ),
    },
    {
      header: "نسبة التقدم",
      accessor: (row) => (
        <div className="flex flex-col items-end gap-1">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full ${getProgressColor(row.progress)} transition-all`}
              style={{ width: `${Math.min(row.progress, 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold">{Math.round(row.progress)}%</span>
        </div>
      ),
    },
    {
      header: "الشهر",
      accessor: "month",
    },
  ];

  const pageSize = 5;

  return (
    <DataTable
      columns={columns}
      data={data}
      dir="rtl"
      pageSize={pageSize}
      totalCount={data.length}
      currentPage={page}
      onPageChange={setPage}
    />
  );
}
