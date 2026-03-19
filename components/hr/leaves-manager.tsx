"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import type { HrEmployee, LeaveBalance, LeaveRequest } from "@/lib/types/hr";
import { useAuth } from "@/context/AuthContext";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";

interface LeaveFormState {
  employeeId: string;
  leaveType: LeaveRequest["leaveType"];
  startDate: string;
  endDate: string;
  reason: string;
}

const initialFormState: LeaveFormState = {
  employeeId: "",
  leaveType: "annual",
  startDate: "",
  endDate: "",
  reason: "",
};

interface LeavesManagerProps {
  initialRequests: LeaveRequest[];
  initialBalances: LeaveBalance[];
  employees: HrEmployee[];
}

/**
 * Manages leave requests CRUD with approve/reject actions.
 */
export function LeavesManager({ initialRequests, initialBalances, employees }: LeavesManagerProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>(initialRequests);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<LeaveFormState>(initialFormState);

  const leaveTypeLabel: Record<LeaveRequest["leaveType"], string> = {
    annual: "سنوية",
    sick: "مرضية",
    emergency: "طارئة",
    unpaid: "غير مدفوعة",
  };

  const statusLabel: Record<LeaveRequest["status"], { label: string; color: string }> = {
    pending: { label: "قيد الانتظار", color: "bg-yellow-50 text-yellow-700" },
    approved: { label: "موافق عليها", color: "bg-green-50 text-green-700" },
    rejected: { label: "مرفوضة", color: "bg-red-50 text-red-700" },
  };

  const totals = useMemo(() => {
    const totalRequests = requests.length;
    const pendingRequests = requests.filter((r) => r.status === "pending").length;
    const approvedRequests = requests.filter((r) => r.status === "approved").length;
    return { totalRequests, pendingRequests, approvedRequests };
  }, [requests]);

  const canCreateLeave = can(user, RBAC_PERMISSIONS.leavesCreate);
  const canEditLeave = can(user, RBAC_PERMISSIONS.leavesEdit);
  const canDeleteLeave = can(user, RBAC_PERMISSIONS.leavesDelete);
  const canApproveLeave = can(user, RBAC_PERMISSIONS.leavesApprove);

  /**
   * Calculates leave days between two dates.
   */
  function calculateDays(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  }

  /**
   * Opens modal for creating a leave request.
   */
  function openCreateModal() {
    if (!canCreateLeave) {
      toast.error("لا تملك صلاحية إضافة إجازة");
      return;
    }
    setEditingId(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  }

  /**
   * Opens modal for editing existing leave request.
   */
  function openEditModal(request: LeaveRequest) {
    if (!canEditLeave) {
      toast.error("لا تملك صلاحية تعديل الإجازة");
      return;
    }
    setEditingId(request.id);
    setFormState({
      employeeId: request.employeeId,
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason,
    });
    setIsModalOpen(true);
  }

  /**
   * Saves create or edit operation in local state.
   */
  function handleSave() {
    if (!formState.employeeId || !formState.startDate || !formState.endDate) {
      toast.error("يرجى تعبئة الحقول الأساسية");
      return;
    }

    const selectedEmployee = employees.find((employee) => employee.id === formState.employeeId);
    if (!selectedEmployee) {
      toast.error("يرجى اختيار موظف صحيح");
      return;
    }

    const days = calculateDays(formState.startDate, formState.endDate);
    if (days <= 0) {
      toast.error("تاريخ الإجازة غير صحيح");
      return;
    }

    if (editingId) {
      setRequests((prev) =>
        prev.map((request) =>
          request.id === editingId
            ? {
                ...request,
              employeeId: selectedEmployee.id,
              employeeName: selectedEmployee.fullName,
                leaveType: formState.leaveType,
                startDate: formState.startDate,
                endDate: formState.endDate,
                reason: formState.reason.trim(),
                days,
              }
            : request
        )
      );
      toast.success("تم تعديل طلب الإجازة");
    } else {
      const newRequest: LeaveRequest = {
        id: `leave_${Date.now()}`,
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.fullName,
        leaveType: formState.leaveType,
        startDate: formState.startDate,
        endDate: formState.endDate,
        days,
        reason: formState.reason.trim() || "-",
        status: "pending",
      };

      setRequests((prev) => [newRequest, ...prev]);
      toast.success("تمت إضافة طلب إجازة جديد");
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormState(initialFormState);
  }

  /**
   * Deletes leave request from local state.
   */
  function handleDelete(request: LeaveRequest) {
    if (!canDeleteLeave) {
      toast.error("لا تملك صلاحية حذف الإجازة");
      return;
    }
    const confirmed = window.confirm(`هل تريد حذف طلب ${request.employeeName}؟`);
    if (!confirmed) return;

    setRequests((prev) => prev.filter((item) => item.id !== request.id));
    toast.success("تم حذف طلب الإجازة");
  }

  /**
   * Approves leave request.
   */
  function handleApprove(id: string) {
    if (!canApproveLeave) {
      toast.error("لا تملك صلاحية الموافقة على الإجازة");
      return;
    }
    setRequests((prev) =>
      prev.map((request) =>
        request.id === id
          ? {
              ...request,
              status: "approved",
              approvedBy: "Manager",
              approvalDate: new Date().toISOString().slice(0, 10),
            }
          : request
      )
    );
    toast.success("تمت الموافقة على الإجازة");
  }

  /**
   * Rejects leave request.
   */
  function handleReject(id: string) {
    if (!canApproveLeave) {
      toast.error("لا تملك صلاحية رفض الإجازة");
      return;
    }
    setRequests((prev) =>
      prev.map((request) =>
        request.id === id
          ? {
              ...request,
              status: "rejected",
              approvedBy: "Manager",
              approvalDate: new Date().toISOString().slice(0, 10),
            }
          : request
      )
    );
    toast.success("تم رفض الإجازة");
  }

  const columns: Column<LeaveRequest>[] = [
    { header: "الموظف", accessor: "employeeName" },
    { header: "نوع الإجازة", accessor: (row) => leaveTypeLabel[row.leaveType] },
    { header: "الفترة", accessor: (row) => `${row.startDate} إلى ${row.endDate}` },
    { header: "الأيام", accessor: (row) => String(row.days) },
    { header: "السبب", accessor: "reason" },
    {
      header: "الحالة",
      accessor: (row) => {
        const status = statusLabel[row.status];
        return (
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>
            {status.label}
          </span>
        );
      },
    },
    {
      header: "الإجراءات",
      accessor: (row) => (
        <div className="flex items-center gap-1">
          {row.status === "pending" && (
            <>
              {canApproveLeave && (
                <button
                onClick={() => handleApprove(row.id)}
                className="rounded-md border border-green-200 p-1.5 text-green-700 hover:bg-green-50"
                title="موافقة"
              >
                <Check className="h-4 w-4" />
              </button>
              )}
              {canApproveLeave && (
                <button
                onClick={() => handleReject(row.id)}
                className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                title="رفض"
              >
                <X className="h-4 w-4" />
              </button>
              )}
            </>
          )}
          {canEditLeave && (
            <button
            onClick={() => openEditModal(row)}
            className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
            title="تعديل"
          >
            <Pencil className="h-4 w-4" />
          </button>
          )}
          {canDeleteLeave && (
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
  ];

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="إدارة الإجازات"
        description="عرض طلبات الإجازة والأرصدة المتاحة لكل موظف."
      >
        {canCreateLeave && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            إضافة إجازة
          </Button>
        )}
      </SectionHeader>

      <div className="grid gap-4 lg:grid-cols-4">
        {initialBalances.map((balance) => (
          <DynamicCard key={balance.employeeId} className="bg-gradient-to-br from-blue-50 to-indigo-50">
            <DynamicCard.Header title={balance.employeeName} description="رصيد الإجازات" />
            <DynamicCard.Content className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">سنوية:</span>
                <span className="font-semibold text-blue-700">{balance.annual} أيام</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">مرضية:</span>
                <span className="font-semibold text-green-700">{balance.sick} أيام</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">طارئة:</span>
                <span className="font-semibold text-orange-700">{balance.emergency} أيام</span>
              </div>
              <div className="border-t border-blue-100 pt-2">
                <div className="flex items-center justify-between font-semibold">
                  <span>المتبقي:</span>
                  <span className="text-blue-600">{balance.remaining}</span>
                </div>
              </div>
            </DynamicCard.Content>
          </DynamicCard>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي الطلبات</p>
            <p className="text-3xl font-bold text-slate-900">{totals.totalRequests}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-yellow-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">قيد الانتظار</p>
            <p className="text-3xl font-bold text-yellow-600">{totals.pendingRequests}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-green-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">موافق عليها</p>
            <p className="text-3xl font-bold text-green-600">{totals.approvedRequests}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="طلبات الإجازة" description="إضافة وتعديل وحذف مع نظام الموافقات" />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={columns}
            data={requests}
            dir="rtl"
            pageSize={5}
            totalCount={requests.length}
            currentPage={page}
            onPageChange={setPage}
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "تعديل طلب إجازة" : "إضافة طلب إجازة"}
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
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.employeeId}
            onChange={(e) => setFormState((prev) => ({ ...prev, employeeId: e.target.value }))}
          >
            <option value="">اختر الموظف</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName} - {employee.jobTitle}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.leaveType}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, leaveType: e.target.value as LeaveRequest["leaveType"] }))
            }
          >
            <option value="annual">سنوية</option>
            <option value="sick">مرضية</option>
            <option value="emergency">طارئة</option>
            <option value="unpaid">غير مدفوعة</option>
          </select>
          <input
            type="date"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.startDate}
            onChange={(e) => setFormState((prev) => ({ ...prev, startDate: e.target.value }))}
          />
          <input
            type="date"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.endDate}
            onChange={(e) => setFormState((prev) => ({ ...prev, endDate: e.target.value }))}
          />
          <textarea
            className="min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            placeholder="سبب الإجازة"
            value={formState.reason}
            onChange={(e) => setFormState((prev) => ({ ...prev, reason: e.target.value }))}
          />
        </div>
      </AppModal>
    </section>
  );
}
