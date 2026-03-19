"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import type { PerformanceReview } from "@/lib/types/hr";

interface PerformanceTableProps {
  data: PerformanceReview[];
}

export default function PerformanceTable({ data }: PerformanceTableProps) {
  const [page, setPage] = useState(1);

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-yellow-500";
    if (rating >= 4) return "text-yellow-400";
    if (rating >= 3.5) return "text-amber-400";
    return "text-slate-400";
  };

  const getGoalCompletion = (achieved: number, total: number) => {
    const percentage = Math.round((achieved / total) * 100);
    return percentage;
  };

  const columns: Column<PerformanceReview>[] = [
    {
      header: "الموظف",
      accessor: "employeeName",
    },
    {
      header: "الفترة",
      accessor: "reviewPeriod",
    },
    {
      header: "تقييم الإدارة",
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <span className="font-semibold">{row.managerRating}</span>
          <Star className={`h-4 w-4 fill-current ${getRatingColor(row.managerRating)}`} />
        </div>
      ),
    },
    {
      header: "تقييم الزملاء",
      accessor: (row) =>
        row.peerRating ? (
          <div className="flex items-center gap-1">
            <span className="font-semibold">{row.peerRating}</span>
            <Star className={`h-4 w-4 fill-current ${getRatingColor(row.peerRating)}`} />
          </div>
        ) : (
          <span className="text-xs text-slate-500">غير متوفر</span>
        ),
    },
    {
      header: "الأهداف",
      accessor: (row) => {
        const completion = getGoalCompletion(row.achievedGoals, row.goals.length);
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-12 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-xs font-semibold">{completion}%</span>
          </div>
        );
      },
    },
    {
      header: "التعليقات",
      accessor: (row) => (
        <span className="text-sm text-slate-600 line-clamp-2">{row.comments}</span>
      ),
    },
    {
      header: "المقيّم",
      accessor: "reviewer",
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
