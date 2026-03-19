import { PayrollTable } from "@/components/hr/payroll-table";
import { SectionHeader } from "@/components/ui/section-header";
import { hrPayroll } from "@/lib/data/mock-hr";

/**
 * Renders HR payroll page.
 */
export default function HrPayrollPage() {
  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="الرواتب"
        description="مراجعة مسيرات الرواتب والحالة المالية لكل موظف بشكل شهري."
      />

      <PayrollTable data={hrPayroll} />
    </section>
  );
}
