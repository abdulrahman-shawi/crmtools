import { Plus } from "lucide-react";
import { CustomersTable } from "@/components/crm/customers-table";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { demoCustomers, demoTenant } from "@/lib/data/mock-crm";
import { canAddCustomer } from "@/lib/services/subscription.service";

/**
 * Customers management page with plan-aware add action.
 */
export default function CustomersPage() {
  const canAdd = canAddCustomer(demoTenant);

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
        >
          {canAdd ? "إضافة عميل" : "تم الوصول لحد العملاء"}
        </Button>
      </SectionHeader>

      <CustomersTable data={demoCustomers} />
    </section>
  );
}
