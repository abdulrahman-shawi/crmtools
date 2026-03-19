import { EmployeesManager } from "@/components/hr/employees-manager";
import { hrEmployees } from "@/lib/data/mock-hr";

/**
 * Renders HR employees page.
 */
export default function HrEmployeesPage() {
  return <EmployeesManager initialData={hrEmployees} />;
}
