"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { EmployeesTable } from "@/components/hr/employees-table";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import type { HrEmployee } from "@/lib/types/hr";
import { useAuth } from "@/context/AuthContext";

interface EmployeeFormState {
  fullName: string;
  jobTitle: string;
  department: string;
  employmentType: HrEmployee["employmentType"];
  status: HrEmployee["status"];
  monthlySalary: string;
}

const initialFormState: EmployeeFormState = {
  fullName: "",
  jobTitle: "",
  department: "",
  employmentType: "full-time",
  status: "active",
  monthlySalary: "",
};

/**
 * Handles employees CRUD interactions with local mock state.
 */
export function EmployeesManager({ initialData }: { initialData: HrEmployee[] }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<HrEmployee[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [formState, setFormState] = useState<EmployeeFormState>(initialFormState);

  const canCreateEmployee = Boolean(user?.role === "admin" || user?.permissions?.includes("addEmployees") || user?.permissions?.includes("viewEmployees"));
  const canEditEmployee = Boolean(user?.role === "admin" || user?.permissions?.includes("editEmployees") || user?.permissions?.includes("viewEmployees"));
  const canDeleteEmployee = Boolean(user?.role === "admin" || user?.permissions?.includes("deleteEmployees"));

  /**
   * Opens add employee modal.
   */
  const openCreateModal = () => {
    if (!canCreateEmployee) {
      toast.error("لا تملك صلاحية إضافة موظف");
      return;
    }
    setEditingEmployeeId(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  };

  /**
   * Opens edit modal with selected employee data.
   */
  const openEditModal = (employee: HrEmployee) => {
    if (!canEditEmployee) {
      toast.error("لا تملك صلاحية تعديل الموظفين");
      return;
    }

    setEditingEmployeeId(employee.id);
    setFormState({
      fullName: employee.fullName,
      jobTitle: employee.jobTitle,
      department: employee.department,
      employmentType: employee.employmentType,
      status: employee.status,
      monthlySalary: String(employee.monthlySalary),
    });
    setIsModalOpen(true);
  };

  /**
   * Saves employee changes in local state.
   */
  const handleSave = () => {
    if (!formState.fullName.trim() || !formState.jobTitle.trim() || !formState.monthlySalary.trim()) {
      toast.error("يرجى تعبئة الحقول الأساسية");
      return;
    }

    const salary = Number(formState.monthlySalary);
    if (Number.isNaN(salary) || salary < 0) {
      toast.error("الراتب غير صالح");
      return;
    }

    if (editingEmployeeId) {
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === editingEmployeeId
            ? {
                ...employee,
                fullName: formState.fullName.trim(),
                jobTitle: formState.jobTitle.trim(),
                department: formState.department.trim(),
                employmentType: formState.employmentType,
                status: formState.status,
                monthlySalary: salary,
              }
            : employee
        )
      );
      toast.success("تم تعديل بيانات الموظف");
    } else {
      const newEmployee: HrEmployee = {
        id: `emp_${Date.now()}`,
        fullName: formState.fullName.trim(),
        jobTitle: formState.jobTitle.trim(),
        department: formState.department.trim(),
        employmentType: formState.employmentType,
        status: formState.status,
        monthlySalary: salary,
        hireDate: new Date().toISOString().slice(0, 10),
      };

      setEmployees((prev) => [newEmployee, ...prev]);
      toast.success("تمت إضافة الموظف");
    }

    setIsModalOpen(false);
    setEditingEmployeeId(null);
    setFormState(initialFormState);
  };

  /**
   * Deletes employee after confirmation.
   */
  const handleDelete = (employee: HrEmployee) => {
    if (!canDeleteEmployee) {
      toast.error("لا تملك صلاحية حذف الموظفين");
      return;
    }

    const confirmed = window.confirm(`هل تريد حذف الموظف ${employee.fullName}؟`);
    if (!confirmed) return;

    setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
    toast.success("تم حذف الموظف");
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="الموظفون"
        description="إدارة بيانات الموظفين، الأقسام، حالات التوظيف، والرواتب الأساسية."
      >
        {canCreateEmployee && (
          <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={openCreateModal}>
            إضافة موظف
          </Button>
        )}
      </SectionHeader>

      <EmployeesTable
        data={employees}
        onEdit={canEditEmployee ? openEditModal : undefined}
        onDelete={canDeleteEmployee ? handleDelete : undefined}
      />

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployeeId ? "تعديل موظف" : "إضافة موظف"}
        size="md"
        footer={
          <>
            <Button onClick={handleSave}>{editingEmployeeId ? "حفظ التعديل" : "إضافة"}</Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="اسم الموظف"
            value={formState.fullName}
            onChange={(e) => setFormState((prev) => ({ ...prev, fullName: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="المسمى الوظيفي"
            value={formState.jobTitle}
            onChange={(e) => setFormState((prev) => ({ ...prev, jobTitle: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="القسم"
            value={formState.department}
            onChange={(e) => setFormState((prev) => ({ ...prev, department: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="الراتب الشهري"
            value={formState.monthlySalary}
            onChange={(e) => setFormState((prev) => ({ ...prev, monthlySalary: e.target.value }))}
          />
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.employmentType}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, employmentType: e.target.value as HrEmployee["employmentType"] }))
            }
          >
            <option value="full-time">دوام كامل</option>
            <option value="part-time">دوام جزئي</option>
            <option value="contract">عقد</option>
          </select>
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.status}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, status: e.target.value as HrEmployee["status"] }))
            }
          >
            <option value="active">نشط</option>
            <option value="on-leave">إجازة</option>
            <option value="probation">تجربة</option>
          </select>
        </div>
      </AppModal>
    </section>
  );
}
