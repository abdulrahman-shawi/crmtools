"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import type { HrPayrollRecord } from "@/lib/types/hr";

/**
 * Renders payroll records with payment status and salary breakdown.
 */
export function PayrollTable({ data }: { data: HrPayrollRecord[] }) {
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<HrPayrollRecord[]>(data);

  const paymentMap: Record<HrPayrollRecord["paymentStatus"], string> = {
    paid: "مدفوع",
    pending: "قيد الانتظار",
  };

  /**
   * Toggles payroll payment status in local mock state.
   */
  const togglePaymentStatus = (id: string) => {
    setRecords((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, paymentStatus: row.paymentStatus === "paid" ? "pending" : "paid" }
          : row
      )
    );
    toast.success("تم تحديث حالة الدفع");
  };

  const columns = useMemo<Column<HrPayrollRecord>[]>(
    () => [
      { header: "الموظف", accessor: "employeeName" },
      { header: "الشهر", accessor: "month" },
      { header: "إجمالي", accessor: (row) => `$${row.grossSalary.toLocaleString()}` },
      { header: "مكافآت", accessor: (row) => `$${row.bonuses.toLocaleString()}` },
      { header: "استقطاعات", accessor: (row) => `$${row.deductions.toLocaleString()}` },
      { header: "الصافي", accessor: (row) => `$${row.netSalary.toLocaleString()}` },
      {
        header: "حالة الدفع",
        accessor: (row) => (
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                row.paymentStatus === "paid"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {paymentMap[row.paymentStatus]}
            </span>
            <button
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => togglePaymentStatus(row.id)}
            >
              تغيير الحالة
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      data={records}
      columns={columns}
      dir="ltr"
      totalCount={records.length}
      pageSize={6}
      currentPage={page}
      onPageChange={setPage}
    />
  );
}
