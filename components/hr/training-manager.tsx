"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import type { HrCandidate, HrEmployee, TrainingEnrollment, TrainingProgram } from "@/lib/types/hr";
import { useAuth } from "@/context/AuthContext";
import { can, RBAC_PERMISSIONS } from "@/lib/rbac";

interface TrainingParticipantOption {
  id: string;
  label: string;
  type: "employee" | "trainee";
}

interface TrainingFormState {
  title: string;
  description: string;
  category: TrainingProgram["category"];
  duration: string;
  instructor: string;
  startDate: string;
  status: TrainingProgram["status"];
  attendeeIds: string[];
}

const initialTrainingForm: TrainingFormState = {
  title: "",
  description: "",
  category: "technical",
  duration: "",
  instructor: "",
  startDate: "",
  status: "not-started",
  attendeeIds: [],
};

interface TrainingManagerProps {
  initialPrograms: TrainingProgram[];
  initialEnrollments: TrainingEnrollment[];
  employees: HrEmployee[];
  trainees: HrCandidate[];
}

/**
 * Manages training programs with add/edit/delete operations.
 */
export function TrainingManager({ initialPrograms, initialEnrollments, employees, trainees }: TrainingManagerProps) {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<TrainingProgram[]>(initialPrograms);
  const [programAttendees, setProgramAttendees] = useState<Record<string, string[]>>(
    Object.fromEntries(
      initialPrograms.map((program) => [
        program.id,
        initialEnrollments
          .filter((enrollment) => enrollment.programId === program.id)
          .map((enrollment) => enrollment.employeeId),
      ])
    )
  );
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TrainingFormState>(initialTrainingForm);

  const categoryLabel: Record<TrainingProgram["category"], string> = {
    onboarding: "استقطاب",
    technical: "تقني",
    "soft-skills": "مهارات شخصية",
    compliance: "الامتثال",
  };

  const statusLabel: Record<TrainingProgram["status"], { label: string; color: string }> = {
    "not-started": { label: "لم تبدأ", color: "bg-slate-50 text-slate-700" },
    "in-progress": { label: "جارية", color: "bg-blue-50 text-blue-700" },
    completed: { label: "مكتملة", color: "bg-green-50 text-green-700" },
  };

  const stats = useMemo(() => {
    const completedPrograms = programs.filter((p) => p.status === "completed").length;
    const inProgressPrograms = programs.filter((p) => p.status === "in-progress").length;
    const totalEnrollments = initialEnrollments.length;
    const completedEnrollments = initialEnrollments.filter((e) => e.status === "completed").length;

    return {
      completedPrograms,
      inProgressPrograms,
      totalEnrollments,
      completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
    };
  }, [programs, initialEnrollments]);

  const canCreateProgram = can(user, RBAC_PERMISSIONS.trainingCreate);
  const canEditProgram = can(user, RBAC_PERMISSIONS.trainingEdit);
  const canDeleteProgram = can(user, RBAC_PERMISSIONS.trainingDelete);

  const participantOptions = useMemo<TrainingParticipantOption[]>(
    () => [
      ...employees.map((employee) => ({
        id: employee.id,
        label: `${employee.fullName} - ${employee.jobTitle}`,
        type: "employee" as const,
      })),
      ...trainees.map((trainee) => ({
        id: trainee.id,
        label: `${trainee.fullName} - ${trainee.role}`,
        type: "trainee" as const,
      })),
    ],
    [employees, trainees]
  );

  /**
   * Opens create modal for training program.
   */
  function openCreateModal() {
    if (!canCreateProgram) {
      toast.error("لا تملك صلاحية إضافة برنامج");
      return;
    }
    setEditingId(null);
    setFormState(initialTrainingForm);
    setIsModalOpen(true);
  }

  /**
   * Opens edit modal with selected program data.
   */
  function openEditModal(program: TrainingProgram) {
    if (!canEditProgram) {
      toast.error("لا تملك صلاحية تعديل البرنامج");
      return;
    }
    setEditingId(program.id);
    setFormState({
      title: program.title,
      description: program.description,
      category: program.category,
      duration: program.duration,
      instructor: program.instructor,
      startDate: program.startDate,
      status: program.status,
      attendeeIds: programAttendees[program.id] ?? [],
    });
    setIsModalOpen(true);
  }

  /**
   * Saves program in local state.
   */
  function handleSave() {
    if (!formState.title.trim() || !formState.instructor.trim() || !formState.startDate) {
      toast.error("يرجى تعبئة الحقول الأساسية");
      return;
    }

    if (formState.attendeeIds.length === 0) {
      toast.error("يرجى اختيار موظف أو متدرب واحد على الأقل");
      return;
    }

    const enrolledCount = formState.attendeeIds.length;

    if (editingId) {
      setPrograms((prev) =>
        prev.map((program) =>
          program.id === editingId
            ? {
                ...program,
                title: formState.title.trim(),
                description: formState.description.trim(),
                category: formState.category,
                duration: formState.duration.trim(),
                instructor: formState.instructor.trim(),
                startDate: formState.startDate,
                status: formState.status,
                enrolledCount,
              }
            : program
        )
      );
      setProgramAttendees((prev) => ({ ...prev, [editingId]: formState.attendeeIds }));
      toast.success("تم تعديل برنامج التدريب");
    } else {
      const newProgramId = `train_${Date.now()}`;
      const newProgram: TrainingProgram = {
        id: newProgramId,
        title: formState.title.trim(),
        description: formState.description.trim() || "-",
        category: formState.category,
        duration: formState.duration.trim() || "-",
        instructor: formState.instructor.trim(),
        startDate: formState.startDate,
        status: formState.status,
        enrolledCount,
      };

      setPrograms((prev) => [newProgram, ...prev]);
      setProgramAttendees((prev) => ({ ...prev, [newProgramId]: formState.attendeeIds }));
      toast.success("تمت إضافة برنامج تدريب");
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormState(initialTrainingForm);
  }

  /**
   * Deletes selected training program.
   */
  function handleDelete(program: TrainingProgram) {
    if (!canDeleteProgram) {
      toast.error("لا تملك صلاحية حذف البرنامج");
      return;
    }
    const confirmed = window.confirm(`هل تريد حذف البرنامج ${program.title}؟`);
    if (!confirmed) return;

    setPrograms((prev) => prev.filter((item) => item.id !== program.id));
    setProgramAttendees((prev) => {
      const next = { ...prev };
      delete next[program.id];
      return next;
    });
    toast.success("تم حذف برنامج التدريب");
  }

  /**
   * Toggles one attendee selection inside the training form.
   */
  function toggleAttendee(attendeeId: string) {
    setFormState((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(attendeeId)
        ? prev.attendeeIds.filter((id) => id !== attendeeId)
        : [...prev.attendeeIds, attendeeId],
    }));
  }

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
    { header: "الفئة", accessor: (row) => categoryLabel[row.category] },
    { header: "المدرب", accessor: "instructor" },
    { header: "المدة", accessor: "duration" },
    { header: "تاريخ البدء", accessor: "startDate" },
    {
      header: "الحضور",
      accessor: (row) => {
        const attendeeNames = (programAttendees[row.id] ?? [])
          .map((attendeeId) => participantOptions.find((option) => option.id === attendeeId)?.label)
          .filter(Boolean) as string[];

        return (
          <div className="max-w-[260px] space-y-1">
            <p className="font-semibold text-slate-900">{attendeeNames.length} مشارك</p>
            <p className="truncate text-xs text-slate-500">{attendeeNames.join("، ") || "لا يوجد"}</p>
          </div>
        );
      },
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
    {
      header: "الإجراءات",
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <button
            disabled={!canEditProgram}
            onClick={() => openEditModal(row)}
            className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
            title="تعديل"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            disabled={!canDeleteProgram}
            onClick={() => handleDelete(row)}
            className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
            title="حذف"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="التدريب والتطوير"
        description="برامج التدريب والتطوير الوظيفي للموظفين."
      >
        {canCreateProgram && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            إضافة برنامج
          </Button>
        )}
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <DynamicCard className="bg-gradient-to-br from-purple-50 to-pink-50">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">البرامج المكتملة</p>
            <p className="text-3xl font-bold text-purple-600">{stats.completedPrograms}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">برامج جارية</p>
            <p className="text-3xl font-bold text-blue-600">{stats.inProgressPrograms}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="bg-gradient-to-br from-green-50 to-emerald-50">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">إجمالي الالتحاقات</p>
            <p className="text-3xl font-bold text-green-600">{stats.totalEnrollments}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="bg-gradient-to-br from-orange-50 to-red-50">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">معدل الإكمال</p>
            <p className="text-3xl font-bold text-orange-600">{stats.completionRate}%</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="برامج التدريب" description="إضافة وتعديل وحذف برامج التدريب" />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={columns}
            data={programs}
            dir="rtl"
            pageSize={5}
            totalCount={programs.length}
            currentPage={page}
            onPageChange={setPage}
            getRowSearchText={(prog) =>
              `${categoryLabel[prog.category]} ${statusLabel[prog.status].label} ${prog.title} ${prog.instructor} ${prog.description}`
            }
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "تعديل برنامج" : "إضافة برنامج"}
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
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm md:col-span-2"
            placeholder="عنوان البرنامج"
            value={formState.title}
            onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
          />
          <textarea
            className="min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            placeholder="وصف البرنامج"
            value={formState.description}
            onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
          />
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.category}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, category: e.target.value as TrainingProgram["category"] }))
            }
          >
            <option value="onboarding">استقطاب</option>
            <option value="technical">تقني</option>
            <option value="soft-skills">مهارات شخصية</option>
            <option value="compliance">الامتثال</option>
          </select>
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.status}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, status: e.target.value as TrainingProgram["status"] }))
            }
          >
            <option value="not-started">لم تبدأ</option>
            <option value="in-progress">جارية</option>
            <option value="completed">مكتملة</option>
          </select>
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="المدرب"
            value={formState.instructor}
            onChange={(e) => setFormState((prev) => ({ ...prev, instructor: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="المدة"
            value={formState.duration}
            onChange={(e) => setFormState((prev) => ({ ...prev, duration: e.target.value }))}
          />
          <input
            type="date"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.startDate}
            onChange={(e) => setFormState((prev) => ({ ...prev, startDate: e.target.value }))}
          />
          <div className="rounded-lg border border-slate-200 p-3 text-sm md:col-span-2">
            <p className="mb-3 font-semibold text-slate-700">اختر من سيحضر التدريب</p>
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
              {participantOptions.map((option) => (
                <label key={option.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={formState.attendeeIds.includes(option.id)}
                    onChange={() => toggleAttendee(option.id)}
                  />
                  <span className="text-sm text-slate-700">{option.label}</span>
                  <span className="mr-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {option.type === "employee" ? "موظف" : "متدرب"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </AppModal>
    </section>
  );
}
