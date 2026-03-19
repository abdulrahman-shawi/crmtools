import { CustomersManager } from "@/components/crm/customers-manager";
import { demoCustomers, demoTenant } from "@/lib/data/mock-crm";

/**
 * Customers management page with plan-aware add action.
 */
export default function CustomersPage() {
  return <CustomersManager initialData={demoCustomers} tenant={demoTenant} />;
}
