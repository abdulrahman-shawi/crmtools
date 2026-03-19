"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import type { HrAttendanceRecord } from "@/lib/types/hr";

/**
 * Renders attendance records with status and working time details.
 */
export function AttendanceTable({ data }: { data: HrAttendanceRecord[] }) {
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<HrAttendanceRecord[]>(data);

  const statusMap: Record<HrAttendanceRecord["status"], string> = {
    present: "حاضر",
    late: "متأخر",
    absent: "غائب",
    remote: "عن بعد",
  };

  /**
   * Updates attendance status for one row in local mock state.
   */
  const handleStatusChange = (id: string, status: HrAttendanceRecord["status"]) => {
    setRecords((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
    toast.success("تم تحديث حالة الحضور");
  };

  const columns = useMemo<Column<HrAttendanceRecord>[]>(
    () => [
      { header: "الموظف", accessor: "employeeName" },
      { header: "التاريخ", accessor: "date" },
      { header: "الدخول", accessor: "checkIn" },
      { header: "الخروج", accessor: "checkOut" },
      { header: "عدد الساعات", accessor: (row) => `${row.workedHours}h` },
      {
        header: "الحالة",
        accessor: (row) => (
          <select
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
            value={row.status}
            onChange={(e) => handleStatusChange(row.id, e.target.value as HrAttendanceRecord["status"])}
          >
            <option value="present">{statusMap.present}</option>
            <option value="late">{statusMap.late}</option>
            <option value="absent">{statusMap.absent}</option>
            <option value="remote">{statusMap.remote}</option>
          </select>
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
