"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import { hrEmployees } from "@/lib/data/mock-hr";
import { RBAC_PERMISSIONS } from "@/lib/rbac";

interface TeamPermissionOption {
  key: string;
  label: string;
  group: string;
}

interface PermissionProfile {
  id: string;
  profileName: string;
  permissions: string[];
  createdAt: string;
}

interface EmployeePermissionAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  profileId: string;
  profileName: string;
  assignedAt: string;
}

interface PermissionProfileFormState {
  profileName: string;
  permissions: string[];
}

interface AssignmentFormState {
  employeeId: string;
  profileId: string;
}

const PROFILES_STORAGE_KEY = "hr-team-permission-profiles";
const ASSIGNMENTS_STORAGE_KEY = "hr-team-permission-assignments";

const allSystemPermissions: TeamPermissionOption[] = [
  { key: "viewCustomers", label: "عرض العملاء", group: "CRM" },
  { key: "addCustomers", label: "إضافة العملاء", group: "CRM" },
  { key: "editCustomers", label: "تعديل العملاء", group: "CRM" },
  { key: "deleteCustomers", label: "حذف العملاء", group: "CRM" },
  { key: "viewOrders", label: "عرض الطلبات", group: "CRM" },
  { key: "addOrders", label: "إضافة الطلبات", group: "CRM" },
  { key: "editOrders", label: "تعديل الطلبات", group: "CRM" },
  { key: "deleteOrders", label: "حذف الطلبات", group: "CRM" },
  { key: "viewAnalytics", label: "عرض التحليلات", group: "CRM" },
  { key: RBAC_PERMISSIONS.returnsView, label: "عرض المرتجعات", group: "CRM" },
  { key: RBAC_PERMISSIONS.returnsCreate, label: "إضافة مرتجع", group: "CRM" },
  { key: RBAC_PERMISSIONS.returnsEdit, label: "تعديل المرتجعات", group: "CRM" },
  { key: RBAC_PERMISSIONS.returnsDelete, label: "حذف المرتجعات", group: "CRM" },

  { key: "viewEmployees", label: "عرض الموظفين", group: "HR" },
  { key: "addEmployees", label: "إضافة الموظفين", group: "HR" },
  { key: "editEmployees", label: "تعديل الموظفين", group: "HR" },
  { key: "deleteEmployees", label: "حذف الموظفين", group: "HR" },
  { key: RBAC_PERMISSIONS.leavesCreate, label: "إضافة الإجازات", group: "HR" },
  { key: RBAC_PERMISSIONS.leavesEdit, label: "تعديل الإجازات", group: "HR" },
  { key: RBAC_PERMISSIONS.leavesDelete, label: "حذف الإجازات", group: "HR" },
  { key: RBAC_PERMISSIONS.leavesApprove, label: "اعتماد الإجازات", group: "HR" },
  { key: RBAC_PERMISSIONS.trainingCreate, label: "إضافة برامج التدريب", group: "HR" },
  { key: RBAC_PERMISSIONS.trainingEdit, label: "تعديل برامج التدريب", group: "HR" },
  { key: RBAC_PERMISSIONS.trainingDelete, label: "حذف برامج التدريب", group: "HR" },

  { key: RBAC_PERMISSIONS.announcementsManage, label: "إدارة الإعلانات", group: "HR Self-Service" },
  { key: RBAC_PERMISSIONS.documentsManage, label: "إدارة المستندات", group: "HR Self-Service" },
  { key: RBAC_PERMISSIONS.payslipsManage, label: "إدارة مسيرات الرواتب", group: "HR Self-Service" },

  // Expenses
  { key: RBAC_PERMISSIONS.expensesView, label: "عرض المصاريف", group: "المالية" },
  { key: RBAC_PERMISSIONS.expensesCreate, label: "إضافة مصروف", group: "المالية" },
  { key: RBAC_PERMISSIONS.expensesEdit, label: "تعديل المصاريف", group: "المالية" },
  { key: RBAC_PERMISSIONS.expensesDelete, label: "حذف المصاريف", group: "المالية" },

  // Cash Flow
  { key: RBAC_PERMISSIONS.flowsView, label: "عرض حركة الصندوق", group: "المالية" },
  { key: RBAC_PERMISSIONS.flowsCreate, label: "إضافة حركة صندوق", group: "المالية" },
  { key: RBAC_PERMISSIONS.flowsEdit, label: "تعديل حركة الصندوق", group: "المالية" },
  { key: RBAC_PERMISSIONS.flowsDelete, label: "حذف حركة الصندوق", group: "المالية" },

  // Warehouses
  { key: RBAC_PERMISSIONS.warehousesView, label: "عرض المخازن", group: "المستودعات" },
  { key: RBAC_PERMISSIONS.warehousesCreate, label: "إضافة مخزن", group: "المستودعات" },
  { key: RBAC_PERMISSIONS.warehousesEdit, label: "تعديل المخازن", group: "المستودعات" },
  { key: RBAC_PERMISSIONS.warehousesDelete, label: "حذف المخازن", group: "المستودعات" },

  // Shipping Companies
  { key: RBAC_PERMISSIONS.companiesView, label: "عرض شركات الشحن", group: "الشحن" },
  { key: RBAC_PERMISSIONS.companiesCreate, label: "إضافة شركة شحن", group: "الشحن" },
  { key: RBAC_PERMISSIONS.companiesEdit, label: "تعديل شركات الشحن", group: "الشحن" },
  { key: RBAC_PERMISSIONS.companiesDelete, label: "حذف شركات الشحن", group: "الشحن" },

  // Team Tasks
  { key: RBAC_PERMISSIONS.tasksView, label: "عرض مهام الفريق", group: "المهام" },
  { key: RBAC_PERMISSIONS.tasksCreate, label: "إضافة مهمة", group: "المهام" },
  { key: RBAC_PERMISSIONS.tasksEdit, label: "تعديل المهام", group: "المهام" },
  { key: RBAC_PERMISSIONS.tasksDelete, label: "حذف المهام", group: "المهام" },

  { key: RBAC_PERMISSIONS.dataSearch, label: "البحث في البيانات", group: "System" },
    // CRM Customers
    { key: RBAC_PERMISSIONS.customersView, label: "عرض العملاء", group: "CRM" },
    { key: RBAC_PERMISSIONS.customersCreate, label: "إضافة عميل", group: "CRM" },
    { key: RBAC_PERMISSIONS.customersEdit, label: "تعديل عميل", group: "CRM" },
    { key: RBAC_PERMISSIONS.customersDelete, label: "حذف عميل", group: "CRM" },

    // CRM Orders
    { key: RBAC_PERMISSIONS.ordersView, label: "عرض الطلبات", group: "CRM" },
    { key: RBAC_PERMISSIONS.ordersEdit, label: "تعديل طلب", group: "CRM" },
    { key: RBAC_PERMISSIONS.ordersDelete, label: "حذف طلب", group: "CRM" },

    // CRM Products
    { key: RBAC_PERMISSIONS.productsView, label: "عرض المنتجات", group: "المنتجات" },
    { key: RBAC_PERMISSIONS.productsCreate, label: "إضافة منتج", group: "المنتجات" },
    { key: RBAC_PERMISSIONS.productsEdit, label: "تعديل منتج", group: "المنتجات" },
    { key: RBAC_PERMISSIONS.productsDelete, label: "حذف منتج", group: "المنتجات" },

    { key: RBAC_PERMISSIONS.dataSearch, label: "البحث في البيانات", group: "System" },
  { key: RBAC_PERMISSIONS.dataExport, label: "تصدير البيانات", group: "System" },
  { key: RBAC_PERMISSIONS.dataImport, label: "استيراد البيانات", group: "System" },
];

const initialProfileFormState: PermissionProfileFormState = {
  profileName: "",
  permissions: [],
};

const initialAssignmentFormState: AssignmentFormState = {
  employeeId: "",
  profileId: "",
};

/**
 * Manages HR team permission profiles and employee assignments.
 */
export function TeamPermissionsManager() {
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [assignments, setAssignments] = useState<EmployeePermissionAssignment[]>([]);
  const [profilesPage, setProfilesPage] = useState(1);
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileEditingId, setProfileEditingId] = useState<string | null>(null);
  const [profileFormState, setProfileFormState] = useState<PermissionProfileFormState>(initialProfileFormState);
  const [assignmentFormState, setAssignmentFormState] = useState<AssignmentFormState>(initialAssignmentFormState);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedProfilesRaw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
      if (storedProfilesRaw) {
        const parsed = JSON.parse(storedProfilesRaw) as PermissionProfile[];
        if (Array.isArray(parsed)) {
          setProfiles(parsed);
        }
      }

      const storedAssignmentsRaw = window.localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
      if (storedAssignmentsRaw) {
        const parsed = JSON.parse(storedAssignmentsRaw) as EmployeePermissionAssignment[];
        if (Array.isArray(parsed)) {
          setAssignments(parsed);
        }
      }
    } catch {
      setProfiles([]);
      setAssignments([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
  }, [assignments]);

  const employeesOptions = useMemo(
    () => hrEmployees.map((employee) => ({ id: employee.id, name: employee.fullName })),
    []
  );

  const groupedPermissions = useMemo(() => {
    return allSystemPermissions.reduce<Record<string, TeamPermissionOption[]>>((acc, item) => {
      if (!acc[item.group]) {
        acc[item.group] = [];
      }
      acc[item.group].push(item);
      return acc;
    }, {});
  }, []);

  const totals = useMemo(() => {
    return {
      profilesCount: profiles.length,
      assignmentsCount: assignments.length,
      uniqueEmployeesCount: new Set(assignments.map((item) => item.employeeId)).size,
    };
  }, [profiles, assignments]);

  const profilesColumns = useMemo<Column<PermissionProfile>[]>(
    () => [
      { header: "اسم الصلاحية", accessor: "profileName" },
      { header: "عدد الصلاحيات", accessor: (row) => row.permissions.length },
      {
        header: "الصلاحيات",
        accessor: (row) => (
          <div className="max-w-[360px] truncate text-xs text-slate-600" title={row.permissions.join(", ")}>
            {row.permissions.join("، ") || "-"}
          </div>
        ),
      },
      {
        header: "الإجراءات",
        accessor: (row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openEditProfileModal(row)}
              className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
              title="تعديل"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteProfile(row)}
              className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const assignmentsColumns = useMemo<Column<EmployeePermissionAssignment>[]>(
    () => [
      { header: "الموظف", accessor: "employeeName" },
      { header: "اسم الصلاحية", accessor: "profileName" },
      {
        header: "الإجراءات",
        accessor: (row) => (
          <button
            onClick={() => handleDeleteAssignment(row)}
            className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
            title="حذف الربط"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ),
      },
    ],
    []
  );

  /**
   * Toggles one permission checkbox.
   */
  function togglePermission(permissionKey: string) {
    setProfileFormState((prev) => {
      const exists = prev.permissions.includes(permissionKey);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((item) => item !== permissionKey)
          : [...prev.permissions, permissionKey],
      };
    });
  }

  /**
   * Opens create profile modal.
   */
  function openCreateProfileModal() {
    setProfileEditingId(null);
    setProfileFormState(initialProfileFormState);
    setIsProfileModalOpen(true);
  }

  /**
   * Opens edit profile modal.
   */
  function openEditProfileModal(profile: PermissionProfile) {
    setProfileEditingId(profile.id);
    setProfileFormState({
      profileName: profile.profileName,
      permissions: profile.permissions,
    });
    setIsProfileModalOpen(true);
  }

  /**
   * Saves profile create/edit operation.
   */
  function handleSaveProfile() {
    if (!profileFormState.profileName.trim()) {
      toast.error("اسم الصلاحية مطلوب");
      return;
    }

    if (profileFormState.permissions.length === 0) {
      toast.error("اختر صلاحية واحدة على الأقل");
      return;
    }

    const payload: PermissionProfile = {
      id: profileEditingId ?? `perm_${Date.now()}`,
      profileName: profileFormState.profileName.trim(),
      permissions: profileFormState.permissions,
      createdAt:
        profileEditingId
          ? profiles.find((item) => item.id === profileEditingId)?.createdAt ?? new Date().toISOString()
          : new Date().toISOString(),
    };

    if (profileEditingId) {
      setProfiles((prev) => prev.map((item) => (item.id === profileEditingId ? payload : item)));
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.profileId === profileEditingId
            ? {
                ...assignment,
                profileName: payload.profileName,
              }
            : assignment
        )
      );
      toast.success("تم تعديل الصلاحية");
    } else {
      setProfiles((prev) => [payload, ...prev]);
      toast.success("تمت إضافة الصلاحية");
    }

    setIsProfileModalOpen(false);
    setProfileEditingId(null);
    setProfileFormState(initialProfileFormState);
  }

  /**
   * Deletes one profile and related employee assignments.
   */
  function handleDeleteProfile(profile: PermissionProfile) {
    const confirmed = window.confirm("هل تريد حذف اسم الصلاحية؟ سيتم حذف الربط مع الموظفين المرتبطين به.");
    if (!confirmed) {
      return;
    }

    setProfiles((prev) => prev.filter((item) => item.id !== profile.id));
    setAssignments((prev) => prev.filter((item) => item.profileId !== profile.id));
    toast.success("تم حذف الصلاحية");
  }

  /**
   * Assigns one profile to selected employee.
   */
  function handleAssignProfile() {
    if (!assignmentFormState.employeeId || !assignmentFormState.profileId) {
      toast.error("اختر الموظف واسم الصلاحية");
      return;
    }

    const employee = employeesOptions.find((item) => item.id === assignmentFormState.employeeId);
    const profile = profiles.find((item) => item.id === assignmentFormState.profileId);

    if (!employee || !profile) {
      toast.error("بيانات الربط غير صحيحة");
      return;
    }

    setAssignments((prev) => {
      const existing = prev.find((item) => item.employeeId === employee.id);
      if (existing) {
        return prev.map((item) =>
          item.employeeId === employee.id
            ? {
                ...item,
                profileId: profile.id,
                profileName: profile.profileName,
                assignedAt: new Date().toISOString(),
              }
            : item
        );
      }

      return [
        {
          id: `assign_${Date.now()}`,
          employeeId: employee.id,
          employeeName: employee.name,
          profileId: profile.id,
          profileName: profile.profileName,
          assignedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });

    setAssignmentFormState(initialAssignmentFormState);
    toast.success("تم ربط الصلاحية بالموظف");
  }

  /**
   * Deletes one employee-profile assignment.
   */
  function handleDeleteAssignment(assignment: EmployeePermissionAssignment) {
    const confirmed = window.confirm("هل تريد حذف ربط الصلاحية من هذا الموظف؟");
    if (!confirmed) {
      return;
    }

    setAssignments((prev) => prev.filter((item) => item.id !== assignment.id));
    toast.success("تم حذف الربط");
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="صلاحيات الفريق"
        description="إنشاء أسماء صلاحيات مخصصة وتحديد ما يمكن للموظف فعله: إضافة، تعديل، حذف، عرض، واستيراد/تصدير البيانات."
      >
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateProfileModal}>
          إضافة اسم صلاحية
        </Button>
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <DynamicCard className="border-l-4 border-l-blue-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">أسماء الصلاحيات</p>
            <p className="text-3xl font-bold text-slate-900">{totals.profilesCount}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-emerald-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">ربط الموظفين</p>
            <p className="text-3xl font-bold text-emerald-600">{totals.assignmentsCount}</p>
          </DynamicCard.Content>
        </DynamicCard>
        <DynamicCard className="border-l-4 border-l-violet-500">
          <DynamicCard.Content className="py-4">
            <p className="text-sm text-slate-600">موظفون لديهم صلاحيات</p>
            <p className="text-3xl font-bold text-violet-600">{totals.uniqueEmployeesCount}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header title="ربط اسم الصلاحية بالموظفين" description="اختر الموظف ثم اختر اسم الصلاحية المرتبط به." />
        <DynamicCard.Content className="pt-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <select
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={assignmentFormState.employeeId}
              onChange={(event) =>
                setAssignmentFormState((prev) => ({
                  ...prev,
                  employeeId: event.target.value,
                }))
              }
            >
              <option value="">اختر الموظف</option>
              {employeesOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={assignmentFormState.profileId}
              onChange={(event) =>
                setAssignmentFormState((prev) => ({
                  ...prev,
                  profileId: event.target.value,
                }))
              }
            >
              <option value="">اختر اسم الصلاحية</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.profileName}
                </option>
              ))}
            </select>

            <Button onClick={handleAssignProfile}>ربط</Button>
          </div>
        </DynamicCard.Content>
      </DynamicCard>

      <DynamicCard>
        <DynamicCard.Header title="سجل أسماء الصلاحيات" description="تعديل أو حذف أي اسم صلاحية مخصص." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={profilesColumns}
            data={profiles}
            dir="rtl"
            pageSize={8}
            totalCount={profiles.length}
            currentPage={profilesPage}
            onPageChange={setProfilesPage}
            title="أسماء الصلاحيات"
          />
        </DynamicCard.Content>
      </DynamicCard>

      <DynamicCard>
        <DynamicCard.Header title="سجل ربط الموظفين" description="عرض أو حذف الربط بين الموظف واسم الصلاحية." />
        <DynamicCard.Content className="pt-4">
          <DataTable
            columns={assignmentsColumns}
            data={assignments}
            dir="rtl"
            pageSize={8}
            totalCount={assignments.length}
            currentPage={assignmentsPage}
            onPageChange={setAssignmentsPage}
            title="ربط الصلاحيات بالموظفين"
          />
        </DynamicCard.Content>
      </DynamicCard>

      <AppModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title={profileEditingId ? "تعديل اسم الصلاحية" : "إضافة اسم صلاحية"}
        size="xl"
        footer={
          <>
            <Button onClick={handleSaveProfile}>{profileEditingId ? "حفظ التعديل" : "إنشاء الصلاحية"}</Button>
            <Button variant="outline" onClick={() => setIsProfileModalOpen(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <input
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="اسم الصلاحية (مثال: فريق المبيعات - مدير)"
            value={profileFormState.profileName}
            onChange={(event) =>
              setProfileFormState((prev) => ({
                ...prev,
                profileName: event.target.value,
              }))
            }
          />

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-800">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-sm font-semibold">اختر الصلاحيات المتاحة</p>
            </div>

            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([groupName, permissions]) => (
                <div key={groupName} className="space-y-2">
                  <p className="text-xs font-bold text-slate-500">{groupName}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {permissions.map((permission) => {
                      const checked = profileFormState.permissions.includes(permission.key);
                      return (
                        <label key={permission.key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(permission.key)}
                            className="h-4 w-4"
                          />
                          <span>{permission.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppModal>
    </section>
  );
}
