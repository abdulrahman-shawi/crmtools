"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { CustomersTable } from "@/components/crm/customers-table";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { getTenantPlan } from "@/lib/services/subscription.service";
import type { Customer, Tenant } from "@/lib/types/crm";
import { useAuth } from "@/context/AuthContext";

interface CustomerFormState {
  name: string;
  email: string;
  phone: string;
  city: string;
  status: Customer["status"];
  annualValue: string;
}

const initialFormState: CustomerFormState = {
  name: "",
  email: "",
  phone: "",
  city: "",
  status: "lead",
  annualValue: "",
};

/**
 * Handles customers CRUD interactions with in-memory mock data.
 */
export function CustomersManager({ initialData, tenant }: { initialData: Customer[]; tenant: Tenant }) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formState, setFormState] = useState<CustomerFormState>(initialFormState);

  const plan = useMemo(() => getTenantPlan(tenant), [tenant]);
  const hasCreatePermission = Boolean(user?.role === "admin" || user?.permissions?.includes("addCustomers"));
  const hasEditPermission = Boolean(user?.role === "admin" || user?.permissions?.includes("editCustomers"));
  const hasDeletePermission = Boolean(user?.role === "admin" || user?.permissions?.includes("deleteCustomers"));
  const canAdd = customers.length < plan.limits.maxCustomers && hasCreatePermission;

  /**
   * Opens modal for creating a new customer.
   */
  const openCreateModal = () => {
    if (!canAdd) {
      toast.error("تم الوصول إلى الحد الأقصى من العملاء في خطتك الحالية");
      return;
    }

    setEditingCustomerId(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  };

  /**
   * Opens modal with current customer values for editing.
   */
  const openEditModal = (customer: Customer) => {
    if (!hasEditPermission) {
      toast.error("لا تملك صلاحية تعديل العملاء");
      return;
    }

    setEditingCustomerId(customer.id);
    setFormState({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      city: customer.city,
      status: customer.status,
      annualValue: String(customer.annualValue),
    });
    setIsModalOpen(true);
  };

  /**
   * Persists create or edit operation in local state.
   */
  const handleSave = () => {
    if (!formState.name.trim() || !formState.email.trim() || !formState.annualValue.trim()) {
      toast.error("يرجى تعبئة الحقول الأساسية");
      return;
    }

    const parsedValue = Number(formState.annualValue);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      toast.error("القيمة السنوية غير صحيحة");
      return;
    }

    if (editingCustomerId) {
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === editingCustomerId
            ? {
                ...customer,
                name: formState.name.trim(),
                email: formState.email.trim(),
                phone: formState.phone.trim(),
                city: formState.city.trim(),
                status: formState.status,
                annualValue: parsedValue,
              }
            : customer
        )
      );
      toast.success("تم تحديث العميل");
    } else {
      const newCustomer: Customer = {
        id: `c_${Date.now()}`,
        name: formState.name.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim(),
        city: formState.city.trim(),
        status: formState.status,
        annualValue: parsedValue,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      setCustomers((prev) => [newCustomer, ...prev]);
      toast.success("تمت إضافة العميل");
    }

    setIsModalOpen(false);
    setFormState(initialFormState);
    setEditingCustomerId(null);
  };

  /**
   * Deletes customer record after confirmation.
   */
  const handleDelete = (customer: Customer) => {
    if (!hasDeletePermission) {
      toast.error("لا تملك صلاحية حذف العملاء");
      return;
    }

    const confirmed = window.confirm(`هل تريد حذف العميل ${customer.name}؟`);
    if (!confirmed) return;

    setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
    toast.success("تم حذف العميل");
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="إدارة العملاء"
        description="عرض العملاء الحاليين ومتابعة القيمة السنوية وحالة كل حساب داخل النظام."
      >
        <Button
          variant={canAdd ? "primary" : "outline"}
          disabled={!canAdd}
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openCreateModal}
        >
          {canAdd ? "إضافة عميل" : "تم الوصول لحد العملاء"}
        </Button>
      </SectionHeader>

      <CustomersTable
        data={customers}
        onEdit={hasEditPermission ? openEditModal : undefined}
        onDelete={hasDeletePermission ? handleDelete : undefined}
      />

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomerId ? "تعديل عميل" : "إضافة عميل"}
        size="md"
        footer={
          <>
            <Button onClick={handleSave}>{editingCustomerId ? "حفظ التعديل" : "إضافة"}</Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="الاسم"
            value={formState.name}
            onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="البريد الإلكتروني"
            value={formState.email}
            onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="الهاتف"
            value={formState.phone}
            onChange={(e) => setFormState((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="المدينة"
            value={formState.city}
            onChange={(e) => setFormState((prev) => ({ ...prev, city: e.target.value }))}
          />
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={formState.status}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, status: e.target.value as Customer["status"] }))
            }
          >
            <option value="lead">عميل محتمل</option>
            <option value="qualified">مؤهل</option>
            <option value="customer">عميل</option>
          </select>
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="القيمة السنوية"
            value={formState.annualValue}
            onChange={(e) => setFormState((prev) => ({ ...prev, annualValue: e.target.value }))}
          />
        </div>
      </AppModal>
    </section>
  );
}
