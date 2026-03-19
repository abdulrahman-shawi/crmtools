"use client";

import { useState } from "react";
import { Users, Calendar } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import type { TrainingProgram } from "@/lib/types/hr";

interface TrainingTableProps {
  data: TrainingProgram[];
}

export default function TrainingTable({ data }: TrainingTableProps) {
  const [page, setPage] = useState(1);

  const categoryLabel: Record<string, string> = {
    onboarding: "استقطاب",
    technical: "تقني",
    "soft-skills": "مهارات شخصية",
    compliance: "الامتثال",
  };

  const statusLabel: Record<string, { label: string; color: string }> = {
    "not-started": { label: "لم تبدأ", color: "bg-slate-50 text-slate-700" },
    "in-progress": { label: "جارية", color: "bg-blue-50 text-blue-700" },
    completed: { label: "مكتملة", color: "bg-green-50 text-green-700" },
  };

  const columns: Column<TrainingProgram>[] = [
    {
      header: "البرنامج",
      accessor: (row) => (
        <div>
          <p className="font-semibold">{row.title}</p>
          <p className="text-xs text-slate-600">{row.description}</p>
        </div>
      ),
    },
    {
      header: "الفئة",
      accessor: (row) => (
        <span className="inline-block rounded-full bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">
          {categoryLabel[row.category]}
        </span>
      ),
    },
    {
      header: "المدرب",
      accessor: "instructor",
    },
    {
      header: "المدة",
      accessor: "duration",
    },
    {
      header: "تاريخ البدء",
      accessor: (row) => (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="h-4 w-4 text-slate-500" />
          {row.startDate}
        </div>
      ),
    },
    {
      header: "الملتحقين",
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-slate-500" />
          <span className="font-semibold">{row.enrolledCount}</span>
        </div>
      ),
    },
    {
      header: "الحالة",
      accessor: (row) => {
        const status = statusLabel[row.status];
        return (
          <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${status.color}`}>
            {status.label}
          </span>
        );
      },
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
