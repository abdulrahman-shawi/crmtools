"use client";

import { useState } from "react";
import { Check, X, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import type { LeaveRequest } from "@/lib/types/hr";

interface LeavesTableProps {
  data: LeaveRequest[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

/**
 * Renders leave requests with approval/rejection actions.
 */
export default function LeavesTable({ data: initialData, onApprove, onReject }: LeavesTableProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>(initialData);

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? { ...req, status: "approved", approvedBy: "Manager", approvalDate: new Date().toISOString().slice(0, 10) }
          : req
      )
    );
    onApprove?.(id);
    toast.success("تمت الموافقة على الإجازة");
  };

  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? { ...req, status: "rejected", approvedBy: "Manager", approvalDate: new Date().toISOString().slice(0, 10) }
          : req
      )
    );
    onReject?.(id);
    toast.success("تم رفض الإجازة");
  };

  const [page, setPage] = useState(1);

  const leaveTypeLabel: Record<string, string> = {
    annual: "سنوية",
    sick: "مرضية",
    emergency: "طارئة",
    unpaid: "غير مدفوعة",
  };

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending: { label: "قيد الانتظار", color: "bg-yellow-50 text-yellow-700" },
    approved: { label: "موافق عليها", color: "bg-green-50 text-green-700" },
    rejected: { label: "مرفوضة", color: "bg-red-50 text-red-700" },
  };

  const columns: Column<LeaveRequest>[] = [
    { header: "الموظف", accessor: "employeeName" },
    {
      header: "نوع الإجازة",
      accessor: (row: LeaveRequest) => leaveTypeLabel[row.leaveType],
    },
    {
      header: "الفترة",
        accessor: (row: LeaveRequest) => `${row.startDate} إلى ${row.endDate}`,
    },
      { header: "الأيام", accessor: (row: LeaveRequest) => String(row.days) },
    { header: "السبب", accessor: "reason" },
    {
      header: "الحالة",
      accessor: (row: LeaveRequest) => {
        const status = statusLabel[row.status];
        return (
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>
            {status.label}
          </span>
        );
      },
    },
    {
      header: "الإجراء",
      accessor: (row: LeaveRequest) =>
        row.status === "pending" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApprove(row.id)}
              className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-sm text-green-700 hover:bg-green-100"
              title="إقرار"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleReject(row.id)}
              className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-sm text-red-700 hover:bg-red-100"
              title="رفض"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-500">{row.approvalDate}</span>
        ),
    },
  ];

  const pageSize = 5;
  const totalPages = Math.ceil(requests.length / pageSize);

  return (
    <DataTable
      columns={columns}
      data={requests}
      dir="rtl"
      pageSize={5}
      totalCount={requests.length}
      currentPage={page}
      onPageChange={setPage}
    />
  );

}
